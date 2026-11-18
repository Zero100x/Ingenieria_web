# Lista de Tareas — 001: `Proyecto-repuestos`

**Relacionado con:** [constitution.md](../../memory/constitution.md) | [spec.md](./spec.md) | [plan.md](./plan.md)  
**Equipo:** 2 integrantes (Integrante 1: Arquitectura SDD, Backend y Seguridad | Integrante 2: Frontend, Integración E2E y Demo)

---

## Fase 1: Fundación SDD y Auditoría (Integrante 1 — Completado)

- [x] **T-01** (`SDD`): Crear [constitution.md](../../memory/constitution.md) con reglas del stack real, estándares DTO/HTTP, seguridad sin secretos y flujo Git.
- [x] **T-02** (`SDD`): Crear [spec.md](./spec.md) con perfiles de usuario, requisitos `RF-01` a `RF-07`, reglas de negocio y `Non-Goals`.
- [x] **T-03** (`SDD`): Crear [plan.md](./plan.md) con arquitectura, estructura real (`backend/src` y `frontend/app`), modelo Prisma e indexación Meilisearch.
- [x] **T-04** (`SDD`): Crear [tasks.md](./tasks.md) asociando tareas concretas a especificaciones y responsables.
- [x] **T-05** (`Seguridad`): Auditar `.gitignore`, `git ls-files` y completar `backend/.env.example` con `FRONTEND_URL`, `API_PUBLIC_URL` y `SMTP_*`.

## Fase 2: Validación y Endurecimiento del Backend (Integrante 1 — Completado)

- [x] **T-06** (`RF-01` / Seguridad): Restringir `devCode` en `AuthService.forgotPassword` únicamente a `NODE_ENV === 'development'` para evitar fuga de OTP en producción.
- [x] **T-07** (`RF-05` / Seguridad): Proteger `GET /api/reservations`, `GET /api/reservations/stats` y `PATCH /api/reservations/:id/status` con `RolesGuard` (`STORE_ADMIN`, `PLATFORM_ADMIN`) y bloquear acceso cruzado por `?storeId=` para `BUYER` y otros almacenes.
- [x] **T-08** (`Pruebas`): Documentar matriz de pruebas HTTP (`200`/`201` y `400`/`401`/`403`/`404`) y limitaciones conocidas en `docs/tests-backend.md`.
- [x] **T-09** (`Docs`): Crear `README.md` raíz con requisitos, instalación, variables de entorno, flujo principal y decisiones técnicas.

## Fase 3: Ejecución Local, Integración Frontend y Evidencia (Integrante 2 — Pendiente)

- [ ] **T-10** (`Git`): Revisar y aprobar el PR de `feat/sdd-specs-and-backend` hacia `main`.
- [ ] **T-11** (`RF-01`..`RF-07` / Backend): Levantar `docker compose up -d`, ejecutar `npx prisma db push && npm run prisma:seed` y comprobar ejecución de pruebas contra `http://localhost:3001/api/docs` (adjuntando capturas o salidas en `docs/`).
- [ ] **T-12** (`Frontend`): Crear `frontend/.env.example` si aplica, validar `npm install && npm run dev` en `frontend/` y probar flujos E2E: búsqueda en Meilisearch (`/search`), detalle y reserva Click & Collect (`/parts/[id]`), comparador (`/compare`) y panel B2B (`/dashboard`).
- [ ] **T-13** (`Demo`): Preparar la demostración breve del flujo principal y registrar evidencias finales antes de la entrega en el Campus UCC.
