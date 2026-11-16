# Constitución del Proyecto — Proyecto-repuestos (AutoPart Pro)

**Proyecto:** Plataforma Web de Repuestos Automotrices (`Proyecto-repuestos`)  
**Contexto Académico:** Proyecto Final de Ingeniería Web — Universidad Cooperativa de Colombia (UCC)  
**Repositorio:** `https://github.com/Zero100x/Ingenieria_web`  
**Metodología:** Spec-Driven Development (SDD) — GitHub Spec Kit  

---

## 1. Principios Inquebrantables del Stack Tecnológico

Toda contribución al sistema debe respetar estrictamente la arquitectura y tecnologías definidas en el proyecto:

- **Backend (`backend/`):**
  - Framework: **NestJS 10** (`@nestjs/core`, `@nestjs/common`) con **TypeScript 5.3**.
  - ORM y Base de Datos: **Prisma ORM 5.8** sobre **PostgreSQL 16** (`postgres:16-alpine`).
  - Motor de Búsqueda: **Meilisearch v1.6** (`meilisearch` SDK) con índice principal `parts`.
  - Autenticación y Autorización: **JWT** (`@nestjs/jwt`, `passport-jwt`) y control de acceso por roles mediante `JwtAuthGuard` y `RolesGuard`.
  - Correo electrónico: **Nodemailer** (`MailService`) con soporte SMTP y modo resiliente local en consola.
  - Carga de archivos e imágenes: **Multer** (`@nestjs/platform-express`) con persistencia binaria en PostgreSQL (`StoredImage`).
- **Frontend (`frontend/`):**
  - Framework: **Next.js 16 (App Router)** con **React 19**, **TypeScript 5** y **Tailwind CSS 3.4**.
- **Infraestructura Local (`docker-compose.yml`):**
  - PostgreSQL 16 en el puerto `5433:5432` y Meilisearch v1.6 en el puerto `7700:7700`, ambos con `healthcheck` y volúmenes persistentes.

---

## 2. Estándares de Código y Diseño de API

1. **DTOs Obligatorios y Validación Global:**
   - Todo endpoint `POST`, `PUT` o `PATCH` debe recibir un **DTO tipado** con decoradores de `class-validator` y documentación `@ApiProperty` / `@ApiPropertyOptional` de `@nestjs/swagger`.
   - El `ValidationPipe` global en `backend/src/main.ts` mantiene `whitelist: true`, `forbidNonWhitelisted: true` y `transform: true`. Ningún controlador debe desactivar esta validación.
2. **Excepciones HTTP Estándar:**
   - Usar exclusivamente excepciones HTTP estándar de `@nestjs/common` (`BadRequestException` 400, `UnauthorizedException` 401, `ForbiddenException` 403, `NotFoundException` 404).
   - Prohibido devolver errores genéricos `500` para validaciones de negocio (ej. stock insuficiente o formato de archivo inválido).
3. **Nomenclatura y Rutas Consistentes:**
   - Todas las rutas del backend exponen el prefijo global `/api` y documentación OpenAPI/Swagger en `/api/docs`.
   - Módulos en inglés y plural/dominio claro: `auth`, `users`, `vehicles`, `catalog`, `inventory`, `locations`, `reservations`, `leads`, `mail`, `media`, `search`.
   - Modelos Prisma en `PascalCase` con mapeo explícito a tablas `snake_case` (`@@map("...")`) y columnas `snake_case` (`@map("...")`).
4. **Separación de Responsabilidades:**
   - Los `Controllers` solo validan entrada, extraen `@CurrentUser()` y delegan en los `Services`.
   - Toda lógica transaccional (ej. creación de reservas + registro de lead) debe ejecutarse dentro de `prisma.$transaction(...)`.

---

## 3. Reglas de Seguridad y Cero Secretos Expuestos

1. **Prohibición Absoluta de Secretos en Git:**
   - Está terminantemente prohibido subir archivos `.env`, `.env.local`, `.env.production`, contraseñas de base de datos, `JWT_SECRET`, `MEILISEARCH_API_KEY` o credenciales `SMTP_PASS` al repositorio.
2. **Uso Obligatorio de `.env.example`:**
   - Toda variable de entorno nueva consumida por `ConfigService` o `process.env` debe documentarse inmediatamente en `backend/.env.example` con valores de ejemplo ficticios.
3. **Protección de `.gitignore`:**
   - `.gitignore` debe bloquear `.env`, `.env*.local`, `*.env`, `node_modules/`, `dist/`, `.next/` y archivos de base de datos locales (`*.sqlite`, `*.db`).
4. **Seguridad en Autenticación y Carga de Archivos:**
   - Las contraseñas deben almacenarse únicamente como hashes `bcrypt` (factor de costo 12).
   - Los endpoints administrativos (`inventory`, `locations`, `users`, `leads` privados, gestión de `reservations`) deben protegerse con `@UseGuards(JwtAuthGuard, RolesGuard)` y `@Roles('STORE_ADMIN', 'PLATFORM_ADMIN')`.
   - Las imágenes cargadas deben pasar por `IMAGE_MULTER_OPTIONS` (validación estricta de MIME/extensión y límite máximo de 15 MB).

---

## 4. Flujo de Trabajo Colaborativo en Git (Equipo de 2 Personas)

1. **Protección de `main`:**
   - Prohibido hacer `git push` directo o commits directos sobre la rama `main`.
2. **Ramas Temáticas Obligatorias:**
   - Todo cambio debe desarrollarse en una rama dedicada siguiendo convención semántica:
     - `feat/<descripcion-corta>` (ej. `feat/sdd-specs-and-backend`)
     - `fix/<descripcion-corta>`
     - `docs/<descripcion-corta>`
3. **Pull Requests Revisados:**
   - Todo merge hacia `main` debe realizarse mediante **Pull Request (PR)** en GitHub, revisado y aprobado por el otro integrante del equipo.
4. **Trazabilidad SDD:**
   - Ninguna funcionalidad nueva se implementa sin su especificación previa en `.specify/specs/` y su plan técnico actualizado.

