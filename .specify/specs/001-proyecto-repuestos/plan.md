# Plan Técnico de Arquitectura — 001: `Proyecto-repuestos`

**Relacionado con:** [constitution.md](../../memory/constitution.md) | [spec.md](./spec.md)

---

## 1. Arquitectura General del Sistema

El sistema sigue una arquitectura cliente-servidor desacoplada en contenedores/servicios locales:

```text
+---------------------------+          HTTP / REST (JSON + Multipart)          +----------------------------------+
|   Frontend (Next.js 16)   |  --------------------------------------------->  |     Backend API (NestJS 10)      |
|   App Router + Tailwind   |  <---------------------------------------------  |   Prefijo /api | Swagger /docs   |
|   Puerto: 3000            |          JWT Bearer Auth + CORS                  |   Puerto: 3001                   |
+---------------------------+                                                  +----------------------------------+
                                                                                  |              |              |
                                                                      Prisma ORM  |   Meili SDK  |  Nodemailer  |
                                                                                  v              v              v
                                                                       +---------------+  +-------------+  +--------+
                                                                       | PostgreSQL 16 |  | Meilisearch |  |  SMTP  |
                                                                       | Puerto: 5433  |  | Puerto:7700 |  | Server |
                                                                       +---------------+  +-------------+  +--------+
```

---

## 2. Estructura Real de Carpetas

### Backend (`backend/src/`)
- `main.ts`: Bootstrap de NestExpressApplication, límite de body 25 MB, archivos estáticos `/uploads/`, prefijo global `/api`, `ValidationPipe` global, CORS y Swagger en `/api/docs`.
- `app.module.ts`: Módulo raíz que importa `ConfigModule` (global) y todos los módulos de dominio:
  - `prisma/`: `PrismaService` y `PrismaModule` para conexión con PostgreSQL.
  - `auth/`: Registro, login, recuperación OTP y estrategia `jwt.strategy.ts`.
  - `users/`: Gestión de usuarios y asignación de roles.
  - `locations/`: Administración de almacenes (`Store`) y sedes físicas (`Location`).
  - `vehicles/`: Jerarquía vehicular (`VehicleMake`, `VehicleModel`, `VehicleYear`, `VehicleVersion`).
  - `catalog/`: CRUD de categorías (`PartCategory`), repuestos (`Part`), números de parte (`PartNumber`) y compatibilidad (`PartCompatibility`).
  - `inventory/`: Gestión de stock/precios por sede, KPIs, plantilla CSV y carga masiva (`csv.util.ts` parser RFC 4180 sin dependencias externas).
  - `search/`: `MeilisearchService` y `SearchController` para indexación y consulta facetada.
  - `reservations/`: Flujo Click & Collect, validación de stock, expiración y códigos `RES-XXXX-CIU`.
  - `leads/`: Registro de leads WhatsApp, analítica de conversión y registro de búsquedas (`SearchQuery`).
  - `mail/`: `MailService` con Nodemailer y modo resiliente en consola.
  - `media/`: `MediaController`, `MediaService` e `image-upload.options.ts` para almacenamiento en `StoredImage`.
  - `common/`: Guards (`JwtAuthGuard`, `RolesGuard`) y decoradores (`@Roles`, `@CurrentUser`).

### Frontend (`frontend/app/`)
- `layout.tsx` y `globals.css`: Layout global y estilos Tailwind.
- `page.tsx`: Página principal / buscador unificado.
- `login/page.tsx`: Inicio de sesión y registro de compradores/almacenes.
- `search/page.tsx`: Resultados de búsqueda facetada con Meilisearch.
- `parts/[id]/page.tsx`: Detalle de repuesto, compatibilidad, preguntas, reserva Click & Collect y cotización WhatsApp.
- `compare/page.tsx`: Comparador lado a lado de repuestos.
- `stores/page.tsx`: Directorio de almacenes y sedes físicas.
- `dashboard/page.tsx`: Panel administrativo B2B para gestión de inventario, CSV, reservas y leads.

---

## 3. Modelo de Datos en Prisma (`backend/prisma/schema.prisma`)

El esquema relacional se organiza en cuatro bloques principales:

1. **Acceso y Multi-Sede:**
   - `User` ↔ `UserRole` ↔ `Role` (`RoleType`: `BUYER`, `STORE_ADMIN`, `PLATFORM_ADMIN`).
   - `Store` (1) → (N) `Location` (sedes físicas con ciudad, dirección, coordenadas y horario).
2. **Catálogo Maestro y Compatibilidad (ACES/PIES):**
   - `VehicleMake` → `VehicleModel` → `VehicleYear` → `VehicleVersion`.
   - `PartCategory` (árbol jerárquico) → `Part` → `PartNumber` (OEM/Aftermarket) y `PartCompatibility` (pivote con `VehicleVersion`).
3. **Inventario, Reservas y Leads:**
   - `Inventory` (clave única `[partId, locationId, condition]` con `price`, `stock`, `isAvailable`).
   - `Reservation` (`code` único, `status`: `PENDING | COMPLETED | CANCELLED | EXPIRED`, `expiresAt` a +48h).
   - `Lead` (`status`: `NEW | CONTACTED | CONVERTED | CANCELLED`), `SearchQuery` y `PartQuestion`.
4. **Persistencia de Media:**
   - `StoredImage` (`filename` único, `mimeType`, `data: Bytes`, `size`, `category`).

---

## 4. Flujo de Indexación y Búsqueda en Meilisearch

1. Al iniciar la aplicación (`OnModuleInit` en `MeilisearchService`), se crea/verifica el índice `parts` con `primaryKey: 'id'`.
2. Se configuran:
   - **Filterable:** `category`, `categorySlug`, `brand`, `makes`, `models`, `years`, `versions`, `conditions`, `minPrice`, `maxPrice`, `isAvailable`, `storeNames`, `locationCount`.
   - **Sortable:** `minPrice`, `maxPrice`, `totalStock`, `updatedAt`, `name`.
   - **Searchable (en orden de prioridad):** `name`, `partNumbers`, `brand`, `category`, `makes`, `models`, `storeNames`, `description`.
3. Cada cambio en catálogo (`CatalogService`), inventario o carga CSV (`InventoryService`), o actualización de reservas (`ReservationsService`) dispara la re-indexación del documento en Meilisearch para mantener consistencia inmediata.

---

## 5. Decisiones Técnicas Clave

- **PostgreSQL como almacenamiento de imágenes (`StoredImage`):** Evita la pérdida de archivos locales en contenedores efímeros y elimina dependencias de S3/Cloudinary (alineado con Non-Goals).
- **Parser CSV propio (`csv.util.ts`):** Implementa RFC 4180 con detección automática de delimitador `,` o `;` (compatibilidad con Excel en español) y limpieza de BOM UTF-8 sin librerías externas.
- **Docker Compose para servicios de estado:** Aísla PostgreSQL 16 (puerto `5433`) y Meilisearch v1.6 (puerto `7700`) con `healthcheck` para arranque reproducible en cualquier equipo del proyecto.

