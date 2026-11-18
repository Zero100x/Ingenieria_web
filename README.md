# AutoPart Pro — Plataforma de Repuestos Automotrices

Proyecto Final de **Ingeniería Web** — Universidad Cooperativa de Colombia (UCC), campus Pasto.
Desarrollado con **Spec-Driven Development (SDD)** y **GitHub Spec Kit**.

AutoPart Pro conecta a compradores y talleres con almacenes de repuestos de Pasto. El comprador busca por texto, referencia OEM o por su vehículo (marca → modelo → año → versión), compara opciones y **reserva para recoger en la sede** (*Click & Collect*), sin pagos en línea. Cada almacén gestiona su inventario multi-sede, carga productos por CSV y atiende reservas y consultas desde un panel B2B.

---

## Contenido

1. [Funcionalidades](#funcionalidades)
2. [Arquitectura](#arquitectura)
3. [Artefactos SDD](#artefactos-sdd)
4. [Requisitos previos](#requisitos-previos)
5. [Instalación y ejecución](#instalación-y-ejecución)
6. [Variables de entorno](#variables-de-entorno)
7. [Usuarios de prueba](#usuarios-de-prueba)
8. [Pruebas](#pruebas)
9. [Guion de demostración](#guion-de-demostración)
10. [Decisiones técnicas](#decisiones-técnicas)
11. [Limitaciones y pendientes](#limitaciones-y-pendientes)
12. [Estructura del repositorio](#estructura-del-repositorio)
13. [Equipo y flujo de trabajo](#equipo-y-flujo-de-trabajo)

---

## Funcionalidades

| Requisito | Qué hace |
| :--- | :--- |
| **RF-01** Autenticación | Registro de compradores y almacenes, login con JWT, roles `BUYER` / `STORE_ADMIN` / `PLATFORM_ADMIN`, recuperación de contraseña con código OTP. |
| **RF-02** Catálogo y compatibilidad | Categorías, repuestos, referencias OEM/Aftermarket, compatibilidad por versión de vehículo y preguntas técnicas. |
| **RF-03** Búsqueda | Meilisearch tolerante a errores con filtros (vehículo, categoría, condición, precio, almacén) y ordenamiento; respaldo en PostgreSQL. |
| **RF-04** Inventario y CSV | Stock y precio por sede y condición, plantilla CSV y carga masiva con simulación (`dryRun`). |
| **RF-05** Reservas Click & Collect | Reserva con validación de stock, código `RES-XXXX-CIU`, vigencia de 48 h y gestión de entrega en mostrador. |
| **RF-06** Leads y correo | "Cotizar por WhatsApp", KPIs de conversión y correos transaccionales por SMTP (o consola en local). |
| **RF-07** Imágenes | Imágenes de repuestos y almacenes guardadas en PostgreSQL y servidas con caché. |

**Fuera de alcance (Non-Goals):** pagos en línea, facturación electrónica DIAN, app móvil nativa y almacenamiento en nube externa.

---

## Arquitectura

```text
┌──────────────────────────┐   REST JSON / multipart   ┌───────────────────────────┐
│ Frontend · Next.js 16    │ ────────────────────────▶ │ Backend · NestJS 10       │
│ App Router · React 19    │ ◀──────────────────────── │ Prefijo /api · Swagger    │
│ Tailwind · :3000         │       JWT Bearer          │ :3001                     │
└──────────────────────────┘                           └─────┬─────────┬───────┬───┘
                                                             │ Prisma  │ SDK   │ Nodemailer
                                                             ▼         ▼       ▼
                                                     ┌────────────┐ ┌────────────┐ ┌──────┐
                                                     │PostgreSQL16│ │Meilisearch │ │ SMTP │
                                                     │   :5433    │ │ v1.6 :7700 │ │(opc.)│
                                                     └────────────┘ └────────────┘ └──────┘
```

| Capa | Tecnología |
| :--- | :--- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 3.4 |
| Backend | NestJS 10, TypeScript 5, Prisma 5, Passport JWT, class-validator, Swagger |
| Datos | PostgreSQL 16, Meilisearch v1.6 (Docker Compose) |
| Despliegue | Render (`render.yaml`, `backend/Dockerfile`) |

El detalle de módulos, modelo de datos y flujo de indexación está en el [plan técnico](.specify/specs/001-proyecto-repuestos/plan.md).

---

## Artefactos SDD

| Artefacto | Ruta | Contenido |
| :--- | :--- | :--- |
| Constitución | [`.specify/memory/constitution.md`](.specify/memory/constitution.md) | Stack obligatorio, estándares de API, reglas de seguridad y flujo Git. |
| Especificación | [`.specify/specs/001-proyecto-repuestos/spec.md`](.specify/specs/001-proyecto-repuestos/spec.md) | Perfiles, RF-01 a RF-07, reglas de negocio y Non-Goals. |
| Plan técnico | [`.specify/specs/001-proyecto-repuestos/plan.md`](.specify/specs/001-proyecto-repuestos/plan.md) | Arquitectura, carpetas, modelo Prisma, Meilisearch y decisiones. |
| Tareas | [`.specify/specs/001-proyecto-repuestos/tasks.md`](.specify/specs/001-proyecto-repuestos/tasks.md) | 60 tareas por módulo, responsable, estado y archivo de evidencia. |
| Pruebas backend | [`docs/tests-backend.md`](docs/tests-backend.md) | Auditoría de secretos y casos de API exitosos/fallidos. |
| Pruebas frontend y E2E | [`docs/tests-frontend-e2e.md`](docs/tests-frontend-e2e.md) | Auditoría por vista, casos de UI, flujo E2E y limitaciones. |
| Evidencia en vivo | [`docs/tests-e2e.md`](docs/tests-e2e.md) | Resultados reales de API, CSV, navegador y defectos pendientes. |

---

## Requisitos previos

| Herramienta | Versión | Para qué |
| :--- | :--- | :--- |
| [Node.js](https://nodejs.org/) | 20 LTS o superior | Backend, frontend y script de pruebas |
| npm | 10+ | Dependencias |
| [Docker Desktop](https://www.docker.com/) / Docker Engine + Compose v2 | Reciente | PostgreSQL 16 y Meilisearch v1.6 |
| Git | 2.30+ | Clonar y colaborar |

> Sin Docker también funciona con PostgreSQL 16 y Meilisearch v1.6 instalados localmente: basta con ajustar `DATABASE_URL` y `MEILISEARCH_HOST`. Si Meilisearch no está disponible, la búsqueda usa PostgreSQL como respaldo.

Puertos usados: `3000` (frontend), `3001` (API), `5433` (PostgreSQL), `7700` (Meilisearch).

---

## Instalación y ejecución

### 1. Clonar

```bash
git clone https://github.com/Zero100x/Ingenieria_web.git
cd Ingenieria_web
```

### 2. Levantar la base de datos y el buscador (Docker Compose)

```bash
docker compose up -d
docker compose ps        # ambos servicios deben quedar "healthy"
```

### 3. Backend (NestJS)

```bash
cd backend
cp .env.example .env     # Windows PowerShell: Copy-Item .env.example .env
```

Edita `backend/.env` con los valores del `docker-compose.yml` (ver [Variables de entorno](#variables-de-entorno)) y luego:

```bash
npm install
npx prisma generate
npx prisma db push       # crea las tablas a partir de schema.prisma
npm run prisma:seed      # usuarios, almacenes, vehículos, repuestos e inventario
npm run start:dev
```

- API: <http://localhost:3001/api>
- Swagger: <http://localhost:3001/api/docs>

Al arrancar, el backend crea el índice `parts` en Meilisearch y sincroniza todo el catálogo.

### 4. Frontend (Next.js) — en otra terminal

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

- Aplicación: <http://localhost:3000>

### 5. Modo producción local (opcional)

```bash
# backend
cd backend && npm run build && node dist/src/main.js
# frontend
cd frontend && npm run build && npm run start
```

### Reiniciar los datos

```bash
cd backend
npx prisma db push --force-reset && npm run prisma:seed
```

### Detener los servicios

```bash
docker compose down        # conserva los datos
docker compose down -v     # borra también los volúmenes
```

---

## Variables de entorno

Ningún archivo `.env` se sube al repositorio (`.gitignore`). Solo se versionan las plantillas `backend/.env.example` y `frontend/.env.example`.

### Backend — `backend/.env`

| Variable | Obligatoria | Valor para desarrollo local | Descripción |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Sí | `postgresql://repuestos_user:repuestos_dev_2026@127.0.0.1:5433/repuestos_db?schema=public` | Conexión a PostgreSQL (credenciales del `docker-compose.yml`). |
| `JWT_SECRET` | Sí | Cadena aleatoria larga (ej. `openssl rand -hex 32`) | Firma de los tokens. |
| `JWT_EXPIRATION` | No | `24h` | Vigencia del token. |
| `MEILISEARCH_HOST` | No | `http://localhost:7700` | URL de Meilisearch. |
| `MEILISEARCH_API_KEY` | No | `repuestos_meili_master_key_2026` | `MEILI_MASTER_KEY` del `docker-compose.yml`. |
| `PORT` | No | `3001` | Puerto de la API. |
| `NODE_ENV` | No | `development` | Entorno. |
| `FRONTEND_URL` | No | `http://localhost:3000` | Orígenes CORS (separados por coma). |
| `API_PUBLIC_URL` | No | `http://localhost:3001` | Base para URLs públicas de imágenes. |
| `SMTP_HOST` / `SMTP_PORT` | No | `smtp.gmail.com` / `587` | Servidor de correo. |
| `SMTP_USER` / `SMTP_PASS` | No | *(vacío)* | Si están vacíos, los correos se imprimen en la consola del backend. |
| `SMTP_FROM` | No | `AutoPart Pro Pasto <no-reply@autopartpro.co>` | Remitente. |

### Frontend — `frontend/.env.local`

| Variable | Valor local | Descripción |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001/api` | URL base de la API (con `/api`). |

---

## Usuarios de prueba

Creados por `backend/prisma/seed.ts`. Contraseña de todos: **`password123`**.

| Rol | Correo | Nombre | Almacén |
| :--- | :--- | :--- | :--- |
| `PLATFORM_ADMIN` | `admin@repuestos.com` | Admin Plataforma | Acceso global |
| `STORE_ADMIN` | `jorge@elmotor.com` | Jorge Martínez | Repuestos El Motor |
| `STORE_ADMIN` | `camila@autopartescol.com` | Camila Rodríguez | AutoPartes Colombia |
| `BUYER` | `andres@gmail.com` | Andrés López | — |

> Son credenciales ficticias solo para desarrollo y demostración.

---

## Pruebas

### Flujo E2E automatizado (API + vistas)

Con el backend corriendo (y el frontend si se quieren verificar las vistas):

```bash
node scripts/e2e-smoke.mjs          # salida en consola
node scripts/e2e-smoke.mjs --md     # además imprime una tabla Markdown para la evidencia
```

Ejecuta 25 casos: búsqueda, autenticación, roles (401/403), detalle, reservas fallidas (stock insuficiente, validación, campo extra, repuesto inexistente), reserva exitosa, comprobante, gestión desde el almacén y disponibilidad de las vistas. La reserva de prueba se cancela al final.

Variables opcionales: `API_URL` (por defecto `http://localhost:3001/api`) y `FRONTEND_URL` (por defecto `http://localhost:3000`).

### Verificación estática

```bash
cd frontend && npx tsc --noEmit && npm run build
```

### Casos documentados

- Backend: [`docs/tests-backend.md`](docs/tests-backend.md) — se pueden ejecutar desde Swagger.
- Frontend y flujo completo: [`docs/tests-frontend-e2e.md`](docs/tests-frontend-e2e.md) — 26 casos manuales de interfaz (12 exitosos, 14 fallidos/validaciones).

---

## Guion de demostración

Duración estimada: 6–8 minutos. Tener abiertas dos ventanas: una normal (comprador) y una de incógnito (almacén).

| # | Quién | Acción | Qué mostrar |
| :---: | :--- | :--- | :--- |
| 1 | — | Mostrar `.specify/` y `tasks.md` en GitHub | Trazabilidad spec → tarea → código. |
| 2 | Comprador | En `/`, elegir un vehículo en el selector (marca → modelo → año) y buscar "pastillas" | Resultados filtrados por compatibilidad, precios en COP. |
| 3 | Comprador | Buscar con un error de tipeo (ej. "pastias") | Tolerancia a errores de Meilisearch. |
| 4 | Comprador | Agregar 2–3 repuestos al comparador y abrir `/compare` | Comparación de precio, stock y compatibilidad. |
| 5 | Comprador | Abrir un repuesto → "Reservar en sede" → poner una cantidad mayor que el stock con dos pestañas, o intentar enviar sin teléfono | Validaciones: mensaje de stock insuficiente y campos obligatorios. |
| 6 | Comprador | Reservar 1 unidad correctamente | Comprobante con código `RES-XXXX-CIU` y vencimiento a 48 h. |
| 7 | Almacén | Login como `jorge@elmotor.com` → `/dashboard` → Reservas | La reserva recién creada aparece como pendiente. |
| 8 | Almacén | Marcar como entregada | Estado completado y stock descontado en Inventario. |
| 9 | Almacén | Inventario → descargar plantilla CSV → cargar en simulación | Reporte de validación sin modificar datos. |
| 10 | Almacén | Consultas | Lead generado por la reserva y KPIs. |
| 11 | — | `http://localhost:3001/api/docs` y `node scripts/e2e-smoke.mjs` | API documentada y pruebas automáticas en verde. |

---

## Decisiones técnicas

- **Click & Collect sin pagos en línea:** el pago es presencial; reduce el alcance y la responsabilidad regulatoria (ver Non-Goals).
- **Meilisearch con respaldo en PostgreSQL:** búsqueda tolerante a errores y facetada; si el índice no responde, la API consulta la base de datos directamente.
- **Imágenes en PostgreSQL (`StoredImage`):** evita perder archivos en contenedores efímeros de Render y no depende de S3/Cloudinary.
- **Parser CSV propio (RFC 4180):** soporta `,` y `;` (Excel en español) y BOM UTF-8 sin librerías externas.
- **Validación en dos capas:** el frontend evita errores comunes (stock máximo, campos obligatorios) y el backend es la fuente de verdad (`ValidationPipe` con `whitelist` y `forbidNonWhitelisted`).
- **Reservas con lead en una transacción:** cada reserva crea su lead dentro de `prisma.$transaction`, de modo que no quedan registros a medias.
- **`prisma db push` en lugar de migraciones:** el esquema aún cambia con frecuencia; es el mismo comando que usan `render.yaml` y el `Dockerfile`.

---

## Limitaciones y pendientes

El detalle está en [`docs/tests-frontend-e2e.md` §6](docs/tests-frontend-e2e.md#6-limitaciones-conocidas-y-pendientes). Lo más importante:

- **Seguridad (pendiente `T-DOC-10`):** sin SMTP la recuperación de contraseña devuelve el código OTP también en producción; los endpoints de gestión de reservas aceptan `?storeId=` de usuarios sin almacén; `POST /api/catalog/sync` y `POST /api/stores/upload-image` no exigen autenticación; CORS acepta cualquier origen.
- **Stock:** se valida al reservar pero solo se descuenta al entregar, así que varias reservas pendientes pueden superar el stock real.
- **Frontend:** sin aviso cuando la API está caída (se ve "0 resultados"), JWT en `localStorage` sin cierre automático al expirar, y 84 errores de ESLint por limpiar.
- **Pruebas:** no hay pruebas automatizadas de UI en navegador (Playwright/Cypress); la cobertura E2E se hace contra la API más casos manuales.

---

## Estructura del repositorio

```text
.
├── .specify/
│   ├── memory/constitution.md
│   └── specs/001-proyecto-repuestos/{spec,plan,tasks}.md
├── backend/                  # API NestJS
│   ├── prisma/               # schema.prisma, seed.ts
│   ├── src/                  # auth, users, vehicles, catalog, inventory, locations,
│   │                         # search, reservations, leads, mail, media, common
│   ├── .env.example
│   └── Dockerfile
├── frontend/                 # Next.js App Router
│   ├── app/                  # /, search, parts/[id], compare, login, dashboard, stores
│   ├── components/
│   ├── lib/                  # cliente API, tipos, contexto del comparador
│   └── .env.example
├── docs/                     # tests-backend.md, tests-frontend-e2e.md
├── scripts/e2e-smoke.mjs     # flujo E2E automatizado
├── stitch_unified_auto_parts_finder/   # prototipos de diseño
├── docker-compose.yml
└── render.yaml
```

---

## Equipo y flujo de trabajo

| Integrante | Rol | Aportes principales |
| :--- | :--- | :--- |
| Integrante 1 — Diego Cerón ([@Zero100x](https://github.com/Zero100x)) | Backend / Arquitectura | Constitución, spec, plan, API NestJS, base de datos, auditoría backend |
| Integrante 2 — William Inzandara ([willInzan2005](https://github.com/williamInzandara))* | Frontend / QA / Docs | Tareas SDD, auditoría y pruebas del frontend, flujo E2E, README |

Flujo Git definido en la constitución:

1. Nada se sube directo a `main`.
2. Cada cambio va en su rama: `feat/…`, `fix/…` o `docs/…`.
3. Se integra con Pull Request revisado por el otro integrante.

| Rama | Contenido |
| :--- | :--- |
| `feat/sdd-specs-and-backend` | Constitución, spec, plan y auditoría del backend |
| `feat/tasks-frontend-and-docs` | `tasks.md`, pruebas del frontend y E2E, README |
