# Especificación Funcional — 001: Plataforma de Repuestos Automotrices (`Proyecto-repuestos`)

**Versión:** 1.0.0  
**Estado:** Aprobada para validación del Backend y SDD  
**Relacionado con:** [constitution.md](../../memory/constitution.md) | [plan.md](./plan.md)

---

## 1. Propósito y Alcance

Construir una plataforma web B2C/B2B para la búsqueda, comparación, cotización y reserva de repuestos automotrices con retiro en sede física (**Click & Collect**), conectando compradores con almacenes y bodegas multi-sede.

---

## 2. Perfiles de Usuario

| Perfil | Rol en Sistema (`RoleType`) | Capacidades Principales |
| :--- | :--- | :--- |
| **Cliente / Público** | Visitante anónimo o `BUYER` | Buscar repuestos por texto o vehículo, filtrar por categoría/marca/precio/disponibilidad, comparar repuestos, consultar sedes, realizar reservas Click & Collect y enviar leads/preguntas. |
| **Administrador de Almacén** | `STORE_ADMIN` | Gestionar su almacén (`Store`) y sedes (`Location`), administrar catálogo e inventario propio, ejecutar carga masiva CSV, atender reservas en mostrador y gestionar leads recibidos. |
| **Administrador de Plataforma** | `PLATFORM_ADMIN` | Acceso global multi-almacén para supervisión de catálogo, usuarios, sedes, inventario, leads y métricas de búsqueda. |

---

## 3. Requisitos Funcionales y Criterios de Aceptación

### RF-01: Autenticación, Registro y Recuperación de Contraseña (`auth`, `users`)
- **Descripción:** Registro de compradores (`BUYER`) y administradores de almacén (`STORE_ADMIN` con creación automática de `Store` y `Location`), inicio de sesión con JWT y recuperación mediante código OTP por correo.
- **Criterios de Aceptación:**
  - `POST /api/auth/register` crea el usuario con contraseña hasheada (`bcrypt`), asigna rol y retorna `{ accessToken, user }` con estado `201`. Si el correo ya existe, retorna `401`.
  - `POST /api/auth/login` valida credenciales activas y retorna `{ accessToken, user }` con estado `200`; credenciales inválidas retornan `401`.
  - Endpoints protegidos rechazan peticiones sin token (`401`) o sin el rol requerido (`403`).

### RF-02: Catálogo Maestro y Compatibilidad Vehicular (`catalog`, `vehicles`)
- **Descripción:** Gestión de categorías anidadas (`PartCategory`), repuestos (`Part`), números de parte OEM/Aftermarket (`PartNumber`) y matriz de compatibilidad vehicular jerárquica (`VehicleMake` → `VehicleModel` → `VehicleYear` → `VehicleVersion` vía `PartCompatibility`).
- **Criterios de Aceptación:**
  - El usuario puede consultar marcas, modelos, años y versiones compatibles para filtrar repuestos exactos para su vehículo.
  - Cada repuesto expone sus referencias OEM/Aftermarket, marca, garantía, imágenes y compatibilidades.

### RF-03: Búsqueda Avanzada en Meilisearch (`search`)
- **Descripción:** Motor de búsqueda tolerante a errores tipográficos con filtros facetados y ordenamiento sobre el índice `parts`.
- **Criterios de Aceptación:**
  - `GET /api/search` permite buscar por nombre, número de parte, marca, categoría, vehículo (`makes`, `models`, `years`, `versions`), condición (`NEW`, `USED`, `REFURBISHED`), rango de precios (`minPrice`, `maxPrice`) y disponibilidad (`isAvailable`).
  - Los resultados soportan ordenamiento por `minPrice`, `maxPrice`, `totalStock`, `updatedAt` y `name`.

### RF-04: Inventario Multi-Sede y Carga Masiva CSV (`inventory`, `locations`)
- **Descripción:** Administración de stock y precio por sede (`Location`) y condición (`PartCondition`), incluyendo importación masiva mediante archivo CSV (con soporte para delimitadores `,` y `;` y modo `dryRun`).
- **Criterios de Aceptación:**
  - `GET /api/inventory/template` descarga la plantilla CSV oficial.
  - `POST /api/inventory/bulk-upload` procesa archivos CSV (`file` multipart o `csvContent` JSON) validando columnas y actualizando/creando inventario en las sedes del almacén autenticado.
  - Si no se envía ni `file` ni `csvContent`, el endpoint responde `400 Bad Request`.
  - Solo usuarios con rol `STORE_ADMIN` o `PLATFORM_ADMIN` pueden consultar o modificar inventario (`403` para `BUYER`).

### RF-05: Reservas Click & Collect (`reservations`)
- **Descripción:** Reserva de repuestos para retiro presencial en una sede específica con generación de código único (`RES-XXXX-CIU`) y vigencia de 48 horas.
- **Criterios de Aceptación:**
  - `POST /api/reservations` crea una reserva en estado `PENDING`, genera automáticamente un `Lead` asociado en estado `CONTACTED` dentro de una transacción y retorna el comprobante con código único.
  - `GET /api/reservations/code/:code` permite consultar el estado y detalle de una reserva pública por su código.
  - `PATCH /api/reservations/:id/status` permite al almacén marcar la reserva como `COMPLETED`, `CANCELLED` o `EXPIRED`.

### RF-06: Leads Comerciales y Notificaciones por Correo (`leads`, `mail`)
- **Descripción:** Registro de intención de compra ("Cotizar por WhatsApp") y envío de correos transaccionales (bienvenida, recuperación OTP).
- **Criterios de Aceptación:**
  - `POST /api/leads` registra el lead asociado a un repuesto y almacén.
  - `GET /api/leads` y `GET /api/leads/stats` entregan al `STORE_ADMIN` sus leads y KPIs de conversión.
  - `MailService` envía correos vía SMTP cuando `SMTP_USER` y `SMTP_PASS` están configurados, o registra el mensaje en consola sin fallar en entorno local.

### RF-07: Carga y Servicio Persistente de Imágenes (`media`)
- **Descripción:** Almacenamiento de imágenes de repuestos y almacenes directamente en PostgreSQL (`StoredImage`) y exposición vía HTTP cacheable.
- **Criterios de Aceptación:**
  - `GET /api/media/:filename` sirve la imagen con `Content-Type`, `Cache-Control: public, max-age=31536000, immutable` y `200 OK`, o `404 Not Found` si no existe.

---

## 4. Reglas de Negocio Estrictas

1. **Validación de Stock Antes de Reservar:**
   - Antes de crear una reserva en `ReservationsService.createReservation`, el sistema **debe** verificar que exista un registro en `Inventory` para `(partId, locationId)` con `isAvailable: true` y `stock >= quantity`.
   - Si no existe inventario o `stock < quantity`, la operación debe abortarse con `400 Bad Request` indicando el stock disponible real.
2. **Sincronización Prisma ↔ Meilisearch:**
   - Toda operación que cree, actualice o elimine un repuesto, su inventario o cambie disponibilidad/stock (desde `CatalogService`, `InventoryService` o `ReservationsService`) debe invocar la sincronización hacia el índice `parts` de Meilisearch para evitar desfase entre búsqueda y stock real.
3. **Validación Estricta de Imágenes:**
   - `IMAGE_MULTER_OPTIONS` acepta únicamente formatos de imagen válidos (`JPG`, `JPEG`, `JFIF`, `PNG`, `WEBP`, `GIF`, `AVIF`, `BMP`, `HEIC`, `HEIF`) y un tamaño máximo de **15 MB**. Cualquier otro tipo de archivo es rechazado con `400 Bad Request`.
4. **Aislamiento Multi-Almacén:**
   - Un `STORE_ADMIN` solo puede consultar y modificar inventario, sedes, leads y reservas pertenecientes a su propio `storeId`.

---

## 5. Non-Goals (Fuera de Alcance)

Para mantener el foco del MVP y cumplir con el alcance académico definido, **NO se construirá** en esta versión:

- ❌ **Pasarelas de pagos en línea** (PSE, tarjetas de crédito/débito, Wompi, PayU, Stripe). El pago se realiza presencialmente al retirar en sede.
- ❌ **Facturación electrónica DIAN** ni integración contable/ERP externa.
- ❌ **Aplicación móvil nativa** (Android / iOS). La interfaz es exclusivamente web responsiva en Next.js.
- ❌ **Almacenamiento de objetos en nube externa** (AWS S3, Cloudinary, Google Cloud Storage). Las imágenes se persisten en PostgreSQL (`StoredImage`).

