# Auditoría de Seguridad y Guía de Pruebas del Backend

**Proyecto:** `Proyecto-repuestos` (AutoPart Pro)  
**Responsable:** Líder de Arquitectura, SDD y Validación Backend  
**Relacionado con:** [constitution.md](../.specify/memory/constitution.md) | [spec.md](../.specify/specs/001-proyecto-repuestos/spec.md)

---

## 1. Auditoría de Seguridad y Variables de Entorno

### 1.1 Revisión de `.gitignore`
Se verificó el archivo `.gitignore` en la raíz del repositorio:
- ✅ Bloquea `.env`, `.env*.local`, `.env.development`, `.env.production`, `.env.staging` y `*.env`.
- ✅ Bloquea `node_modules/`, `dist/`, `build/`, `.next/`, `coverage/` y archivos `*.sqlite`, `*.db`.
- ✅ Verificación con `git ls-files "*env*"`: únicamente `backend/.env.example` está versionado; **cero archivos `.env` con secretos reales** en el historial o índice de Git.

### 1.2 Revisión y Actualización de `backend/.env.example`
Al contrastar `backend/.env.example` contra los usos reales de `process.env` y `ConfigService` en `backend/src/`:
- **Variables ya presentes (sin valores reales):** `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `PORT`, `NODE_ENV`.
- **Variables faltantes detectadas y agregadas en esta auditoría:**
  - `FRONTEND_URL` (usada en `backend/src/main.ts` para CORS)
  - `API_PUBLIC_URL` (usada en `backend/src/media/media.service.ts` para construir URLs públicas de imágenes)
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (usadas en `backend/src/mail/mail.service.ts`)
- ✅ Todas las variables en `backend/.env.example` contienen únicamente placeholders seguros.

---

## 2. Preparación del Entorno de Pruebas Local

```bash
# 1. Levantar PostgreSQL (puerto 5433) y Meilisearch (puerto 7700)
docker compose up -d

# 2. Configurar variables de entorno locales (no versionadas)
cp backend/.env.example backend/.env

# 3. Instalar dependencias, generar cliente Prisma, migrar y poblar datos iniciales
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run prisma:seed

# 4. Iniciar servidor NestJS en desarrollo (http://localhost:3001/api)
npm run start:dev
```

Documentación interactiva disponible en: `http://localhost:3001/api/docs`

---

## 3. Casos de Prueba del Backend (Exitosos y Fallidos)

### 3.1 Autenticación y Control de Acceso (`/api/auth`)

| ID | Caso de Prueba | Método y Endpoint | Payload / Headers | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-01** | Registro exitoso de comprador | `POST /api/auth/register` | `{ "email": "comprador1@test.co", "password": "Password123", "firstName": "Ana", "lastName": "López" }` | **`201 Created`**: Retorna `{ accessToken, user }` con rol `BUYER`. |
| **AUTH-02** | Login exitoso de usuario activo | `POST /api/auth/login` | `{ "email": "comprador1@test.co", "password": "Password123" }` | **`200 OK`**: Retorna `{ accessToken, user }`. |
| **AUTH-03** | Registro con correo duplicado | `POST /api/auth/register` | Mismo email ya registrado | **`401 Unauthorized`**: `"El email ya está registrado"`. |
| **AUTH-04** | Login con contraseña incorrecta | `POST /api/auth/login` | `{ "email": "comprador1@test.co", "password": "WrongPassword" }` | **`401 Unauthorized`**: `"Credenciales inválidas"`. |
| **AUTH-05** | Validación DTO (contraseña < 6 caracteres o campo extra) | `POST /api/auth/login` | `{ "email": "no-email", "password": "123", "extra": true }` | **`400 Bad Request`**: Rechazado por `ValidationPipe` (`whitelist` + `forbidNonWhitelisted`). |

---

### 3.2 Inventario Multi-Sede y Carga Masiva CSV (`/api/inventory`)

| ID | Caso de Prueba | Método y Endpoint | Payload / Headers | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **INV-01** | Descarga de plantilla CSV oficial | `GET /api/inventory/template` | `Authorization: Bearer <TOKEN_STORE_ADMIN>` | **`200 OK`**: `Content-Type: text/csv; charset=utf-8` con plantilla descargable. |
| **INV-02** | Carga masiva CSV válida (modo `dryRun=true` o real) | `POST /api/inventory/bulk-upload?dryRun=true` | `Authorization: Bearer <TOKEN_STORE_ADMIN>` + `multipart/form-data` (`file`) o `{ "csvContent": "..." }` | **`201 Created`**: Procesa filas y retorna resumen de registros válidos/actualizados. |
| **INV-03** | Acceso a inventario sin token JWT | `GET /api/inventory` | Sin header `Authorization` | **`401 Unauthorized`**: Bloqueado por `JwtAuthGuard`. |
| **INV-04** | Acceso a inventario con rol `BUYER` | `GET /api/inventory` | `Authorization: Bearer <TOKEN_BUYER>` | **`403 Forbidden`**: `"No tienes el rol necesario para esta acción"` (`RolesGuard`). |
| **INV-05** | Carga masiva sin archivo ni `csvContent` | `POST /api/inventory/bulk-upload` | `Authorization: Bearer <TOKEN_STORE_ADMIN>`, body vacío `{}` | **`400 Bad Request`**: `"Debes enviar un archivo CSV en el campo \"file\" o texto en \"csvContent\""`. |

---

### 3.3 Reservas Click & Collect (`/api/reservations`)

| ID | Caso de Prueba | Método y Endpoint | Payload / Headers | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **RES-01** | Creación exitosa de reserva con stock disponible | `POST /api/reservations` | `{ "partId": "<UUID_VALIDO>", "locationId": "<UUID_SEDE>", "customerName": "Carlos Gómez", "customerPhone": "3001234567", "quantity": 1 }` | **`201 Created`**: Retorna reserva en estado `PENDING` con código `RES-XXXX-CIU`, expiración a 48h y `Lead` asociado. |
| **RES-02** | Consulta pública de comprobante por código | `GET /api/reservations/code/RES-XXXX-CIU` | Público | **`200 OK`**: Retorna detalle de la reserva, repuesto y sede. |
| **RES-03** | Reserva fallida por stock insuficiente | `POST /api/reservations` | `{ "partId": "<UUID_VALIDO>", "locationId": "<UUID_SEDE>", "customerName": "Carlos Gómez", "customerPhone": "3001234567", "quantity": 9999 }` | **`400 Bad Request`**: `"Existencias insuficientes en la sede <Nombre>. Stock disponible: X unidades."`. |
| **RES-04** | Reserva fallida por repuesto o sede inexistente | `POST /api/reservations` | `partId` o `locationId` inexistente | **`404 Not Found`**: `"El repuesto seleccionado no existe"` o `"La sede física seleccionada no existe"`. |
| **RES-05** | Gestión de reservas sin token | `PATCH /api/reservations/<ID>/status` | Sin header `Authorization` | **`401 Unauthorized`**: Bloqueado por `JwtAuthGuard`. |

---

### 3.4 Validación de Carga de Imágenes (`IMAGE_MULTER_OPTIONS`)

| ID | Caso de Prueba | Método y Endpoint | Payload / Headers | Resultado Esperado |
| :--- | :--- | :--- | :--- | :--- |
| **MED-01** | Consulta de imagen existente en BD | `GET /api/media/<filename>` | Público | **`200 OK`**: Retorna binario con `Content-Type` de imagen y `Cache-Control: immutable`. |
| **MED-02** | Archivo con extensión/MIME no permitido (ej. `.exe` o `.pdf`) | Endpoint de carga con `IMAGE_MULTER_OPTIONS` | Archivo `application/pdf` o `.txt` | **`400 Bad Request`**: `"Solo se admiten formatos de imagen válidos (JPG, PNG, WEBP, GIF, AVIF)"`. |
| **MED-03** | Consulta de imagen inexistente | `GET /api/media/no-existe.png` | Público | **`404 Not Found`**: `"Imagen no encontrada"`. |

