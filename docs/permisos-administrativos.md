# Usuarios administrativos y permisos

## Administración del equipo

Un administrador completo abre **Usuarios y permisos** en `/admin/usuarios`.
La pantalla muestra primero el directorio: búsqueda, filtro de estado, páginas de 10 usuarios, edición e invitación.

Al crear un usuario se propone el perfil **Recepción**: recepción, prealertas, clientes y pendientes. Cada sección puede seleccionarse por separado. El correo es único y no se cambia desde esta pantalla. El destinatario establece su propia contraseña mediante una invitación de un solo uso, válida durante 24 horas; una cuenta nueva no inicia sesión hasta activarla.

**Administrador completo** concede todo el sistema y la gestión de usuarios. No se puede desactivar o reducir el acceso propio ni dejar el sistema sin un administrador completo activo. Edición global queda reservada a administradores completos.

## Límites

- Recepción incluye altas rápidas, direcciones/destinatarios, recepción, etiquetas, fotos, recibos y cobros de las facturas creadas por ese usuario en recepción.
- Facturas y cobros permite operar con las facturas de todos los clientes.
- Resumen contiene indicadores financieros; no concede por sí mismo autorización para cobrar.
- Pendientes muestra solo enlaces correspondientes a secciones autorizadas.
- Entregas consulta la autorización para entregar sin necesitar acceso a los importes. El servidor continúa bloqueando entregas sin liquidación.
- Almacenes permite administrar ubicaciones y operadores de almacén; no permite elevar un operador a administrador.
- Recepción en destino permite consultar/descargar en todos los destinos. Para limitar por almacén, mantener el rol **operador** con sus permisos por ubicación.
- Operadores de almacén continúan sin facturas ni cobros.
- Correos no permite abrir enlaces privados de activación de cuentas, ni siquiera en la vista previa local.

## Implementación y despliegue

Se mantiene el rol persistido `admin` y se añade `adminPermissions` en el registro JSON de usuarios. Ausencia del campo significa administrador completo heredado; una lista vacía nunca concede acceso. No se requiere una migración SQL adicional por este cambio.

La política se aplica en páginas, Server Actions, consultas de datos, documentos, archivos privados y selección de facturas para Clover. El menú y los enlaces reflejan la misma política, pero no sustituyen la autorización del servidor.

Los permisos se consultan desde la base de datos, no desde parámetros del navegador. Cambiar los accesos o desactivar a otra persona revoca sus sesiones. Los cambios quedan registrados en la actividad y la auditoría de seguridad.

Las pruebas de integración usan una base MySQL temporal y no realizan cargos ni envíos reales. No crear usuarios de prueba en producción.
