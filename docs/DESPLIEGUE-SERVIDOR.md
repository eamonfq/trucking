# Despliegue A&L

## Datos del proyecto

- Repositorio: https://github.com/eamonfq/trucking.git — rama master.
- Aplicación Next.js 16.3.4 / React 19. Node.js 24 (local probado: 24.13.1), npm.
- Base local: ayl_real, MySQL 5.7.39. Validar migraciones y recorrido en staging si se cambia de versión de MySQL. No sustituir por MariaDB sin validación.
- Proceso web: npm run start, escucha en 127.0.0.1:3100. Requiere proxy HTTPS en el mismo servidor.
- Segundo proceso: npm run email:worker. Debe ejecutarse permanentemente con reinicio automático.
- No es una web estática ni PHP: subir archivos a public_html no basta. El hosting debe permitir Node persistente, MySQL y procesos de fondo. Como punto de partida operativo, reservar 2 vCPU y 4 GB RAM; ajustar según medición de carga.

## Qué transferir

1. Clonar el código desde Git. No copiar node_modules ni .next de Windows a Linux.
2. Importar el respaldo SQL privado de .local/backups para conservar cuentas, ubicaciones, tarifas y datos existentes. El SQL incluye hashes de contraseña, tokens, cola cifrada y archivos privados: no publicarlo, no subirlo a Git ni dejarlo bajo la raíz pública.
3. Configurar las variables por un canal seguro. .env.local está excluido de Git.

Un respaldo de base de datos no incluye AUTH_SECRET. Si se migra la cola cifrada, conservar ese secreto mediante un gestor de secretos. Antes de habilitar correo, cancelar los mensajes/tokens de pruebas o regenerar invitaciones con el dominio de producción: los enlaces locales no son válidos para los destinatarios. Nunca liberar automáticamente la cola de pruebas.

## Variables del servidor

Configurar .env.local con permisos solo para el usuario del servicio (o usar el gestor de variables del hosting):

```dotenv
NODE_ENV=production
DATABASE_URL=mysql://ayl_app:CONTRASENA_CODIFICADA_URL@127.0.0.1:3306/ayl_real
AUTH_SECRET=SECRETO_LARGO_GUARDADO_DE_FORMA_SEGURA
NEXT_PUBLIC_SITE_URL=https://TU_DOMINIO
EMAIL_DELIVERY=preview
RESEND_API_KEY=NUEVA_CLAVE
RESEND_FROM_EMAIL=A&L Trucking Logistics <notificaciones@TU_DOMINIO_VERIFICADO>
RESEND_WEBHOOK_SECRET=SECRETO_DE_FIRMA_DEL_WEBHOOK
TRUST_PROXY=false
SEO_INDEXABLE=false
```

No utilizar root/root en producción. Codificar caracteres especiales de la contraseña en DATABASE_URL. No exponer MySQL ni el puerto 3100 a Internet. Mantener el archivo de entorno fuera de copias públicas. La clave Resend compartida en la conversación debe rotarse.

## Instalación en VPS Linux (ejemplo)

```bash
git clone --branch master https://github.com/eamonfq/trucking.git ayl
cd ayl
npm ci
# Configurar .env.local antes de continuar.
# Crear ayl_real (utf8mb4) y los usuarios MySQL desde el panel o una sesión administrativa.
# Para conservar los datos, importar el respaldo SQL en ayl_real ANTES de crear cuentas.
# mysql -u USUARIO_DE_IMPORTACION -p ayl_real < /ruta/privada/respaldo.sql
npm run db:migrate
npm run system:check
npm run build
npm run start
```

Las migraciones necesitan permisos CREATE/ALTER/INDEX y los necesarios para sus tablas. Ejecutarlas con un usuario de instalación restringido a ayl_real, y después usar para la aplicación un usuario con SELECT/INSERT/UPDATE/DELETE sobre esa base. El script db:migrate comprueba/crea la base: no ejecutarlo con el usuario de ejecución si carece del permiso correspondiente. Reiniciar tras cambiar variables.

En instalación vacía, ejecutar npm run db:admin una sola vez (opcional BOOTSTRAP_ADMIN_EMAIL). La contraseña aleatoria queda en .local/admin-access.txt: guardarla en un gestor y retirar el archivo de forma segura. Al importar la base, se conservan las cuentas; db:admin no reemplaza un administrador existente.

Supervisar npm run start y npm run email:worker con systemd, PM2 o el administrador de procesos del proveedor. Ambos deben usar el directorio del proyecto y NODE_ENV=production. Instalar dependencias de desarrollo durante la compilación, ya que TypeScript está entre ellas. Los scripts auxiliares usan @next/env: mantener la instalación completa si no se ha comprobado un empaquetado reducido.

## Proxy, HTTPS y correo

- Dominio con certificado HTTPS válido. En producción la cookie de sesión es Secure.
- Proxy inverso al puerto 127.0.0.1:3100, conservando Host y estableciendo X-Forwarded-Proto. Sobrescribir X-Forwarded-For con la IP remota real; activar TRUST_PROXY=true únicamente tras comprobar esa configuración y que no se accede directamente a Node.
- Permitir cargas de al menos 6 MB en el proxy. Cada archivo privado tiene límite de 2 MB; configurar max_allowed_packet de MySQL con margen (por ejemplo 16 MB).
- Verificar el dominio en Resend. Webhook: https://TU_DOMINIO/api/webhooks/resend, con secreto de firma y eventos de entrega/rebote/queja.
- Tras sanear la cola de pruebas y autorizar una prueba de correo, cambiar EMAIL_DELIVERY=resend, reiniciar ambos procesos y verificar entrega real y webhook. En producción el modo preview no expone enlaces privados para activar cuentas.
- Activar SEO_INDEXABLE=true solo al publicar definitivamente el dominio correcto; recompilar y reiniciar al cambiar configuración pública.

## Antes de abrir al público

Comprobar registro, correo de verificación, login, recuperación, recepción, pagos, impresión y escaneo, viaje con varios destinos, descarga y bloqueo de entrega por deuda. Probar permisos de operadores. Agustín, Pablo y Emilia tienen accesos pendientes; el permiso de cobro para Emilia todavía no está implementado/asignado.

Programar respaldo de MySQL, custodiar AUTH_SECRET por separado y probar restauración. La base conserva también los archivos privados. No borrar la instalación anterior hasta validar el servidor. El código usa colecciones JSON y un bloqueo transaccional global: medir rendimiento antes de crecer a alto volumen.

El push no publica ni configura el servidor. Faltan dominio, proveedor, acceso de despliegue, credenciales MySQL de producción y configuración Resend.
