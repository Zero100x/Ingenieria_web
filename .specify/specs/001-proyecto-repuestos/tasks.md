# Tareas — 001: Plataforma de Repuestos Automotrices (`Proyecto-repuestos`)

**Relacionado con:** [constitution.md](../../memory/constitution.md) | [spec.md](./spec.md) | [plan.md](./plan.md)
**Equipo:** Integrante 1 (Backend/Arquitectura) · Integrante 2 (Frontend/QA/Docs)

---

## Convenciones

- **ID:** `T-<módulo>-<nn>`. Cada tarea apunta al requisito (`RF-xx`) o regla de negocio (`RN-x`) de `spec.md` que cubre.
- **Estado:**
  - `[x]` Implementada y verificable en el código del repositorio.
  - `[~]` Implementada parcialmente o con un defecto conocido (ver columna Evidencia y `docs/tests-frontend-e2e.md` §6).
  - `[ ]` Pendiente.
- **Evidencia:** archivo(s) del repositorio donde se puede comprobar la tarea.
- `RN-1` Validación de stock · `RN-2` Sincronización Prisma ↔ Meilisearch · `RN-3` Validación de imágenes · `RN-4` Aislamiento multi-almacén.

---

## 1. Infraestructura, Base de Datos y Seguridad

| ID | Estado | Tarea | Spec | Responsable | Evidencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| T-INF-01 | [x] | Definir servicios PostgreSQL 16 (`5433`) y Meilisearch v1.6 (`7700`) con `healthcheck` y volúmenes | Plan §1, §5 | Integrante 1 | `docker-compose.yml` |
| T-INF-02 | [x] | Modelar esquema Prisma (usuarios/roles, almacenes/sedes, catálogo, compatibilidad, inventario, reservas, leads, `StoredImage`) con `@@map`/`@map` snake_case | Plan §3 | Integrante 1 | `backend/prisma/schema.prisma` |
| T-INF-03 | [x] | Crear `PrismaService` / `PrismaModule` | Plan §2 | Integrante 1 | `backend/src/prisma/` |
| T-INF-04 | [x] | Bootstrap NestJS: prefijo `/api`, `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`), Swagger en `/api/docs`, límite de body 25 MB | Constitución §2 | Integrante 1 | `backend/src/main.ts` |
| T-INF-05 | [x] | Poblar datos de prueba (roles, 4 usuarios, 3 almacenes, vehículos, categorías, repuestos, compatibilidades, inventario) | Plan §3 | Integrante 1 | `backend/prisma/seed.ts` |
| T-INF-06 | [x] | Bloquear secretos en `.gitignore` y auditar que solo `.env.example` está versionado | Constitución §3 | Integrante 1 | `.gitignore`, `docs/tests-backend.md` §1.1 |
| T-INF-07 | [x] | Completar `backend/.env.example` (`FRONTEND_URL`, `API_PUBLIC_URL`, `SMTP_*`) | Constitución §3.2 | Integrante 1 | `backend/.env.example` |
| T-INF-08 | [x] | Crear `frontend/.env.example` con `NEXT_PUBLIC_API_URL` | Constitución §3.2 | Integrante 2 | `frontend/.env.example` |
| T-INF-09 | [x] | Configurar despliegue del backend + BD en Render | Plan §1 | Integrante 1 | `render.yaml`, `backend/Dockerfile` |
| T-INF-10 | [x] | Registro y login con JWT y contraseñas `bcrypt` (costo 12); registro limitado a roles `BUYER` / `STORE_ADMIN` | RF-01 | Integrante 1 | `backend/src/auth/auth.service.ts`, `auth.controller.ts` |
| T-INF-11 | [x] | `JwtStrategy`, `JwtAuthGuard`, `RolesGuard`, decoradores `@Roles` y `@CurrentUser` | RF-01 | Integrante 1 | `backend/src/auth/jwt.strategy.ts`, `backend/src/common/` |
| T-INF-12 | [x] | Recuperación de contraseña con OTP de 6 dígitos (15 min) por correo. DevCode restringido únicamente a entorno de desarrollo | RF-01, RF-06 | Integrante 1 | `backend/src/auth/auth.service.ts` (`forgotPassword`) |
| T-INF-13 | [x] | Gestión de usuarios y roles solo para `PLATFORM_ADMIN` | RF-01 | Integrante 1 | `backend/src/users/` |

## 2. Catálogo, Compatibilidad y Búsqueda

| ID | Estado | Tarea | Spec | Responsable | Evidencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| T-CAT-01 | [x] | Endpoints jerárquicos de vehículos (marcas → modelos → años → versiones) y `GET /api/vehicles/cascade` | RF-02 | Integrante 1 | `backend/src/vehicles/` |
| T-CAT-02 | [x] | CRUD de categorías y repuestos protegido para `STORE_ADMIN` / `PLATFORM_ADMIN` | RF-02 | Integrante 1 | `backend/src/catalog/catalog.controller.ts` |
| T-CAT-03 | [x] | Números de parte OEM/Aftermarket y compatibilidad vehicular (individual y masiva) | RF-02 | Integrante 1 | `backend/src/catalog/catalog.service.ts` |
| T-CAT-04 | [x] | Preguntas técnicas por repuesto (crear pública, responder solo almacén) | RF-02 | Integrante 1 | `catalog.controller.ts` (`parts/:id/questions`) |
| T-CAT-05 | [x] | Crear/configurar índice `parts` en Meilisearch (filterable, sortable, searchable) | RF-03 | Integrante 1 | `backend/src/search/meilisearch.service.ts` |
| T-CAT-06 | [x] | `GET /api/search/parts` con filtros (texto, vehículo, categoría, condición, precio, almacén) y ordenamiento, con respaldo en PostgreSQL si Meilisearch no responde | RF-03 | Integrante 1 | `backend/src/search/search.controller.ts` |
| T-CAT-07 | [x] | Sincronizar repuesto en Meilisearch al crear/editar repuesto, inventario, CSV o al entregar una reserva; sincronización completa al arrancar | RN-2 | Integrante 1 | `catalog.service.ts` (`syncPartToSearch`, `onModuleInit`), `inventory.service.ts`, `reservations.service.ts` |
| T-CAT-08 | [~] | `POST /api/catalog/sync` (reindexación completa). **Defecto:** endpoint sin guard; existe la versión protegida `POST /api/catalog/sync-search` | RN-2 | Integrante 1 | `catalog.controller.ts` línea ~79 |
| T-CAT-09 | [x] | Registrar búsquedas (`SearchQuery`) para demanda insatisfecha | RF-06 | Integrante 1 | `search.controller.ts`, `leads.controller.ts` (`search-query`, `unmet-demand`) |

## 3. Inventario Multi-Sede, Sedes y Carga CSV

| ID | Estado | Tarea | Spec | Responsable | Evidencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| T-INV-01 | [x] | CRUD de almacenes y sedes (con coordenadas y horario) y onboarding de almacén para el usuario | RF-04 | Integrante 1 | `backend/src/locations/` |
| T-INV-02 | [x] | Inventario por sede y condición: listar, resumen KPI, crear repuesto con stock, editar stock/ficha, eliminar | RF-04 | Integrante 1 | `backend/src/inventory/inventory.controller.ts` |
| T-INV-03 | [x] | Parser CSV RFC 4180 propio (delimitador `,`/`;`, BOM UTF-8) | RF-04 | Integrante 1 | `backend/src/inventory/csv.util.ts` |
| T-INV-04 | [x] | `GET /api/inventory/template` y `POST /api/inventory/bulk-upload` (`file` o `csvContent`, `dryRun`, `400` sin datos) | RF-04 | Integrante 1 | `inventory.controller.ts` |
| T-INV-05 | [x] | Restringir inventario a `STORE_ADMIN` / `PLATFORM_ADMIN` y filtrar por `storeId` del token | RF-04, RN-4 | Integrante 1 | `inventory.controller.ts` (guards a nivel de clase) |
| T-INV-06 | [x] | Validación de imágenes (`IMAGE_MULTER_OPTIONS`, 15 MB, formatos permitidos) y persistencia en `StoredImage` | RF-07, RN-3 | Integrante 1 | `backend/src/media/` |
| T-INV-07 | [x] | Servir imágenes con `Cache-Control: immutable` y `404` si no existen | RF-07 | Integrante 1 | `media.controller.ts` |
| T-INV-08 | [~] | `POST /api/stores/upload-image` usado en el onboarding. **Defecto:** no exige JWT | RN-3 | Integrante 1 | `locations.controller.ts` línea ~48 |

## 4. Reservas Click & Collect y Leads

| ID | Estado | Tarea | Spec | Responsable | Evidencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| T-RES-01 | [x] | Validar existencia de repuesto (`404`), sede (`404`) y stock disponible (`400` con stock real) antes de reservar | RN-1, RF-05 | Integrante 1 | `reservations.service.ts` (`createReservation`) |
| T-RES-02 | [x] | Crear reserva `PENDING` + `Lead` en `prisma.$transaction`, código `RES-XXXX-CIU` y vencimiento a 48 h | RF-05 | Integrante 1 | `reservations.service.ts` |
| T-RES-03 | [x] | Consulta pública por código con auto-expiración | RF-05 | Integrante 1 | `GET /api/reservations/code/:code` |
| T-RES-04 | [x] | Cambio de estado (`COMPLETED` descuenta stock y reindexa; `CANCELLED`/`EXPIRED`) y KPIs de reservas | RF-05, RN-2 | Integrante 1 | `reservations.service.ts` (`updateReservationStatus`, `getStoreReservationStats`) |
| T-RES-05 | [x] | Aislamiento multi-almacén en reservas protegido con `RolesGuard` y `JwtAuthGuard`; roles `STORE_ADMIN` y `PLATFORM_ADMIN` requeridos | RN-4 | Integrante 1 | `reservations.controller.ts` |
| T-RES-06 | [x] | Registrar leads de "Cotizar por WhatsApp", listar leads y estadísticas por almacén, cambiar estado | RF-06 | Integrante 1 | `backend/src/leads/` |
| T-RES-07 | [x] | `MailService` con SMTP opcional y modo consola en local | RF-06 | Integrante 1 | `backend/src/mail/mail.service.ts` |

## 5. Frontend Next.js (App Router)

| ID | Estado | Tarea | Spec | Responsable | Evidencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| T-FE-01 | [x] | Cliente HTTP centralizado (`NEXT_PUBLIC_API_URL`, manejo de errores con `message` del backend, formateo COP, URLs de imágenes) | Plan §2 | Integrante 2 | `frontend/lib/api.ts`, `frontend/lib/types.ts` |
| T-FE-02 | [x] | Layout global, `Navbar`, `Footer` y estilos Tailwind | Plan §2 | Integrante 2 | `frontend/app/layout.tsx`, `frontend/components/` |
| T-FE-03 | [x] | Home con buscador, selector vehicular en cascada y accesos por categoría/almacén | RF-02, RF-03 | Integrante 2 | `frontend/app/page.tsx`, `components/VehicleCascadeSelector.tsx` |
| T-FE-04 | [x] | Resultados de búsqueda con filtros, ordenamiento, filtro por distancia, skeleton de carga y estado vacío | RF-03 | Integrante 2 | `frontend/app/search/page.tsx`, `components/PartCard.tsx` |
| T-FE-05 | [x] | Detalle de repuesto: referencias, compatibilidad, sedes con stock, preguntas técnicas, estado "Repuesto no encontrado" | RF-02 | Integrante 2 | `frontend/app/parts/[id]/page.tsx`, `components/ProductTechnicalQA.tsx` |
| T-FE-06 | [x] | Comparador (máx. 4 repuestos, persistido en `localStorage`, bandeja flotante, estado vacío) | RF-02 | Integrante 2 | `frontend/app/compare/page.tsx`, `lib/compareContext.tsx`, `components/CompareTray.tsx` |
| T-FE-07 | [x] | Modal de reserva: solo sedes con stock, cantidad limitada al stock, validación de nombre/teléfono, error del backend visible y comprobante | RF-05, RN-1 | Integrante 2 | `components/ReservationModal.tsx`, `components/ReservationVoucherModal.tsx` |
| T-FE-08 | [x] | Modal "Cotizar por WhatsApp" que registra el lead | RF-06 | Integrante 2 | `components/WhatsAppLeadModal.tsx` |
| T-FE-09 | [x] | Login, registro de comprador y recuperación de contraseña OTP con mensajes de error; redirección por rol | RF-01 | Integrante 2 | `frontend/app/login/page.tsx` |
| T-FE-10 | [x] | Directorio de almacenes y mapa de sedes | RF-04 | Integrante 2 | `frontend/app/stores/page.tsx`, `components/InteractiveStoresMap.tsx` |
| T-FE-11 | [x] | Dashboard B2B: onboarding de almacén, pestañas Inventario / Sedes / Consultas / Reservas, CSV con `dryRun`, toasts de error | RF-04, RF-05, RF-06 | Integrante 2 | `frontend/app/dashboard/page.tsx`, `components/StoreLocationPicker.tsx`, `components/StoreImageUploader.tsx` |
| T-FE-12 | [ ] | Limpiar errores de ESLint (`no-explicit-any`, `no-unescaped-entities`) | Constitución §2 | Integrante 2 | `npx eslint app components lib` → 84 errores, 46 advertencias |
| T-FE-13 | [ ] | Mostrar un aviso cuando la API no responde (hoy la búsqueda muestra "0 resultados") | RF-03 | Integrante 2 | `lib/api.ts` (`fetchParts`) |

## 6. Pruebas y Documentación

| ID | Estado | Tarea | Spec | Responsable | Evidencia |
| :--- | :---: | :--- | :--- | :--- | :--- |
| T-DOC-01 | [x] | Constitución del proyecto | Criterio 01 | Integrante 1 | `.specify/memory/constitution.md` |
| T-DOC-02 | [x] | Especificación funcional con reglas de negocio y Non-Goals | Criterio 01 | Integrante 1 | `.specify/specs/001-proyecto-repuestos/spec.md` |
| T-DOC-03 | [x] | Plan técnico de arquitectura | Criterio 01 | Integrante 1 | `.specify/specs/001-proyecto-repuestos/plan.md` |
| T-DOC-04 | [x] | Desglose de tareas con trazabilidad spec → tarea → código | Criterio 01 | Integrante 2 | este archivo |
| T-DOC-05 | [x] | Auditoría de seguridad y casos de prueba del backend | Criterio 05 | Integrante 1 | `docs/tests-backend.md` |
| T-DOC-06 | [x] | Auditoría del frontend y casos de prueba E2E (exitosos y fallidos) con limitaciones conocidas | Criterio 05 | Integrante 2 | `docs/tests-frontend-e2e.md` |
| T-DOC-07 | [x] | Script de humo del flujo principal contra la API (sin dependencias) | Criterio 05 | Integrante 2 | `scripts/e2e-smoke.mjs` |
| T-DOC-08 | [x] | README de entrega (instalación, variables, usuarios de prueba, guion de demo) | Criterio 06 | Integrante 2 | `README.md` |
| T-DOC-09 | [x] | Ejecutar las pruebas en local y registrar el resultado obtenido con 25 PASS y autorización de reservas validada con 403 Forbidden | Criterio 05 | Integrante 1 + 2 | `docs/tests-e2e.md` |
| T-DOC-10 | [ ] | Corregir defectos de seguridad T-INF-12, T-CAT-08, T-INV-08 y T-RES-05 en rama `fix/security-hardening` | Constitución §3.4 | Integrante 1 | — |

---

## Resumen

| Módulo | Total | [x] | [~] | [ ] |
| :--- | :---: | :---: | :---: | :---: |
| Infraestructura, BD y Seguridad | 13 | 13 | 0 | 0 |
| Catálogo y Búsqueda | 9 | 8 | 1 | 0 |
| Inventario y CSV | 8 | 7 | 1 | 0 |
| Reservas y Leads | 7 | 7 | 0 | 0 |
| Frontend Next.js | 13 | 11 | 0 | 2 |
| Pruebas y Documentación | 10 | 9 | 0 | 1 |
| **Total** | **60** | **55** | **2** | **3** |
