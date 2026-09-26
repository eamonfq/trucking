# App instalable A&L

El inicio público incluye la sección `/#app` y el panel `/cliente` una tarjeta de instalación. El manifiesto se publica en `/manifest.webmanifest` y abre `/cliente`, conservando la autenticación normal (redirige a login sin sesión).

Chrome/Edge compatibles: botón nativo solo tras `beforeinstallprompt`. Safari/iOS: instrucciones manuales. En modo standalone no se invita a reinstalar. No hay trabajo offline ni instalación automática.

El service worker `/sw.js` usa exclusivamente la red: no almacena páginas privadas, archivos, respuestas API, tarjetas ni operaciones. Solo devuelve una pantalla genérica si falla una navegación GET. Nunca intercepta ni reenvía POST.

Desplegar con HTTPS, compilar y reiniciar PM2. El proxy debe servir `/sw.js`, `/manifest.webmanifest` y `/pwa/*` públicamente y respetar `Cache-Control` del worker. No servir una versión antigua del worker desde CDN. Iconos derivados del logo existente: regenerar con `node scripts/generate-pwa-icons.mjs`.

Validación real antes del lanzamiento: instalación Chrome/Android, Safari/iPhone (Compartir → Agregar a pantalla de inicio), apertura desde icono, login/logout, pantalla sin conexión y reconexión. La disponibilidad de instalar depende del navegador; no todos emiten el evento nativo.

## Sesión y contraseña

«Recordarme durante 30 días» es opt-in, para dispositivos personales. La cookie es HttpOnly/Secure en producción; no se almacena la contraseña en la PWA. Los campos permiten autocompletar con el gestor del navegador. Cambiar contraseña revoca sesiones y suscripciones push asociadas; cerrar sesión elimina la suscripción de esa sesión. Volver a iniciar sesión puede requerir reactivar avisos. No se garantiza compartir sesión entre Safari y una app instalada.

## Push junto con los correos operativos

1. `npm ci` y `npm run db:migrate` (migración 006, compatible con MySQL 5.7).
2. Generar una sola vez: `npx web-push generate-vapid-keys --json`. Guardar las claves solo en el `.env` del servidor, nunca en Git o capturas.
3. Configurar `PUSH_ENABLED=true`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT=mailto:notificaciones@vecility.com`. Mantener las mismas claves entre despliegues.
4. `npm run build` y reiniciar la app y el worker PM2 con `--update-env`. El worker existente (`scripts/email-worker.mjs`) procesa ambas colas mediante el endpoint autenticado; debe mantenerse activo.
5. En el panel, pulsar «Activar avisos» y aceptar el permiso. En iPhone/iPad se requiere iOS/iPadOS 16.4+ y abrir la app instalada desde su icono.

Se encola un aviso por email operativo consolidado y dispositivo suscrito, no por pieza. Son canales independientes: el push no prueba la entrega del email. Solo correos con destino al panel del cliente; se excluyen enlaces de verificación, invitación y recuperación. Las suscripciones nuevas no reciben eventos históricos. El aviso es genérico y abre Notificaciones; los detalles completos también están en el correo.

Reintentos acotados, eliminación de endpoints vencidos (404/410), cola con retención máxima de un día y filtrado por cuenta activa y sesión válida. Un proveedor puede aceptar un push sin que el dispositivo lo muestre (permisos, ahorro de batería, conectividad). No se garantiza entrega inmediata ni exactamente una vez ante fallos de red; se usa un identificador de evento para agrupar reintentos. «Desactivar avisos» afecta a ese dispositivo, no al email. No hay cargos bancarios ni envío de credenciales en push.
