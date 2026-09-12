# Autenticación real y persistencia — entrega local

## Estado de las seis fases

1. **Persistencia:** MySQL en Laragon, migración idempotente, pool de conexiones, transacciones y repositorios aislados por solicitud. La instalación usa `ayl_real`, sin importar registros ficticios. Clientes, direcciones, destinatarios, cajas, envíos, camiones, choferes, facturas, notificaciones, soporte y configuración se guardan en MySQL.
2. **Registro:** validación del servidor, contraseña con scrypt y sal aleatoria, correo y casillero únicos, asignación transaccional, verificación por correo. Las altas administrativas y de recepción envían invitación: el operador no elige ni conoce la contraseña.
3. **Login:** correo o casillero, cookie HttpOnly/SameSite, tokens opacos almacenados como SHA-256, sesiones revocables. Sin «recordarme» la cookie dura la sesión del navegador y el servidor limita a 8 horas; con la opción activada dura 30 días. La autorización se comprueba en cada acción y en la capa de datos, no solo en el proxy.
4. **Recuperación:** token aleatorio de un solo uso, hash en base de datos, caducidad de 30 minutos; verificación/invitación de 24 horas. Cambio de contraseña y revocación de sesiones dentro de la misma transacción. El enlace no se consume con GET para evitar activaciones por analizadores de correo.
5. **Emails:** plantillas HTML y texto con el logo y diseño editorial A&L; verificación, bienvenida, recuperación, contraseña cambiada e invitación. Cola transaccional cifrada, claves de idempotencia, reintentos limitados, estados de entrega y webhook firmado. Centro de correos en `/admin/correos`.
6. **QA:** 65 pruebas existentes y 17 pruebas de integración con MySQL. Prueban concurrencia, rollback, propiedad de recursos, roles, contraseñas, expiración, uso único, sesiones, límites, cola, fallos de entrega y webhook con firma y repetición. Incluyen alta en recepción, caja, factura, chofer, camión y cambio de etapa. Compilación de producción y comprobación de login administrativo en el navegador, registro móvil a 390 px y plantilla de correo.

La implementación local no equivale a una publicación de producción ni a una certificación de seguridad. La entrega real a buzones externos necesita la configuración descrita abajo.

## Arranque en Laragon

Activa MySQL. Configura `.env.local` a partir de `.env.example` **sin sobrescribir una configuración existente**.

```powershell
npm install
npm run db:migrate
npm run db:admin
npm run dev
```

`db:admin` crea el primer administrador si no existe ninguno. Su contraseña es aleatoria y queda en `.local/admin-access.txt`, excluido de Git. No se imprimen credenciales en consola. Para una instalación nueva con correo propio, define `BOOTSTRAP_ADMIN_EMAIL` antes de ejecutar el comando. El script no reemplaza el acceso de un administrador existente.

La conexión `root/root` es exclusivamente la configuración local solicitada. Producción necesita un usuario MySQL de privilegios mínimos, una contraseña distinta, respaldos y un procedimiento de restauración probado.

## Probar el flujo completo en local sin enviar correos

La configuración actual es `EMAIL_DELIVERY=preview`:

1. Crea una cuenta en `/registro` (la dirección sigue siendo el segundo paso).
2. Entra como administrador y abre `/admin/correos`.
3. Abre el mensaje local y sigue el botón para confirmar el correo.
4. Inicia sesión con el correo o casillero y la contraseña elegida.
5. Solicita recuperación en `/recuperar`; abre el mensaje local desde el administrador y restablece la contraseña.
6. Comprueba que la contraseña anterior y las sesiones anteriores ya no permiten acceder.

La previsualización de mensajes reales con enlaces solo existe en desarrollo, con modo `preview` y sesión administrativa. En producción solo están disponibles las muestras de diseño sin tokens. No hay enlaces públicos de depuración ni claves compartidas de demo.

## Activar Resend

La configuración encontrada usa el remitente de pruebas de Resend y no incluye `RESEND_WEBHOOK_SECRET`. No se enviaron correos a direcciones reales durante estas pruebas.

Para habilitar entrega externa:

1. Verifica tu dominio de envío en Resend y configura `RESEND_FROM_EMAIL` con ese dominio.
2. Rota la clave compartida en la conversación y actualiza `RESEND_API_KEY` localmente; nunca en Git.
3. Define `NEXT_PUBLIC_SITE_URL` con la URL pública HTTPS. Los enlaces y el logo del correo deben poder abrirse desde el dispositivo del destinatario; `localhost` solo funciona en esta máquina.
4. Configura el webhook público `/api/webhooks/resend` y guarda su secreto de firma en `RESEND_WEBHOOK_SECRET`.
5. Cambia `EMAIL_DELIVERY=resend` y reinicia la aplicación.
6. Ejecuta `npm run email:worker` como proceso supervisado junto al servidor. Para una sola ejecución: `npm run email:worker -- --once`.
7. Haz una prueba con un correo autorizado y confirma el evento `delivered` en el panel. `sent` significa aceptado por el proveedor, no entregado.

La aplicación intenta procesar la cola al terminar las acciones. El worker asegura los reintentos aunque no haya nuevos usuarios navegando. No se instaló una tarea del sistema operativo ni se creó un webhook público desde esta máquina.

Si un mensaje falla cinco veces queda en `failed`; el usuario puede solicitar un nuevo enlace después de corregir el remitente. No se reenvían automáticamente solicitudes ambiguas fuera de la ventana de idempotencia. Un mensaje aceptado borra su contenido cifrado y conserva los metadatos operativos. `AUTH_SECRET` cifra la cola: respaldarlo de forma segura; cambiarlo con mensajes pendientes impide descifrarlos.

Fuentes de integración: [firmas de webhook](https://resend.com/docs/webhooks/verify-webhooks-requests) y [claves de idempotencia](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Arquitectura y límites conocidos

- `accounts`, `sessions`, `auth_tokens`, `rate_limits`, `security_audit`, `email_outbox` y `email_events` son tablas dedicadas, con índices y restricciones.
- Las entidades operativas y los perfiles/direcciones se almacenan como documentos JSON por entidad en `entities`, no como un modelo relacional totalmente normalizado. Se reutilizan las reglas operativas existentes mediante una unidad de trabajo con `AsyncLocalStorage`.
- Un bloqueo transaccional serializa las mutaciones operativas entre procesos y evita que dos acciones sobrescriban el estado de otra. Se escriben solo las entidades modificadas. Es una base válida para el volumen local/pequeño, no un diseño de alto volumen: antes de escalar deben migrarse las colecciones a consultas y tablas específicas con paginación.
- Los archivos de `src/lib/data` permanecen como referencias históricas, pero no alimentan la autenticación ni las operaciones en ejecución.
- El cambio de correo de acceso está bloqueado en el formulario de perfil; no se permite saltarse la verificación cambiándolo directamente. Un flujo específico de cambio de correo con doble confirmación sería un alcance adicional.
- Los códigos públicos de tracking siguen el esquema existente. Su respuesta se limita a información pública; no contiene contraseñas, datos de contacto, notas internas ni identidad del operador.
- El almacenamiento privado de fotos/comprobantes y las correcciones operativas se implementaron después de este bloque de autenticación; consultar `VALIDACION-OPERATIVA.md` para el estado actual y sus límites. No se certificaron pagos bancarios electrónicos, datos empresariales definitivos ni textos legales publicados.
- Activa `TRUST_PROXY` solo si un proxy de confianza reemplaza las cabeceras reenviadas. Sin él se aplica un límite local compartido además del límite por cuenta. Para múltiples instancias detrás de un balanceador, ajusta esta política a la red real.
- No se añadieron datos reales de bodega, tarifas autorizadas ni acuerdos legales: los marcadores y valores previos del sitio deben revisarse antes de aceptar clientes externos.

## Pruebas

```powershell
npm run lint
npm test
npm run test:integration
npm run build
```

Las pruebas de integración crean una base aislada `ayl_test_<uuid>` y eliminan únicamente esa base al terminar. No modifican `ayl_real` ni envían emails externos: el SDK de envío se sustituye en las pruebas; la verificación criptográfica de webhooks usa el SDK real con una clave ficticia.
