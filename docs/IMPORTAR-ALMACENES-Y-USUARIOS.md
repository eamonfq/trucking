# Cargar almacenes y operadores desde SSH

El script versionado incluye Chicago / Arlington Heights y El Paso como orígenes, Valle de Juárez como destino, y los correos confirmados de Rayza Morales y Lizette Ponce. Todos se crean como operadores de recepción/consulta de contactos, nunca administradores ni cobradores.

## Ejecutar en producción

Respaldar primero la base de datos. Con este cambio disponible en master:

```bash
cd /var/www/trucking
git pull --ff-only origin master
npm ci
npm run db:migrate
npm run db:locations
```

El último comando solo simula y muestra el resultado. Para insertar:

```bash
npm run db:locations -- --apply
```

No cambia contraseñas existentes, no borra datos, no modifica roles/permisos existentes y no prepara correos por defecto. Usa una transacción: un conflicto revierte toda la importación. Si una ubicación ya existe por nombre o dirección, se conserva y se reporta cualquier diferencia de función para revisión.

## Activación de accesos

```bash
npm run db:locations -- --apply --invite
```

Prepara enlaces cifrados para establecer contraseña (24 horas), solo para cuentas no verificadas y activas sin invitación vigente. No imprime contraseñas ni tokens. Se puede ejecutar después de insertar las cuentas. Con `EMAIL_DELIVERY=resend` el worker puede enviar las invitaciones al confirmar la transacción; verificar previamente `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` HTTPS, remitente y Resend. En `preview` no se envían. Las cuentas nuevas no tienen una contraseña compartida: deben activar el enlace. Repetir el comando no duplica cuentas ni invitaciones vigentes; puede renovar las expiradas.

## Completar los tres correos pendientes

Faltan los correos de Pablo y Emilia; el de Agustín llegó con una tilde y requiere confirmación. No se transforma ni inventa. Añadir los datos confirmados a las variables del servidor o capturarlos sin dejarlos en el historial:

```bash
read -r -p 'Correo confirmado de Agustín: ' AYL_AGUSTIN_EMAIL
read -r -p 'Correo de Pablo: ' AYL_PABLO_EMAIL
read -r -p 'Correo de Emilia: ' AYL_EMILIA_EMAIL
export AYL_AGUSTIN_EMAIL AYL_PABLO_EMAIL AYL_EMILIA_EMAIL
npm run db:locations
npm run db:locations -- --apply --invite
unset AYL_AGUSTIN_EMAIL AYL_PABLO_EMAIL AYL_EMILIA_EMAIL
```

Dejar vacío cualquiera lo mantiene pendiente. Para otra lista usar `--data /ruta/privada/ubicaciones.json`, con la estructura de `scripts/data/operational-locations.json`. No subir credenciales ni archivos privados a Git.

El script no habilita nuevas capacidades del rol: el alta inicial de paquetes y carga de camiones siguen reservadas al administrador; el operador consulta origen y descarga en destinos autorizados. No reinicia servicios ni reemplaza el despliegue de código.
