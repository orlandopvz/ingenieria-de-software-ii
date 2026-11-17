# Desplegar el monorepo con Vercel Services

La raíz del repositorio contiene `vercel.json`: un único proyecto Vercel, un dominio y dos servicios. El propietario confirmó los nombres, la exposición y la ausencia de bindings el 2026-11-16.

## Servicios y rutas

| Servicio | Directorio | Framework / entrada | Exposición propuesta |
| --- | --- | --- | --- |
| `backend` | `backend` | Express, `src/index.js` | `/api`, `/api/*`, `/uploads` y `/uploads/*` |
| `frontend` | `frontend` | Vite, build `npm run build`, salida `dist` | El resto de rutas del dominio |

Las reglas específicas preceden al catch-all. Vercel conserva el prefijo original: `/api/catalogs` llega al router Express `/api/catalogs`. El fallback dentro del servicio frontend entrega `index.html` para rutas como `/panel/catalogo`, sin enviar `/api` al frontend. Fuente: https://vercel.com/docs/services/routing.

Ambos servicios tienen rutas públicas. Las rutas protegidas de la API siguen exigiendo JWT y rol; las credenciales solo pueden descargarse mediante `/api/admin/requests/:userId/credential`. No se publica ningún directorio `storage/` ni `credentials/`.

## Por qué no hay bindings

El cliente React en `frontend/src/services/api.js` llama a `/api` desde el navegador. El frontend Vite no tiene funciones de servidor que llamen a Express, y Express no llama al frontend. Por ello no hay una relación servidor a servidor que enlazar: no se añade un binding ficticio ni se configura una URL interna `VITE_*`.

Los bindings solo se resuelven en funciones durante la ejecución; no durante el build, en middleware ni en el navegador. Si se añade una función llamadora en el futuro, declara sus cuatro campos (`type`, `service`, `format`, `env`) en el servicio llamador y usa la variable inyectada por Vercel. No asignes esa variable manualmente. Fuente: https://vercel.com/docs/services/bindings.

El proxy a `localhost:4000` en `frontend/vite.config.js` se usa únicamente en el modo local `npm run dev`. El bundle de producción utiliza `/api` y no incluye ese hostname.

## Pasos en la pantalla de importación

1. Mantén **Root Directory** en `./` y **Application Preset** en **Services**.
2. Después de confirmar la propuesta y subir el commit a GitHub, pulsa **Refresh** para que Vercel lea `vercel.json`.
3. Conecta una base PostgreSQL desde Marketplace y configura las variables de la tabla siguiente para los entornos que quieras desplegar. No reutilices una base de producción con datos reales en previews de prueba.
4. Inicializa el esquema antes de usar la aplicación. Con `DATABASE_URL` apuntando al destino correcto, ejecuta `npm run db:init` desde una máquina con acceso. No ejecutes `db:reset` en el build de Vercel.
5. Importa el proyecto y comprueba `/api/health`, `/api/catalogs`, `/` y una ruta profunda como `/login`. Una URL desconocida bajo `/api/` debe devolver el error JSON del backend, no HTML de React.

## Variables de entorno

| Variable | Configuración |
| --- | --- |
| `DATABASE_URL` | URL PostgreSQL del proveedor; requerida explícitamente en Vercel. Respeta TLS y usa la conexión con pool para tráfico de la API. |
| `JWT_SECRET` | Secreto aleatorio de al menos 32 caracteres. |
| `REPORT_IP_SALT` | Secreto aleatorio de al menos 16 caracteres. |
| `CORS_ORIGIN` | Opcional para un dominio personalizado. Los dominios de `VERCEL_URL` y `VERCEL_PROJECT_PRODUCTION_URL` se aceptan automáticamente. |
| `DB_POOL_MAX` | Opcional, `5` por defecto. |
| `JWT_EXPIRES_IN` | Opcional, `7d` por defecto. |
| `ALLOWED_EMAIL_DOMAINS` | Opcional, `unison.mx` por defecto. |
| `NODE_ENV` | Vercel configura el entorno de producción; no importes `development` del `.env` local. |

Las otras variables no secretas mantienen los valores de `backend/.env.example` como predeterminados. No copies `DATABASE_URL`, `JWT_SECRET` o `REPORT_IP_SALT` a ninguna variable `VITE_*`. Deja `VITE_API_BASE_URL` sin definir para usar `/api` en este despliegue de un dominio. `VERCEL`, `VERCEL_URL` y `VERCEL_PROJECT_PRODUCTION_URL` los proporciona la plataforma; no son bindings que debas crear.

Para traer los datos SQLite anteriores a un destino vacío, instala las dependencias de desarrollo y ejecuta `npm run db:migrate:sqlite -- --source <archivo.sqlite>`. La importación conserva IDs, fechas, referencias y secuencias y no modifica el origen. Los archivos requieren transferencia aparte.

## Entrada Express y límites pendientes

`backend/src/index.js` exporta la aplicación sin abrir un puerto ni importar `server.js`. No crea carpetas, conecta a PostgreSQL ni ejecuta semillas o mantenimiento durante la importación. El servidor local conserva `npm run dev`. Fuente: https://vercel.com/docs/frameworks/backend/express.

Esta entrega configura los servicios y permite arrancar la API; no completa el almacenamiento de archivos. Quedan pendientes:

- Elegir almacenamiento persistente para imágenes públicas y credenciales privadas. Las subidas en Vercel responden `409 CONFLICT` antes de escribir archivos; por tanto el registro con credencial y la creación de productos con imagen aún no están habilitados allí. No se usa `/tmp` como almacenamiento permanente.
- Implementar la lectura de imágenes del proveedor elegido. La regla `/uploads` reserva el prefijo para el backend; `express.static()` no sirve imágenes en Vercel. No traslades credenciales al directorio `public/` como solución.
- Crear respaldos donde exista `pg_dump`, o mediante el proveedor. El botón de respaldo local responde `409 CONFLICT` en Vercel; los respaldos anteriores `.dump` siguen siendo restaurables con `pg_restore` fuera de la función.
- Programar el mantenimiento con una tarea autenticada. No se inicia el intervalo residente de `server.js` dentro de la función Vercel. El endpoint manual administrativo se conserva.

Estas decisiones necesitan un proveedor concreto y no se presuponen en `vercel.json`. Las restricciones del filesystem están documentadas en https://vercel.com/docs/functions/runtimes.

## Verificación local

Ejecuta `vercel dev` desde la raíz para probar el enrutamiento integrado con una cuenta y un proyecto Vercel vinculados. Para probar sin vinculación de cuenta, `npm run dev` conserva los dos servidores y el proxy local, pero no emula Vercel Services.

Verificación realizada el 2026-11-16: `vercel.json` validado contra el esquema oficial descargado de https://openapi.vercel.sh/vercel.json; 65 pruebas backend y 3 frontend aprobadas, compilación y ESLint correctos. Se intentó `vercel dev` con CLI 65.16.0, pero la CLI requirió iniciar sesión y se canceló el flujo. No se creó un proyecto, no se desplegó y no se verificó el enrutamiento real de Vercel. El esquema publicado mezcla restricciones de distintos borradores de JSON Schema: se desactivó la autovalidación del esquema en Ajv, manteniendo la validación de la configuración contra sus propiedades.
