# EmprendeBúho

Plataforma para descubrir emprendimientos de la comunidad de la Universidad de Sonora, campus Hermosillo. Permite consultar negocios y productos, contactar directamente a sus responsables y administrar perfiles, solicitudes y reportes. No incluye pagos, carritos ni logística de entregas.

Los importes se expresan en pesos mexicanos (MXN) y los horarios se calculan con la zona `America/Hermosillo`.

## Tecnologías y estado actual

Monorepo JavaScript con npm workspaces (`backend` y `frontend`):

- **Backend:** Node.js, Express 5 y PostgreSQL 16+ mediante `pg`, sin ORM. Autenticación JWT, contraseñas con `bcryptjs`, validación con Zod y archivos con Multer.
- **Frontend:** React 19, React Router 7, Vite, Tailwind CSS 4 mediante `@tailwindcss/vite` e iconos de Lucide.
- **Pruebas:** ejecutor integrado `node --test` y Supertest.

El prototipo integra el directorio público, autenticación, panel del emprendedor y panel administrativo. Las rutas públicas incluyen búsqueda, filtros, favoritos y perfiles; los paneles permiten gestionar negocios, solicitudes, moderación y mantenimiento. Consulta [la verificación F4](docs/verificacion-f4.md) para distinguir las pruebas ejecutadas de las comprobaciones pendientes.

La SPA consume `/api` mediante el cliente `fetch`. El backend separa rutas, controladores, servicios y repositorios con SQL preparado. Las operaciones relacionadas se realizan en transacciones PostgreSQL; cada mutación administrativa registra auditoría. Los JWT se verifican contra `token_version`, lo que permite revocarlos inmediatamente. Las credenciales estudiantiles permanecen fuera de los archivos públicos y la ubicación solo se publica cuando su propietario lo permite.

## Requisitos previos

- Node.js **22.x o 24.x**, conforme a `backend/package.json`.
- npm **10 o superior** con soporte de workspaces.
- Git, si se clonará el repositorio.

Comprueba las versiones en la terminal:

```sh
node --version
npm --version
```

Se requiere un servidor PostgreSQL local o administrado y una base vacía creada previamente. Para respaldos administrativos instala `pg_dump` y `pg_restore` de la misma versión mayor del servidor o una compatible y agrégalos al PATH.

## Instalación desde cero

Clona el fork y entra en la raíz, donde se encuentra el `package.json` que declara los workspaces:

```sh
git clone https://github.com/orlandopvz/ingenieria-de-software-ii.git
cd ingenieria-de-software-ii
npm install
```

Una sola instalación en la raíz instala las dependencias de ambos workspaces. No es necesario instalar Vite o nodemon globalmente.

`better-sqlite3` es una dependencia de desarrollo utilizada solo por la importación de bases anteriores y sus pruebas; el backend de producción usa `pg` y puede instalarse con `npm ci --omit=dev`.

### Variables de entorno

En una instalación nueva, copia la plantilla del backend. Desde la raíz, en PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

En Bash, el equivalente es:

```sh
cp backend/.env.example backend/.env
```

Si `backend/.env` ya existe, conserva su configuración en lugar de sobrescribirlo. Edita ese archivo antes de iniciar el servidor. Está ignorado por Git; la plantilla `.env.example` sí se versiona.

| Variable | Valor de la plantilla | Uso |
| --- | --- | --- |
| `PORT` | `4000` | Puerto HTTP del backend. |
| `NODE_ENV` | `development` | Entorno: `development`, `test` o `production`. |
| `CORS_ORIGIN` | `http://localhost:5173` | Origen permitido para el frontend. |
| `JWT_SECRET` | `cambia_esto_por_una_cadena_larga_y_aleatoria` | Sustituir por un secreto aleatorio de al menos 32 caracteres. |
| `JWT_EXPIRES_IN` | `7d` | Vigencia del token; número seguido de `s`, `m`, `h` o `d`. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/emprendebuho` | URL de conexión PostgreSQL; configura TLS según tu proveedor. |
| `DB_POOL_MAX` | `5` | Máximo de conexiones por proceso. |
| `TEST_DATABASE_URL` | Sin valor predeterminado | Base de pruebas con permiso para crear esquemas. |
| `UPLOAD_DIR` | `./uploads` | Imágenes públicas. |
| `STORAGE_DIR` | `./storage` | Almacenamiento privado, incluidas credenciales. |
| `BACKUP_DIR` | `./database/backups` | Respaldos PostgreSQL `.dump`. |
| `BACKUP_KEEP` | `10` | Cantidad de respaldos que se conservan. |
| `ALLOWED_EMAIL_DOMAINS` | `unison.mx` | Dominios institucionales permitidos, separados por comas. |
| `INACTIVITY_DAYS_LIMIT` | `30` | Límite de días para el tratamiento de inactividad. |
| `MAINTENANCE_INTERVAL_HOURS` | `12` | Intervalo del mantenimiento programado. |
| `REPORT_IP_SALT` | `cambia_esto_tambien` | Sustituir por un valor aleatorio de al menos 16 caracteres para el hash de IP de reportes. |

Las rutas relativas se resuelven desde `backend/`. El directorio público de archivos no debe solaparse con la base de datos, los respaldos ni el almacenamiento privado. Nunca publiques los secretos ni copies las credenciales estudiantiles a `uploads/`.

El frontend funciona sin un archivo de entorno adicional: su cliente utiliza `/api`. La variable opcional existente `VITE_API_BASE_URL` permite cambiar esa base, pero no es necesaria con el proxy local. Cualquier variable `VITE_*` utilizada por el cliente es pública y no debe contener secretos.

### Inicializar PostgreSQL y las semillas

Configura DATABASE_URL en backend/.env. La base debe existir; por ejemplo, en una instalación local: `createdb -U postgres emprendebuho`. Para crear tablas sin cuentas demo:

```sh
npm run db:init
```

En desarrollo puedes cargar explícitamente 8 categorías, 9 zonas, 5 usuarios, 4 negocios y 9 productos con `npm run db:seed`. El arranque normal no modifica el esquema ni carga cuentas demo. `npm run db:reset -- --confirm-reset` reinicia tablas y secuencias en desarrollo; conserva archivos y está bloqueado en producción.

### Importar una base SQLite existente

Detén las escrituras en el backend anterior y conserva una copia de la base y sus archivos. Apunta DATABASE_URL a un destino PostgreSQL vacío y ejecuta desde la raíz:

```sh
npm run db:migrate:sqlite -- --source C:/ruta/emprendebuho.sqlite
```

El comando importa las 11 tablas en una transacción, conserva IDs, fechas UTC, referencias y secuencias. Comprueba integridad del origen, rechaza un destino con datos y abre SQLite en modo de solo lectura. No traslada archivos: conserva uploads/ y storage/ con las mismas rutas. Si falla una restricción, se revierte la carga completa; no reinicies ni borres el origen. Las diferencias de unicidad Unicode pueden requerir corregir datos duplicados antes de importar. Para volver al sistema anterior conserva el archivo original y la versión anterior del código.

Los respaldos administrativos ahora son archivos `.dump`, restaurables con `pg_restore --dbname <destino_vacio> --no-owner --no-acl <archivo.dump>`. Los uploads y las credenciales necesitan respaldo por separado. En Vercel aún falta adaptar los archivos y tareas periódicas a servicios persistentes; esta migración no realiza un despliegue.

### Pruebas con PostgreSQL

Configura `TEST_DATABASE_URL` con una base dedicada a pruebas. Cada fixture crea y elimina su propio esquema, sin truncar tablas de otros esquemas. En PowerShell:

```powershell
$env:TEST_DATABASE_URL='postgresql://postgres:postgres@localhost:5432/emprendebuho_test'
npm test
```

### Cuentas locales de demostración

Estas cuentas y contraseñas son datos públicos de demostración generados por las semillas, no credenciales reales. Se utilizan desde `/login` y no deben reutilizarse en producción ni en cuentas personales.

| Correo | Contraseña | Rol / estado |
| --- | --- | --- |
| `admin@unison.mx` | `AdminUnison2026!` | Administrador, aprobada. |
| `fernanda.demo@unison.mx` | `Buho2026!` | Emprendedor, aprobada. |
| `orlando.demo@unison.mx` | `Buho2026!` | Emprendedor, aprobada. |
| `nuevo.emprendedor@unison.mx` | `Buho2026!` | Emprendedor, pendiente. |
| `rechazado.demo@unison.mx` | `Buho2026!` | Emprendedor, rechazada. |

Los estados pendiente y rechazada tienen restricciones de acceso; no equivalen a una cuenta aprobada.

## Iniciar desde VS Code

Abre la carpeta raíz del repositorio en VS Code y selecciona **Terminal → Nueva terminal**. Después de configurar el entorno y la base, ejecuta:

```sh
npm run dev
```

Este script inicia backend y frontend en paralelo. Mantén la terminal abierta y utiliza `Ctrl+C` para detenerlos.

| Servicio | Dirección predeterminada |
| --- | --- |
| Aplicación React | http://localhost:5173 |
| API Express | http://localhost:4000/api |
| Comprobación del backend | http://localhost:4000/api/health |

El endpoint de salud devuelve un sobre JSON con `ok: true` y `data.estado: "disponible"` cuando el servidor está disponible.

Para iniciar cada servicio por separado, abre dos terminales en la raíz:

**Terminal del backend, con recarga mediante nodemon:**

```sh
npm run dev -w backend
```

**Terminal del frontend:**

```sh
npm run dev -w frontend
```

El backend también tiene un inicio sin recarga automática:

```sh
npm run start -w backend
```

No ejecutes simultáneamente dos instancias del backend en el mismo puerto.

Vite redirige `/api` y `/uploads` a `http://localhost:4000`, según `frontend/vite.config.js`. Usa `localhost` para mantener el origen configurado en CORS. Si cambias el puerto del backend, también debes ajustar el destino del proxy; cambiar solo `PORT` no actualiza Vite.

## Pruebas, compilación y scripts

Los siguientes comandos se ejecutan desde la raíz y corresponden a scripts existentes:

| Comando | Resultado |
| --- | --- |
| `npm run dev` | Inicia ambos servicios en desarrollo. |
| `npm test` | Ejecuta todas las pruebas del backend y las pruebas de integración del cliente y configuración de lint del frontend. |
| `npm run test:e2e` | Ejecuta los recorridos de los tres roles en Chromium sin ventana, con esquemas PostgreSQL y archivos temporales. |
| `npm run build` | Compila el frontend con Vite en `frontend/dist/`. |
| `npm run lint` | Ejecuta ESLint sobre `frontend/src`, incluidos archivos JSX. |
| `npm run db:reset` | Reinicia PostgreSQL en desarrollo con `--confirm-reset`; conserva archivos. |
| `npm run preview -w frontend` | Inicia la vista previa del bundle ya compilado; consulta la URL que imprime Vite. |

También puedes ejecutar `npm test` desde `backend/` o `frontend/`, y `npm run build` desde `frontend/`. Las pruebas usan el helper de bases temporales en `backend/tests/helpers/testApp.js`; no necesitan restablecer tu base de datos local.

La suite E2E detecta Edge o Chrome en las rutas habituales de Windows y Chromium/Chrome en Linux o macOS. Requiere que el navegador ya esté instalado y usa el protocolo CDP mediante el `WebSocket` de Node.js. Para indicar otra ubicación:

```sh
npm run test:e2e -w frontend -- --browser "C:/ruta/al/navegador.exe"
```

La suite inicia sus propios servicios en puertos disponibles, carga semillas en un esquema PostgreSQL temporal y cierra los servicios al terminar. Las capturas y la descarga de prueba quedan en la carpeta temporal que imprime. Las operaciones administrativas de estas pruebas afectan únicamente esos datos de demostración.

La compilación genera los archivos del frontend; no inicia el backend. El servidor Express actual no publica automáticamente `frontend/dist/`. La vista previa de Vite tampoco sustituye una configuración de despliegue de ambos servicios.

`frontend/eslint.config.js` configura las comprobaciones de errores, variables no definidas y variables sin uso. Una regla local reconoce los componentes utilizados en JSX; no requiere paquetes adicionales de lint.

## Rutas principales

| Acceso | Rutas |
| --- | --- |
| Público | `/`, `/explorar`, `/negocio/:slug`, `/favoritos` |
| Autenticación y estado | `/login`, `/registro`, `/estado-solicitud`, `/estado-cuenta`, `/recuperar-password`, `/restablecer-password` |
| Emprendedor aprobado | `/panel`, `/panel/perfil`, `/panel/catalogo`, `/panel/horarios`, `/panel/vista-previa`, `/panel/notificaciones`, `/panel/cuenta` |
| Administrador | `/admin`, `/admin/solicitudes`, `/admin/reportes`, `/admin/categorias`, `/admin/moderacion`, `/admin/mantenimiento` |

Los favoritos son públicos y se guardan en el navegador. Los paneles verifican sesión y rol; el backend vuelve a comprobar los permisos en cada petición. Las acciones de mantenimiento requieren confirmación.

## Estructura del repositorio

```text
ingenieria-de-software-ii/
├── AGENTS.md
├── README.md
├── package.json                 # Scripts comunes y workspaces
├── package-lock.json
├── especificacion_tecnica_emprendebuho.md
├── docs/                        # Arquitectura, datos, fases y decisiones
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   ├── schema.sql           # DDL oficial
│   │   ├── seed.js
│   │   └── backups/
│   ├── uploads/                 # profiles/, menus/, products/: públicos
│   ├── storage/credentials/     # Credenciales estudiantiles privadas
│   ├── src/
│   │   ├── config/
│   │   ├── middlewares/
│   │   ├── validators/
│   │   ├── repositories/
│   │   ├── services/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   └── tests/                   # Integración y helpers
└── frontend/
    ├── package.json
    ├── eslint.config.js
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── styles/
        ├── context/
        ├── hooks/
        ├── utils/
        ├── services/api.js
        ├── pages/               # public/, auth/, entrepreneur/, admin/
        └── components/
            ├── common/
            ├── layout/
            └── routing/
```

Las pruebas del cliente y los recorridos de navegador están en `frontend/tests/`.

Las dependencias, los bundles, los archivos `.env`, las bases locales, los respaldos y los archivos subidos están ignorados por Git. Las plantillas `.env.example` y los archivos `.gitkeep` se conservan.

## Solución de errores comunes

| Problema | Revisión o solución |
| --- | --- |
| `Missing script` o workspace no encontrado | Comprueba que la terminal está en la raíz con el `package.json` que declara `backend` y `frontend`. Usa los comandos de este README. No existe un script `start` en la raíz. |
| No se encuentra Vite, nodemon o un módulo | Ejecuta `npm install` desde la raíz con Node.js 22.x o 24.x y npm ≥ 10. |
| Fallo al instalar o cargar `better-sqlite3` | Comprueba la versión de Node y reinstala las dependencias con `npm install` tras cambiarla. Si la instalación requiere compilar el módulo nativo, revisa las herramientas C++ y el error de instalación. |
| Configuración de entorno inválida | Crea `backend/.env` desde la plantilla, revisa los nombres de variables indicados por el servidor y cumple las longitudes de los secretos y los valores numéricos positivos. |
| Puerto ocupado / `EADDRINUSE` | Detén la instancia anterior con `Ctrl+C`. Si Vite elige otro puerto, libera el 5173 y reinicia para mantener el origen CORS predeterminado. |
| Error CORS | Abre `http://localhost:5173` y comprueba `CORS_ORIGIN`. `127.0.0.1`, otro puerto o HTTPS constituyen un origen distinto. Reinicia el backend después de cambiar su `.env`. |
| Error de proxy o API inaccesible | Comprueba que el backend siga ejecutándose y abre `/api/health` en el puerto 4000. Revisa que el proxy coincida con el puerto real del backend. |
| Conexión PostgreSQL fallida | Revisa DATABASE_URL, disponibilidad del servidor, TLS y permisos del usuario. |
| Error al importar datos anteriores | Revisa integridad del origen y unicidad de los datos; el destino debe estar vacío. |
| Una cuenta de semillas no puede operar | Comprueba su rol y estado. Las cuentas pendientes o rechazadas no tienen los permisos de una cuenta aprobada. |
| Las pruebas E2E no encuentran navegador | Instala un navegador Chromium compatible o proporciona la ruta del que ya tengas mediante `--browser`. |
| ESLint no encuentra su configuración | Ejecuta `npm run lint` desde la raíz o desde `frontend/`; la configuración está en `frontend/eslint.config.js`. |

La auditoría de instalación detectó tres alertas altas en la cadena de desarrollo `nodemon → chokidar → braces`. No se aplicó `npm audit fix --force`, que propone una versión antigua incompatible con la instalación actual. El detalle y las limitaciones verificadas se registran en [la verificación F4](docs/verificacion-f4.md).

## Documentación de referencia

- [Reglas operativas](AGENTS.md).
- [PostgreSQL y pendientes para desplegar en Vercel](docs/despliegue-vercel.md).
- [Especificación técnica maestra](especificacion_tecnica_emprendebuho.md).
- [Plan de construcción y alcance por fase](docs/plan-de-construccion.md).
- [Arquitectura](docs/especificacion-arquitectura.md).
- [Base de datos y migración de contactos](docs/especificacion-base-de-datos.md).
- [Decisiones técnicas](docs/decisiones-tecnicas.md).
