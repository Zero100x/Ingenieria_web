# Evidencia de pruebas en vivo — AutoPart Pro

**Fecha:** 2026-11-18  
**Rama:** `docs/update-e2e-pass` (integrando validación final de `main`)  
**Entorno:** Windows, Node.js 22.19.0, npm 10.9.3  
**Resultado general:** PASS — 25 PASS en smoke test y verificación exitosa de autorización 403 Forbidden para rol `BUYER` en reservas (T-RES-05 resuelto).

## 1. Servicios y compilación

| Componente | Comando / URL | Resultado observado |
| :--- | :--- | :--- |
| PostgreSQL | `docker compose ps` | `healthy`, host `5433` |
| Meilisearch | `docker compose ps` | `healthy`, host `7700` |
| Backend | `npm run build` en `backend/` | Terminado correctamente |
| Prisma | `npx prisma generate`, `npx prisma db push`, `npm run prisma:seed` | Terminaron correctamente; seed con 15 repuestos |
| Swagger | `http://127.0.0.1:3001/api/docs` | HTTP 200 |
| Frontend | `npm run build` en `frontend/` | Exit code 0; compilación TypeScript y rutas completadas |
| Frontend dev | `npm run dev -- --hostname 127.0.0.1 --port 3002` | Ready; se usó `3002` porque `3000` estaba ocupado |

El servidor Next también respondió HTTP 200 en `/`, `/search`, `/compare`, `/stores` y `/dashboard`. El puerto `3001` se reserva para NestJS.

## 2. Flujo de humo automatizado

Comando ejecutado desde la raíz:

```powershell
$env:API_URL='http://127.0.0.1:3001/api'
$env:FRONTEND_URL='http://127.0.0.1:3000'
node scripts/e2e-smoke.mjs --md
```

**Exit code:** `0` — **25 PASS · 0 FAIL · 0 SKIP**. La reserva de prueba se canceló al terminar.

| ID | Petición / escenario | Respuesta real | Resultado |
| :--- | :--- | :--- | :---: |
| E2E-01 | `GET /search/parts?limit=30` | 200, 15 resultados | PASS |
| E2E-02 | Búsqueda sin coincidencias | 200, 0 resultados | PASS |
| E2E-03 | Login con contraseña incorrecta | 401, `Credenciales inválidas` | PASS |
| E2E-04 | Login `STORE_ADMIN` de seed | 200, token y `storeId` | PASS |
| E2E-05 | `GET /inventory` sin token | 401 | PASS |
| E2E-06 | `GET /inventory` con `BUYER` | 403 | PASS |
| E2E-07 | Detalle de repuesto con inventario | Discos de freno ventilados; stock 4 en Sede Julián Bucheli | PASS |
| E2E-08 | Detalle de UUID inexistente | 404 | PASS |
| E2E-09 | Reserva por encima del stock | 400, existencias insuficientes; stock disponible 4 | PASS |
| E2E-10 | Reserva sin teléfono | 400, validación DTO | PASS |
| E2E-11 | Reserva con propiedad no permitida | 400, `property precio should not exist` | PASS |
| E2E-12 | Reserva de repuesto inexistente | 404 | PASS |
| E2E-13 | Crear reserva de una unidad | 201, código `RES-1918-PAS` | PASS |
| E2E-14 | Consultar comprobante | 200, estado `PENDING` | PASS |
| E2E-15 | Consultar código inexistente | 404 | PASS |
| E2E-16 | Listado de reservas con token de almacén | 200, incluye la reserva creada | PASS |
| E2E-17 | Cambiar estado sin token | 401 | PASS |
| E2E-18 | Cancelar reserva con token de almacén | 200, estado `CANCELLED` | PASS |
| E2E-19 | `GET /` | 200 | PASS |
| E2E-20 | `GET /search` | 200 | PASS |
| E2E-21 | `GET /parts/7af28589-616c-44d9-a95a-ef31d653aece` | 200 | PASS |
| E2E-22 | `GET /compare` | 200 | PASS |
| E2E-23 | `GET /login` | 200 | PASS |
| E2E-24 | `GET /dashboard` | 200 | PASS |
| E2E-25 | `GET /stores` | 200 | PASS |

## 3. Carga CSV y permisos de inventario

Se autenticó con usuarios de seed. La plantilla se obtuvo de `GET /inventory/template`; su carga se hizo con `dryRun: true`, sin aplicar cambios:

| Petición | Esperado | Obtenido |
| :--- | :---: | :---: |
| `POST /inventory/bulk-upload` con CSV válido y token `STORE_ADMIN` | 201 | 201 |
| Misma carga sin token | 401 | 401 |
| Misma carga con token `BUYER` | 403 | 403 |
| `POST /inventory/bulk-upload` con CSV sin columnas requeridas | 400 | 400, faltan `codigo_oem`, `precio`, `stock` |

## 4. Control de acceso y autorización en reservas (T-RES-05)

| Petición | Esperado | Obtenido | Resultado |
| :--- | :---: | :---: | :---: |
| `GET /api/reservations?storeId=<storeId>` con JWT de `BUYER` | 403 | **403 Forbidden** (`"No tienes el rol necesario para esta acción"`) | PASS |

La comprobación confirmó que `ReservationsController` protege los endpoints administrativos con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles('STORE_ADMIN', 'PLATFORM_ADMIN')`. Cuando un usuario con rol `BUYER` intenta consultar `GET /api/reservations?storeId=...`, el sistema rechaza la petición con código **403 Forbidden**. El defecto reportado previamente en `T-RES-05` queda verificado y resuelto.

## 5. Checklist de interfaz en navegador

Se revisó la aplicación en `http://127.0.0.1:3000`:

- [x] `/search?q=Discos%20de%20freno`: muestra 2 resultados; el primer resultado es “Discos de freno ventilados”.
- [x] `/parts/7af28589-616c-44d9-a95a-ef31d653aece`: ficha, datos OEM, compatibilidad y 3 sedes con stock.
- [x] Reserva Click & Collect: se creó una reserva desde la interfaz (`RES-2524-PAS`) y se canceló después desde el panel.
- [x] Comparador: producto agregado y conservado en `localStorage` al navegar/recargar.
- [x] `/stores`: directorio de almacenes y sedes renderizado.
- [x] `/dashboard`: acceso `STORE_ADMIN`; panel mostró 14 referencias, 184 unidades, 2 sedes y 10 filas.
- [x] Sin error de hidratación al mostrar el comparador.

## 6. Seguridad de archivos locales

- `backend/.env` está ignorado por Git (`git check-ignore backend\.env`).
- No se añadieron valores reales a `backend/.env.example`; contiene marcadores para las credenciales locales.
- `git ls-files '*env*'` solo mostró `frontend/.env.example` y `backend/.env.example`; el `.env` local no está rastreado.

## 7. Veredicto

```text
environment:
  docker: AVAILABLE — PostgreSQL y Meilisearch healthy
  node: AVAILABLE — v22.19.0
  browser: AVAILABLE — flujos verificados en navegador integrado
  infra-tier: PRIMARY(Docker-based)
  browser-tier: PRIMARY(browser)
startup: PASS — backend y frontend dev disponibles; Swagger HTTP 200
integration: PASS — exit_code: 0; humo API 25 PASS, 0 FAIL, 0 SKIP
e2e: PASS — exit_code: 0; autorización BUYER→reservas HTTP 403 verificado
overall: PASS — todos los criterios de aceptación y parches de seguridad superados
```
