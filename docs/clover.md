# Clover: cobros con formulario seguro

## Activación pendiente

Esta integración queda deshabilitada por defecto. No se han realizado cargos reales. Los tokens mostrados en la captura eran de tipo API; solicitar tokens **Hosted iFrame + API/SDK**, Merchant ID y rotar el secreto compartido. No guardar credenciales en Git, capturas o documentación.

En el `.env` del servidor (variables exclusivamente de servidor):

```dotenv
CLOVER_ENABLED=false
CLOVER_ENVIRONMENT=production
CLOVER_MERCHANT_ID=
CLOVER_PUBLIC_KEY=
CLOVER_PRIVATE_KEY=
NEXT_PUBLIC_SITE_URL=https://altruckinglogistics.com
TRUST_PROXY=true
```

Cambiar `CLOVER_ENABLED=true` solo después de configurar y validar la cuenta, el formulario Hosted iFrame, el dominio HTTPS y el proxy. La aplicación solo envía la clave pública y el Merchant ID al navegador. El token privado se utiliza únicamente en llamadas servidor a servidor. No se guardan PAN, CVV ni el token de tarjeta: solo una huella SHA-256 para conciliación.

El proxy debe **sobrescribir**, no aceptar ni concatenar cabeceras `X-Forwarded-For` arbitrarias del navegador. Con un único Nginx frente a Next:

```nginx
proxy_set_header X-Forwarded-For $remote_addr;
```

Si hay Cloudflare u otros proxies delante, configurar primero sus rangos confiables y resolución de IP real en Nginx. No copiar una configuración que permita al público inventar su IP. Clover exige IP del navegador en la solicitud de cargo.

## Flujo operativo

1. En recepción, elegir **Clover · cobrar** y ubicación muestra los campos seguros dentro de Forma de pago, antes de guardar.
2. **Cobrar y finalizar** tokeniza la tarjeta primero. Si los campos no son válidos, no crea paquetes. Después guarda una recepción pendiente y realiza un único cargo por todas las piezas; el servidor verifica el importe.
3. La recepción debe persistir antes de solicitar el cargo bancario para permitir auditoría y recuperación. Cada guardado lleva un identificador idempotente: reintentar una respuesta perdida recupera los mismos paquetes. El cargo se realiza fuera de la transacción de MySQL.
4. Solo una respuesta con `paid=true`, `captured=true`, `status=succeeded`, importe exacto y moneda USD liquida las facturas. Cada factura conserva folio interno, monto, fecha, operador, ubicación y referencia del mismo cargo. Se envía un solo correo de confirmación por cargo.
5. Si se rechaza explícitamente la tarjeta, las facturas siguen pendientes, sin método Clover confirmado. En la misma recepción puede utilizarse otra tarjeta o cambiar a efectivo, destino u otro método sin duplicar paquetes. Si hay timeout, respuesta inconsistente o fallo de persistencia, el cobro queda bloqueado para conciliación. No se repite automáticamente un POST. Si se cierra la pantalla, se retoma desde Facturas.

También disponible en Administración → Facturas (emitidas, vencidas y cobros en destino), y en el detalle de factura del cliente, incluido pago anticipado de una deuda en destino. Al abrir una factura de recepción se agrupan sus facturas pendientes y se muestra ese total antes de autorizar. Operadores de almacén no tienen permisos de cobro ni conciliación. Tarjeta externa continúa siendo un registro manual, separado de Clover.

Las facturas con intento Clover quedan protegidas contra pago externo, cambios de estado e importes. Una recarga, doble clic o solicitud concurrente recupera el intento existente, sin generar otro cargo. La reserva usa el bloqueo transaccional existente y se almacena en `entities/cloverAttempts`; no requiere migración SQL nueva.

## Conciliación y fallos de red

### Si Clover no se habilita en recepción

La tarjeta Clover permanece visible y deshabilitada mientras se verifica. Si la configuración no está completa, muestra los nombres de las variables faltantes (nunca sus valores) y **Volver a verificar**. También diferencia errores de conexión y una consulta que tarda más de 10 segundos. Que la configuración esté completa no significa que el proveedor haya validado las credenciales.

Además de las tres credenciales, el proceso necesita `CLOVER_ENABLED=true`, `CLOVER_ENVIRONMENT=production`, dominio HTTPS y `TRUST_PROXY=true` con un proxy correctamente configurado. Los nombres esperados son `CLOVER_MERCHANT_ID`, `CLOVER_PUBLIC_KEY` y `CLOVER_PRIVATE_KEY`.

Después de cambiar variables, reiniciar la aplicación con `pm2 restart <nombre-de-la-app> --update-env`. Revisar si `.env.local` o la configuración de PM2 contienen valores anteriores que prevalecen sobre `.env`. El diagnóstico de la pantalla corresponde al proceso que atiende la aplicación, no simplemente al archivo editado. No compartir el contenido completo del entorno ni capturas de los secretos.

En Administración → Facturas → Ver detalle, abrir el pago Clover y consultar estado. Si queda en verificación:

- Consultar el Merchant Dashboard de Clover y localizar el intento por la descripción `A&L pago <UUID>`, importe y fecha.
- Copiar el **ID del cargo** y pulsar **Verificar cargo con Clover**. Se realiza un GET, no otro cobro. Se verifican cuenta/entorno, token original mediante su huella, importe y moneda; un cargo ajeno no sirve para liquidar estas facturas.
- Un cargo capturado confirma las facturas; un cargo fallido explícito libera el intento. Un cargo solo autorizado, parcialmente capturado, devuelto o inconsistente sigue en revisión.
- Si Clover no tiene un cargo identificable (por ejemplo, el proceso cayó entre guardar la reserva y enviar la petición), contactar soporte y confirmar el resultado con Clover. **No borrar reservas, cambiar a efectivo ni volver a cobrar a ciegas.** No existe desbloqueo automático por vencimiento.

Esta versión realiza captura inmediata. No incluye reembolsos, cancelación bancaria, contracargos, cuotas, terminal física ni sincronización de cambios efectuados posteriormente en Clover. Esas operaciones se resuelven con administración/Clover y requieren flujo contable separado. No hay un webhook público que acepte confirmaciones sin verificar.

## Pruebas y despliegue

Usar `sandbox` con credenciales **sandbox** distintas para probar el iframe y tarjetas de prueba oficiales; nunca tarjetas reales en sandbox. Las pruebas automatizadas usan MySQL aislado y respuestas simuladas de Clover, sin cargos externos. Antes de producción comprobar con la cuenta sandbox: tarjeta aprobada/rechazada, recepción múltiple, pago del cliente, doble clic, timeout y conciliación.

En producción, después de actualizar el código y configurar `.env`:

```bash
cd /var/www/trucking
npm ci
npm run build
pm2 ls
pm2 restart <nombre-de-la-app> --update-env
```

No activar solo por haber pasado pruebas simuladas: falta verificar el SDK con credenciales compatibles y el Merchant ID real. El primer cargo real requiere autorización del titular y revisión de monto; no ejecutar cargos de prueba automáticamente.

Referencias oficiales:

- https://docs.clover.com/dev/docs/setting-up-an-api-token
- https://docs.clover.com/dev/docs/using-the-clover-hosted-iframe
- https://docs.clover.com/dev/reference/createcharge
- https://docs.clover.com/dev/docs/ecommerce-accepting-payments
