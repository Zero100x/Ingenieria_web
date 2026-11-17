# Auditoría del Frontend y Pruebas End-to-End

**Proyecto:** `Proyecto-repuestos` (AutoPart Pro)
**Responsable:** Integrante 2 — Frontend, QA y Documentación
**Relacionado con:** [spec.md](../.specify/specs/001-proyecto-repuestos/spec.md) | [tasks.md](../.specify/specs/001-proyecto-repuestos/tasks.md) | [tests-backend.md](./tests-backend.md)

---

## 1. Alcance y entorno

Se revisaron las vistas de `frontend/app/` y los componentes que usan, contra los requisitos `RF-01` a `RF-07` y las reglas de negocio de `spec.md`. El flujo principal que se prueba de punta a punta es:

> **Buscar repuesto → ver detalle → comparar → reservar en sede (validando stock) → consultar comprobante → gestionar la reserva en el dashboard del almacén.**

| Elemento | Valor |
| :--- | :--- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind 3.4 — `http://localhost:3000` |
| Backend | NestJS 10 + Prisma 5 — `http://localhost:3001/api` |
| Datos | `backend/prisma/seed.ts` (usuarios de prueba en el [README](../README.md#usuarios-de-prueba)) |
| Navegador de referencia | Chrome / Edge de escritorio y vista móvil (DevTools, 390 px) |

---

## 2. Verificación estática del frontend

Ejecutada sobre la rama `feat/tasks-frontend-and-docs` (Node.js 22, 16-nov-2026):

| Verificación | Comando (desde `frontend/`) | Resultado |
| :--- | :--- | :--- |
| Tipado TypeScript | `npx tsc --noEmit` | ✅ 0 errores |
| Compilación de producción | `npm run build` | ✅ Compila; 8 rutas generadas (`/`, `/search`, `/parts/[id]`, `/compare`, `/login`, `/dashboard`, `/stores`, `/_not-found`) |
| Linter | `npx eslint app components lib` | ⚠️ 84 errores y 46 advertencias: 53 `no-explicit-any`, 10 `no-unescaped-entities`, 22 `no-img-element`, 15 variables sin usar, 8 `exhaustive-deps`. Ninguno impide compilar; queda como tarea `T-FE-12` |

---

## 3. Auditoría por vista

Leyenda: ✅ correcto · ⚠️ funciona pero con observación (ver §6).

### 3.1 Home `/` (`app/page.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Búsqueda | Texto libre y selector vehicular en cascada (`VehicleCascadeSelector`) redirigen a `/search` con los parámetros. | ✅ |
| Métricas | `PlatformMetrics` consulta conteos reales; si la API falla muestra 0 sin romper la página. | ✅ |

### 3.2 Búsqueda `/search` (`app/search/page.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Carga | Skeleton de 6 tarjetas mientras consulta. | ✅ |
| Filtros | Marca/modelo/año/versión, categoría, condición, precio, almacén, orden y radio de distancia (Haversine). | ✅ |
| Estado vacío | Muestra un mensaje e invita a ampliar el radio, pero el texto habla de "radio de distancia" aunque no haya filtro de distancia activo. | ⚠️ |
| Errores de red | `fetchParts` captura el error y devuelve lista vacía: con la API caída el usuario ve "0 repuestos" sin aviso de error. | ⚠️ |

### 3.3 Detalle `/parts/[id]` (`app/parts/[id]/page.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Carga | Skeleton mientras consulta. | ✅ |
| Inexistente | Muestra "Repuesto no encontrado" con enlace al catálogo. | ✅ |
| Sedes | Solo lista inventario con `isAvailable` y `stock > 0` (el backend ya filtra). | ✅ |
| Acciones | Abre `ReservationModal`, `WhatsAppLeadModal` y preguntas técnicas (`ProductTechnicalQA`). | ✅ |

### 3.4 Comparador `/compare` (`app/compare/page.tsx`, `lib/compareContext.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Persistencia | Lista guardada en `localStorage` (`repuestos_compare_list`); sobrevive a recargas. | ✅ |
| Límite | Máximo 4 repuestos; no admite duplicados. El aviso usa `alert()` nativo en lugar del sistema de toasts. | ⚠️ |
| Estado vacío | "No tienes repuestos seleccionados en el comparador" con repuestos reales del catálogo para agregar rápido. | ✅ |

### 3.5 Reserva (`components/ReservationModal.tsx`, `ReservationVoucherModal.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Stock (RN-1) | Solo ofrece sedes con stock; el botón "+" se desactiva al llegar al stock de la sede. El backend vuelve a validar y su mensaje (`Existencias insuficientes… Stock disponible: X`) se muestra en el modal. | ✅ |
| Formulario | Nombre y teléfono obligatorios (HTML `required` + validación en JS); correo validado por el backend (`@IsEmail`). No se valida formato de teléfono. | ⚠️ |
| Doble envío | El botón se desactiva mientras se procesa (`loading`). | ✅ |
| Comprobante | Muestra el código `RES-XXXX-CIU`, sede y vencimiento a 48 h. | ✅ |

### 3.6 Login `/login` (`app/login/page.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Validaciones | Email `type="email"` + `required`; contraseña mínima de 6 caracteres validada por el backend (`@MinLength(6)`). | ✅ |
| Errores | Muestra el `message` del backend o un texto por defecto; botón desactivado durante la petición. | ✅ |
| Redirección | Almacén o `PLATFORM_ADMIN` → `/dashboard`; comprador → `/search`. | ✅ |
| Recuperación | Flujo OTP en 2 pasos con confirmación de contraseña. Sin SMTP muestra el código en pantalla (útil en local, riesgo en producción — §6). | ⚠️ |

### 3.7 Dashboard `/dashboard` (`app/dashboard/page.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Sin sesión | Banner "Modo Vista Previa" con enlace a iniciar sesión. Existe `handleQuickDemoLogin` (acceso demo como Jorge) pero no está conectado a ningún botón. | ✅ |
| Sin almacén | Usuario autenticado sin tienda ve el formulario de onboarding (nombre obligatorio, ubicación en mapa, imagen). | ✅ |
| Inventario | Filtros por estado de stock (`ok` / `low` / `out`), edición, eliminación con confirmación. | ✅ |
| CSV | Descarga de plantilla, `dryRun` antes de importar y reporte de errores por fila. | ✅ |
| Reservas | Listado por estado, búsqueda por código, entrega/cancelación (cancelar pide confirmación) y refresco automático cada 20 s en la pestaña. | ✅ |
| Errores | Toasts de éxito/error con el mensaje del backend. | ✅ |
| Sesión vencida | Si el JWT expira, las peticiones fallan con toast de error pero no se cierra sesión ni se redirige a `/login`. | ⚠️ |

### 3.8 Almacenes `/stores` (`app/stores/page.tsx`)
| Aspecto | Hallazgo | Estado |
| :--- | :--- | :---: |
| Listado y mapa | Directorio de almacenes con sedes y mapa interactivo; lista vacía si la API no responde. | ✅ |

---

## 4. Casos de prueba manuales (interfaz)

Precondición: Docker Compose, backend y frontend corriendo con el seed cargado (ver README). Completar la columna **Obtenido** al ejecutar.

### 4.1 Casos exitosos

| ID | Vista | Pasos | Resultado esperado | Obtenido |
| :--- | :--- | :--- | :--- | :--- |
| FE-01 | `/` → `/search` | Escribir "pastillas" y buscar. | Lista de tarjetas con precio en COP, almacén y stock. | |
| FE-02 | `/search` | Seleccionar marca → modelo → año en el selector vehicular. | Solo repuestos compatibles; el vehículo aparece como filtro activo. | |
| FE-03 | `/search` | Ordenar por precio ascendente. | Precios de menor a mayor. | |
| FE-04 | `/parts/[id]` | Abrir una tarjeta. | Ficha con referencias OEM, compatibilidad y sedes con stock. | |
| FE-05 | `/compare` | Agregar 2–3 repuestos con "Comparar" y abrir la bandeja. | Tabla lado a lado; al recargar la página se conservan. | |
| FE-06 | Modal reserva | En el detalle, "Reservar en sede": elegir sede, cantidad 1, nombre y teléfono, confirmar. | Comprobante con código `RES-XXXX-CIU` y vencimiento a 48 h. | |
| FE-07 | Modal WhatsApp | "Cotizar por WhatsApp" y confirmar. | Se registra el lead y se abre `wa.me` con el mensaje prellenado. | |
| FE-08 | `/login` | Ingresar `jorge@elmotor.com` / `password123`. | Mensaje de bienvenida y redirección a `/dashboard`. | |
| FE-09 | `/dashboard` → Reservas | Buscar el código de FE-06. | La reserva aparece en estado Pendiente. | |
| FE-10 | `/dashboard` → Reservas | Marcar la reserva de FE-06 como entregada. | Estado Completada; el stock de la sede baja en la cantidad reservada. | |
| FE-11 | `/dashboard` → Inventario | Descargar plantilla CSV y cargarla con la casilla de simulación (`dryRun`) marcada. | "Resultado de la Simulación" con filas válidas, sin modificar el inventario. | |
| FE-12 | `/login` | Registrar un comprador nuevo. | Cuenta creada y redirección a `/search`. | |

### 4.2 Casos fallidos y validaciones

| ID | Vista | Pasos | Resultado esperado | Obtenido |
| :--- | :--- | :--- | :--- | :--- |
| FE-13 | `/login` | Contraseña incorrecta. | Mensaje de error rojo; sin redirección. | |
| FE-14 | `/login` | Registro con un correo ya existente (`andres@gmail.com`). | Mensaje "El email ya está registrado". | |
| FE-15 | `/login` | Registro con contraseña de 3 caracteres. | El backend rechaza (400) y se muestra el mensaje. | |
| FE-16 | `/search` | Buscar "zzqxwvkjyy". | Estado vacío con ícono y sugerencias, sin errores en consola. | |
| FE-17 | `/parts/<uuid-inexistente>` | Abrir la URL manualmente. | "Repuesto no encontrado" con enlace al catálogo. | |
| FE-18 | `/compare` | Intentar agregar un 5.º repuesto. | Aviso "máximo de 4 repuestos"; la lista no cambia. | |
| FE-19 | `/compare` | Quitar todos los repuestos. | Estado vacío del comparador. | |
| FE-20 | Modal reserva | Enviar sin nombre o sin teléfono. | No se envía; mensaje "Por favor ingresa tu nombre y teléfono". | |
| FE-21 | Modal reserva | Subir la cantidad con "+" hasta el stock de la sede. | El botón "+" se desactiva al llegar al stock. | |
| FE-22 | Modal reserva | Con dos pestañas abiertas, reservar todo el stock en una y luego intentar reservar en la otra. | Mensaje del backend "Existencias insuficientes… Stock disponible: X" dentro del modal. | |
| FE-23 | `/dashboard` | Entrar sin sesión. | Banner "Modo Vista Previa" con botón para iniciar sesión. | |
| FE-24 | `/dashboard` | Entrar con `andres@gmail.com` (comprador). | Formulario de onboarding de almacén; no se muestra inventario ajeno. | |
| FE-25 | `/dashboard` → Inventario | Subir un archivo `.txt` o CSV con columnas erróneas. | Reporte con los errores por fila o mensaje de error; sin cambios en inventario. | |
| FE-26 | Cualquiera | Apagar el backend y recargar `/search`. | Hoy: lista vacía sin aviso (limitación L-02). | |

---

## 5. Flujo E2E automatizado contra la API

`scripts/e2e-smoke.mjs` recorre el mismo flujo que usa la interfaz, sin dependencias externas (Node.js 18+). Crea una reserva real y la cancela al final para no consumir stock del seed.

```bash
# Con backend (y opcionalmente frontend) corriendo:
node scripts/e2e-smoke.mjs --md
```

| ID | Caso | Tipo | Esperado |
| :--- | :--- | :---: | :--- |
| E2E-01 | Búsqueda general de repuestos | Éxito | 200 con resultados |
| E2E-02 | Búsqueda sin coincidencias | Borde | 200 con 0 resultados |
| E2E-03 | Login con contraseña incorrecta | Fallo | 401 |
| E2E-04 | Login de administrador de almacén | Éxito | 200 con token y `storeId` |
| E2E-05 | Inventario sin token | Fallo | 401 |
| E2E-06 | Inventario con rol `BUYER` | Fallo | 403 |
| E2E-07 | Detalle de repuesto con sede y stock | Éxito | Inventario disponible |
| E2E-08 | Detalle de repuesto inexistente | Fallo | 404 |
| E2E-09 | Reserva con cantidad mayor al stock | Fallo | 400 "Existencias insuficientes" |
| E2E-10 | Reserva sin teléfono | Fallo | 400 |
| E2E-11 | Reserva con campo no permitido | Fallo | 400 (`forbidNonWhitelisted`) |
| E2E-12 | Reserva de repuesto inexistente | Fallo | 404 |
| E2E-13 | Reserva exitosa | Éxito | 201 con código `RES-*` |
| E2E-14 | Consulta pública del comprobante | Éxito | 200, `PENDING` |
| E2E-15 | Consulta de código inexistente | Fallo | 404 |
| E2E-16 | El almacén ve la reserva | Éxito | 200, incluida en el listado |
| E2E-17 | Cambiar estado sin token | Fallo | 401 |
| E2E-18 | El almacén cancela la reserva | Éxito | 200, `CANCELLED` |
| E2E-19 a 25 | Vistas `/`, `/search`, `/parts/[id]`, `/compare`, `/login`, `/dashboard`, `/stores` | Éxito | 200 (se omiten si el frontend no está levantado) |

### 5.1 Resultado de la ejecución

> Pegar aquí la tabla que imprime `node scripts/e2e-smoke.mjs --md`, con fecha y equipo donde se ejecutó.

```text
Fecha:
Equipo / SO:
Resumen: __ PASS · __ FAIL · __ SKIP
```

---

## 6. Limitaciones conocidas y pendientes

### 6.1 Defectos de seguridad encontrados en la revisión (backend)

| ID | Severidad | Descripción | Archivo | Corrección sugerida |
| :--- | :---: | :--- | :--- | :--- |
| S-01 | Alta | `POST /api/auth/forgot-password` devuelve `devCode` (el OTP) siempre que no haya SMTP configurado, también en producción (`render.yaml` no define `SMTP_USER`/`SMTP_PASS`). Cualquiera podría restablecer la contraseña de otro usuario. | `backend/src/auth/auth.service.ts` | Devolver `devCode` solo si `NODE_ENV !== 'production'`. |
| S-02 | Alta | Los endpoints de gestión de reservas (`GET /reservations`, `GET /reservations/stats`, `PATCH /reservations/:id/status`) solo usan `JwtAuthGuard` y aceptan `?storeId=` cuando el token no tiene almacén. Un `BUYER` autenticado puede listar o cancelar reservas de cualquier almacén (incumple RN-4). | `backend/src/reservations/reservations.controller.ts` | Añadir `RolesGuard` + `@Roles('STORE_ADMIN', 'PLATFORM_ADMIN')` y aceptar `storeId` por query solo para `PLATFORM_ADMIN`. |
| S-03 | Media | `POST /api/catalog/sync` reindexa todo el catálogo sin autenticación. | `backend/src/catalog/catalog.controller.ts` | Proteger o eliminar (ya existe `POST /catalog/sync-search` protegido). |
| S-04 | Media | `POST /api/stores/upload-image` acepta imágenes de hasta 15 MB sin autenticación y las guarda en PostgreSQL. | `backend/src/locations/locations.controller.ts` | Exigir `JwtAuthGuard`. |
| S-05 | Baja | La función de CORS termina siempre en `callback(null, true)`, así que acepta cualquier origen aunque `FRONTEND_URL` esté definido. | `backend/src/main.ts` | Rechazar orígenes que no estén en la lista. |

Estos defectos quedan registrados como tarea `T-DOC-10` en `tasks.md` para corregirse en una rama `fix/security-hardening`.

### 6.2 Limitaciones funcionales

| ID | Descripción |
| :--- | :--- |
| L-01 | **El stock no se aparta al reservar.** Se valida al crear la reserva y se descuenta al marcarla como entregada (`COMPLETED`). Varias reservas `PENDING` pueden sumar más unidades que el stock real. |
| L-02 | **Sin aviso cuando la API está caída.** `fetchParts`, `fetchStores` y `fetchLocations` devuelven listas vacías en caso de error, y el usuario ve "0 resultados". |
| L-03 | **JWT en `localStorage`.** Simple para el MVP, pero expuesto ante XSS. No hay refresh token ni cierre de sesión automático al expirar. |
| L-04 | **Teléfono sin formato.** La reserva solo exige que no esté vacío. |
| L-05 | **WhatsApp por defecto.** Si la sede no tiene teléfono, `WhatsAppLeadModal` usa un número fijo (`+573002001001`). |
| L-06 | **Sin pruebas automatizadas de UI en navegador** (Playwright/Cypress). La cobertura E2E es la del script contra la API más los casos manuales de §4. |
| L-07 | **Deuda de linter** (84 errores de ESLint, ver §2). |
| L-08 | **Credenciales de desarrollo en `docker-compose.yml`** (`repuestos_dev_2026`, master key de Meilisearch). Son solo para local; en despliegue se usan variables de Render. |

### 6.3 Fuera de alcance (Non-Goals de `spec.md`)

Pagos en línea, facturación electrónica DIAN, app móvil nativa y almacenamiento de imágenes en nube externa. No se probaron porque no forman parte del sistema.
