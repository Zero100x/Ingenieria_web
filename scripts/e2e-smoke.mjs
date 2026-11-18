#!/usr/bin/env node
/**
 * Prueba de humo del flujo principal de AutoPart Pro contra la API real.
 *
 * Cubre: búsqueda -> detalle -> reserva (casos fallidos y exitoso) ->
 * consulta del comprobante -> gestión de la reserva desde el almacén,
 * más controles de autenticación y roles. Opcionalmente verifica que las
 * vistas del frontend respondan.
 *
 * Requisitos: Node.js 18+ (usa fetch nativo), backend con el seed cargado.
 *
 * Uso:
 *   node scripts/e2e-smoke.mjs
 *   API_URL=http://localhost:3001/api FRONTEND_URL=http://localhost:3000 node scripts/e2e-smoke.mjs
 *   node scripts/e2e-smoke.mjs --md      # imprime además una tabla Markdown para pegar en docs/
 *
 * La reserva creada se cancela al final para no consumir stock del seed.
 */

import { randomUUID } from 'node:crypto';

const API = (process.env.API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const WEB = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const PRINT_MD = process.argv.includes('--md');

const STORE_ADMIN = { email: 'jorge@elmotor.com', password: 'password123' };
const BUYER = { email: 'andres@gmail.com', password: 'password123' };

const results = [];

function record(id, name, expected, ok, got) {
  results.push({ id, name, expected, status: ok ? 'PASS' : 'FAIL', got });
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${id.padEnd(8)} ${name} — esperado: ${expected} | obtenido: ${got}`);
}

function skip(id, name, expected, reason) {
  results.push({ id, name, expected, status: 'SKIP', got: reason });
  console.log(`⏭️  ${id.padEnd(8)} ${name} — omitido: ${reason}`);
}

async function call(method, path, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, json };
}

function msg(json) {
  if (!json) return '';
  const m = Array.isArray(json.message) ? json.message.join('; ') : json.message;
  return m ? ` "${String(m).slice(0, 90)}"` : '';
}

async function main() {
  console.log(`\nAPI: ${API}\nFrontend: ${WEB}\n`);

  // ---------- Disponibilidad ----------
  let searchRes;
  try {
    searchRes = await call('GET', '/search/parts?limit=30');
  } catch (err) {
    console.error(`No se pudo conectar con la API en ${API}: ${err.message}`);
    console.error('¿Está corriendo el backend (npm run start:dev) y Docker Compose?');
    process.exit(2);
  }

  const parts = Array.isArray(searchRes.json?.data) ? searchRes.json.data : [];
  record('E2E-01', 'Búsqueda general de repuestos', '200 con resultados',
    searchRes.status === 200 && parts.length > 0, `${searchRes.status}, ${parts.length} resultados`);

  const typo = await call('GET', '/search/parts?q=zzqxwvkjyy');
  const typoCount = Array.isArray(typo.json?.data) ? typo.json.data.length : -1;
  record('E2E-02', 'Búsqueda sin coincidencias', '200 con 0 resultados',
    typo.status === 200 && typoCount === 0, `${typo.status}, ${typoCount} resultados`);

  // ---------- Autenticación ----------
  const badLogin = await call('POST', '/auth/login', { body: { email: STORE_ADMIN.email, password: 'ClaveIncorrecta1' } });
  record('E2E-03', 'Login con contraseña incorrecta', '401',
    badLogin.status === 401, `${badLogin.status}${msg(badLogin.json)}`);

  const adminLogin = await call('POST', '/auth/login', { body: STORE_ADMIN });
  const adminToken = adminLogin.json?.accessToken;
  const storeId = adminLogin.json?.user?.storeId;
  record('E2E-04', 'Login de administrador de almacén (seed)', '200/201 con token y storeId',
    [200, 201].includes(adminLogin.status) && Boolean(adminToken) && Boolean(storeId),
    `${adminLogin.status}, storeId=${storeId ?? 'null'}`);

  const noToken = await call('GET', '/inventory');
  record('E2E-05', 'Inventario sin token', '401', noToken.status === 401, String(noToken.status));

  const buyerLogin = await call('POST', '/auth/login', { body: BUYER });
  const buyerToken = buyerLogin.json?.accessToken;
  if (buyerToken) {
    const buyerInv = await call('GET', '/inventory', { token: buyerToken });
    record('E2E-06', 'Inventario con rol BUYER', '403', buyerInv.status === 403, `${buyerInv.status}${msg(buyerInv.json)}`);
  } else {
    skip('E2E-06', 'Inventario con rol BUYER', '403', `login de comprador falló (${buyerLogin.status})`);
  }

  // ---------- Elegir repuesto con stock en una sede del almacén ----------
  let target = null;
  for (const p of parts) {
    const detail = await call('GET', `/catalog/parts/${p.id}`);
    if (detail.status !== 200) continue;
    const inv = (detail.json?.inventory || []).find(
      (i) => i.stock >= 1 && i.location?.id && (!storeId || i.location?.storeId === storeId || i.location?.store?.id === storeId),
    );
    if (inv) {
      target = { part: detail.json, inv };
      break;
    }
  }
  record('E2E-07', 'Detalle de repuesto con sede y stock', 'repuesto con inventario disponible',
    Boolean(target), target ? `${target.part.name} @ ${target.inv.location.name} (stock ${target.inv.stock})` : 'ninguno');

  const missing = await call('GET', `/catalog/parts/${randomUUID()}`);
  record('E2E-08', 'Detalle de repuesto inexistente', '404', missing.status === 404, String(missing.status));

  if (!target) {
    console.log('\nSin repuesto con stock no se puede seguir con el flujo de reservas. ¿Corriste el seed?');
    return finish();
  }

  const base = {
    partId: target.part.id,
    locationId: target.inv.location.id,
    customerName: 'Prueba E2E Automatizada',
    customerPhone: '3001234567',
    notes: 'Creada por scripts/e2e-smoke.mjs',
  };

  // ---------- Reservas: casos fallidos ----------
  const tooMany = await call('POST', '/reservations', { body: { ...base, quantity: target.inv.stock + 1000 } });
  record('E2E-09', 'Reserva con cantidad mayor al stock', '400 "Existencias insuficientes"',
    tooMany.status === 400 && /insuficientes/i.test(JSON.stringify(tooMany.json)), `${tooMany.status}${msg(tooMany.json)}`);

  const { customerPhone: _omit, ...noPhone } = base;
  const invalid = await call('POST', '/reservations', { body: { ...noPhone, quantity: 1 } });
  record('E2E-10', 'Reserva sin teléfono (validación DTO)', '400', invalid.status === 400, `${invalid.status}${msg(invalid.json)}`);

  const extra = await call('POST', '/reservations', { body: { ...base, quantity: 1, precio: 0 } });
  record('E2E-11', 'Reserva con campo no permitido', '400 (forbidNonWhitelisted)', extra.status === 400, `${extra.status}${msg(extra.json)}`);

  const ghost = await call('POST', '/reservations', { body: { ...base, partId: randomUUID(), quantity: 1 } });
  record('E2E-12', 'Reserva de repuesto inexistente', '404', ghost.status === 404, `${ghost.status}${msg(ghost.json)}`);

  // ---------- Reserva exitosa ----------
  const ok = await call('POST', '/reservations', { body: { ...base, quantity: 1 } });
  const code = ok.json?.code;
  const reservationId = ok.json?.id;
  record('E2E-13', 'Reserva exitosa (1 unidad)', '201 con código RES-*',
    ok.status === 201 && /^RES-/.test(code || ''), `${ok.status}, código=${code ?? 'n/a'}`);

  if (!code) return finish();

  const voucher = await call('GET', `/reservations/code/${encodeURIComponent(code)}`);
  record('E2E-14', 'Consulta pública del comprobante', '200 estado PENDING',
    voucher.status === 200 && voucher.json?.status === 'PENDING', `${voucher.status}, estado=${voucher.json?.status}`);

  const badCode = await call('GET', '/reservations/code/RES-0000-XXX');
  record('E2E-15', 'Consulta de código inexistente', '404', badCode.status === 404, String(badCode.status));

  // ---------- Gestión desde el dashboard (API que usa la pestaña Reservas) ----------
  if (adminToken) {
    const list = await call('GET', `/reservations?search=${encodeURIComponent(code)}`, { token: adminToken });
    const found = (list.json?.data || []).some((r) => r.code === code);
    record('E2E-16', 'El almacén ve la reserva en su listado', '200 e incluye el código',
      list.status === 200 && found, `${list.status}, encontrada=${found}`);

    const noAuthPatch = await call('PATCH', `/reservations/${reservationId}/status`, { body: { status: 'CANCELLED' } });
    record('E2E-17', 'Cambiar estado sin token', '401', noAuthPatch.status === 401, String(noAuthPatch.status));

    const cancel = await call('PATCH', `/reservations/${reservationId}/status`, { token: adminToken, body: { status: 'CANCELLED' } });
    record('E2E-18', 'Almacén cancela la reserva', '200 estado CANCELLED',
      cancel.status === 200 && cancel.json?.status === 'CANCELLED', `${cancel.status}, estado=${cancel.json?.status}`);
  } else {
    skip('E2E-16', 'El almacén ve la reserva en su listado', '200', 'sin token de almacén');
    skip('E2E-17', 'Cambiar estado sin token', '401', 'sin token de almacén');
    skip('E2E-18', 'Almacén cancela la reserva', '200', 'sin token de almacén');
  }

  // ---------- Vistas del frontend ----------
  const views = ['/', '/search', `/parts/${target.part.id}`, '/compare', '/login', '/dashboard', '/stores'];
  let webUp = true;
  for (const [i, view] of views.entries()) {
    const id = `E2E-${String(19 + i).padStart(2, '0')}`;
    if (!webUp) {
      skip(id, `Vista ${view} responde`, '200', 'frontend no disponible');
      continue;
    }
    try {
      const res = await fetch(`${WEB}${view}`);
      record(id, `Vista ${view} responde`, '200', res.status === 200, String(res.status));
    } catch {
      webUp = false;
      skip(id, `Vista ${view} responde`, '200', 'frontend no disponible');
    }
  }

  return finish();
}

function finish() {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const skipped = results.filter((r) => r.status === 'SKIP').length;
  console.log(`\nResumen: ${pass} PASS · ${fail} FAIL · ${skipped} SKIP · ${new Date().toISOString()}`);

  if (PRINT_MD) {
    console.log('\n| ID | Caso | Esperado | Obtenido | Resultado |');
    console.log('| :--- | :--- | :--- | :--- | :---: |');
    for (const r of results) {
      console.log(`| ${r.id} | ${r.name} | ${r.expected} | ${String(r.got).replace(/\|/g, '/')} | ${r.status} |`);
    }
  }

  process.exitCode = fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('Error inesperado en la prueba de humo:', err);
  process.exit(2);
});
