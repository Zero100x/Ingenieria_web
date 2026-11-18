# AutoPart Pro — Plataforma de Repuestos Automotrices (`Proyecto-repuestos`)

Proyecto Final de **Ingeniería Web** (Universidad Cooperativa de Colombia — UCC), desarrollado bajo metodología **Spec-Driven Development (SDD)** y **GitHub Spec Kit**.

---

## 1. Arquitectura y Stack Tecnológico

- **Backend (`backend/`):** NestJS 10, TypeScript 5.3, Prisma ORM 5.8, PostgreSQL 16, Meilisearch v1.6, JWT + `RolesGuard`, Nodemailer, Multer (`StoredImage` en PostgreSQL) y Swagger (`/api/docs`).
- **Frontend (`frontend/`):** Next.js 16 (App Router), React 19, TypeScript 5 y Tailwind CSS 3.4.
- **Infraestructura Local:** Docker Compose (`postgres:16-alpine` en puerto `5433` y `getmeili/meilisearch:v1.6` en puerto `7700`).

### Artefactos SDD y Documentación
- Constitución del proyecto: [constitution.md](.specify/memory/constitution.md)
- Especificación funcional y Non-Goals: [spec.md](.specify/specs/001-proyecto-repuestos/spec.md)
- Plan técnico de arquitectura: [plan.md](.specify/specs/001-proyecto-repuestos/plan.md)
- Tareas del equipo: [tasks.md](.specify/specs/001-proyecto-repuestos/tasks.md)
- Auditoría de seguridad y pruebas del backend: [docs/tests-backend.md](docs/tests-backend.md)

---

## 2. Requisitos de Instalación

- **Node.js** `>= 20.x` y **npm**
- **Docker** y **Docker Compose**
- **Git**

---

## 3. Pasos para Ejecutar el Sistema

### 3.1 Levantar Base de Datos y Motor de Búsqueda
```bash
docker compose up -d
```
Esto inicia PostgreSQL (`localhost:5433`) y Meilisearch (`localhost:7700`) con sus `healthcheck` configurados.

### 3.2 Configurar Variables de Entorno
Copia el archivo de ejemplo del backend (nunca subas `.env` a Git):
```bash
cp backend/.env.example backend/.env
```
Variables principales en `backend/.env.example`:
- `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`
- `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`
- `PORT`, `NODE_ENV`, `FRONTEND_URL`, `API_PUBLIC_URL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` *(opcional en desarrollo: si se deja vacío, `MailService` opera en modo consola)*

### 3.3 Iniciar Backend (Puerto `3001`)
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run start:dev
```
- API REST: `http://localhost:3001/api`
- Swagger / OpenAPI: `http://localhost:3001/api/docs`

### 3.4 Iniciar Frontend (Puerto `3000`)
En otra terminal:
```bash
cd frontend
npm install
npm run dev
```
- Aplicación Web: `http://localhost:3000`

---

## 4. Flujo Principal del Sistema (Demo)

1. **Búsqueda y Compatibilidad Vehicular (`/search`):** El comprador busca por texto, número OEM o vehículo (marca, modelo, año, versión) usando Meilisearch.
2. **Detalle y Comparación (`/parts/[id]` y `/compare`):** Visualización de especificaciones, sedes con stock disponible, preguntas y comparador lado a lado.
3. **Reserva Click & Collect (`/api/reservations`):** El comprador reserva en una sede con stock verificado; el sistema genera un código único (`RES-XXXX-CIU`, válido 48h) y registra el `Lead` comercial.
4. **Panel B2B de Almacén (`/dashboard`):** El `STORE_ADMIN` gestiona inventario multi-sede, realiza carga masiva CSV (`/api/inventory/bulk-upload`), atiende reservas en mostrador y consulta métricas de leads.

---

## 5. Decisiones Técnicas y Pendientes Documentados

- **Imágenes en PostgreSQL (`StoredImage`):** Se almacenan binariamente en BD y se sirven vía `/api/media/:filename` para evitar almacenamiento externo (S3/Cloudinary) y pérdida de archivos en contenedores efímeros.
- **Non-Goals explícitos:** No incluye pasarela de pagos en línea, facturación electrónica DIAN, app móvil nativa ni almacenamiento en nube externa.
- **Pendientes para entrega final:** Ejecución de pruebas en vivo con Docker activo, integración/verificación E2E del frontend y captura de evidencias de demo (ver [tasks.md](.specify/specs/001-proyecto-repuestos/tasks.md)).
