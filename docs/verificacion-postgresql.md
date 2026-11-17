# Verificación de la migración PostgreSQL

Fecha: 2026-11-16. Entorno: Windows x64 y Node.js 24, con un servidor PostgreSQL temporal en localhost. La base SQLite existente del proyecto no se modificó y no se conectó una cuenta remota.

Comprobaciones ejecutadas:

- `npm test`: 61 pruebas backend y 3 frontend aprobadas, sin omisiones.
- `npm run build`: bundle Vite compilado correctamente.
- `npm run lint`: ESLint sin errores.
- Pruebas PostgreSQL después del último ajuste del repositorio de importación: 4 aprobadas.
- Respaldo administrativo generado con `pg_dump`, inspeccionado con `pg_restore --list` y restaurado completamente en el esquema aislado de la prueba. Se verificaron usuarios y la función SQL de búsqueda.
- Importación desde una fixture SQLite de las 11 tablas: conservación del hash del origen, usuarios con referencias a IDs posteriores, fechas UTC, precios numéricos y secuencia de contactos avanzada a 1000 (siguiente ID: 1001).
- Rechazo de destino con datos y rollback de todas las tablas cuando falla una restricción.
- Transacciones anidadas con savepoints y comprobación de invisibilidad de escrituras sin confirmar desde otra conexión.
- Privacidad pública de ubicación, credenciales administrativas, revocación JWT, moderación y auditoría verificadas por las suites existentes adaptadas a PostgreSQL.

Las pruebas integradas del frontend usaron la API real. El recorrido Chromium E2E fue actualizado para el fixture asíncrono y los respaldos `.dump`, pero no se ejecutó en esta migración. No se hizo despliegue en Vercel ni se importaron datos de usuarios a un proveedor. Los pendientes para ese despliegue se documentan en [despliegue-vercel.md](despliegue-vercel.md).
