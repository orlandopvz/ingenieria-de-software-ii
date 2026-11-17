# PostgreSQL y despliegue en Vercel

Estado de esta migración: el backend usa PostgreSQL mediante `pg` y acepta una URL remota. Se conservaron el contrato HTTP y las reglas de privacidad. Esta migración no crea recursos en Vercel ni transfiere datos a un proveedor.

## Conectar la base

1. Importa el repositorio de GitHub en Vercel y conecta una integración PostgreSQL desde Marketplace. Vercel documenta este flujo en https://vercel.com/docs/postgres y https://vercel.com/docs/marketplace-storage.
2. Configura `DATABASE_URL` en el proyecto que ejecute el backend. Usa la URL con pool para tráfico de la aplicación y un `DB_POOL_MAX` pequeño (5 por defecto). Respeta la configuración TLS del proveedor y no publiques la URL en GitHub ni en variables `VITE_*`.
3. Desde una máquina con acceso a la base, configura `DATABASE_URL` y ejecuta `npm run db:init` una vez. No uses el build de cada despliegue para reiniciar tablas ni cargar cuentas demo.
4. Para trasladar datos anteriores, configura un destino vacío y ejecuta `npm run db:migrate:sqlite -- --source <archivo.sqlite>` con las dependencias de desarrollo instaladas. El comando instala el esquema e importa las 11 tablas. Conserva el origen para recuperación.
5. Configura el resto de variables de `backend/.env.example` como secretos del backend. El frontend usa `/api` o `VITE_API_BASE_URL` si la API está en otro origen; en este caso ajusta también `CORS_ORIGIN`.

## Trabajo pendiente para alojar toda la aplicación en Vercel

El frontend Vite puede compilarse para Vercel. El backend actual aún usa archivos locales: imágenes públicas en `uploads/`, credenciales privadas en `storage/credentials/` y respaldos en `database/backups/`. Las funciones de Vercel no ofrecen almacenamiento local persistente para esos datos: https://vercel.com/docs/functions/runtimes.

Antes de desplegar el backend ahí se requiere almacenamiento de objetos persistente para esos archivos, acceso privado a credenciales exclusivamente mediante autorización administrativa, adaptación del punto de entrada de Express y sustitución del intervalo de mantenimiento por una tarea programada. Los respaldos de PostgreSQL deben ejecutarse donde exista `pg_dump` o delegarse al proveedor; `pg_restore` permite recuperarlos. No basta con cambiar las rutas locales a `/tmp`.

La alternativa que conserva el manejo actual de archivos es alojar el frontend en Vercel y el backend en un servidor con disco persistente, conectado a PostgreSQL externo.
