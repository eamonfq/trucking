# Validación operativa — avance, no cierre de producción

## Base utilizada

La aplicación está conectada a `ayl_real` en MySQL 5.7.39 de Laragon. Se aplicaron las migraciones 001 y 002 de forma aditiva, sin importar datos de demo ni eliminar tablas existentes. La comprobación de esta revisión encontró un administrador y cero cajas, envíos, camiones o facturas operativas. Por eso la ausencia de incidencias en la base no demuestra por sí sola todos los recorridos.

`npm run system:check` inspecciona las relaciones de la base real en modo lectura. Detecta inconsistencias cuenta/perfil, propietario de caja, asignaciones, envíos entregados, facturación duplicada y referencias de archivos. No muestra correos, contraseñas, tokens o contenidos de adjuntos. Es una comprobación de integridad, no una auditoría de seguridad exhaustiva.

## Pendiente funcional cerrado: archivos

- Fotos JPG/PNG de recepción y comprobantes JPG/PNG/PDF, hasta **2 MB por archivo**.
- El binario, nombre saneado, propietario, referencia operativa, tamaño y SHA-256 se guardan en `private_files`, en MySQL.
- Archivo, operación y correo en cola pertenecen a la misma transacción. Un fallo no debe dejar una caja aceptada sin su archivo ni adjuntos sin operación.
- `/api/files/[id]` valida la sesión y el propietario en cada descarga; administración puede acceder. No hay un directorio público de uploads.
- Se entrega como descarga, con `nosniff` y sin caché compartida; no se ejecuta HTML/SVG ni se sirve PDF subido como contenido inline del sitio.
- La validación comprueba tamaño y firmas de formato. **No sustituye antivirus ni análisis profundo del documento.** No se incorporó un servicio de escaneo externo.
- Los comprobantes anteriores se conservan vinculados a la factura incluso después de rechazar el reporte.
- Los registros antiguos que solo contenían nombres se identifican como tales. No se fabrican archivos a partir de esos nombres.
- Recepción y comprobantes siguen siendo opcionales: no se introdujo una obligación comercial nueva.

Para respaldar la operación deben incluirse **todas las tablas**, también `private_files`, y conservar separadamente la configuración/clave de cifrado de la cola. No hay limpieza automática de adjuntos ni un procedimiento de respaldo/restauración certificado todavía. Guardar archivos en MySQL simplifica la atomicidad local; para gran volumen debe evaluarse almacenamiento privado de objetos y cuotas.

## Pruebas ejecutables

```powershell
npm run db:migrate
npm run system:check
npm test
npm run test:integration
npm run lint
npm run build
```

La integración crea una base temporal única y elimina solo esa base al terminar. Comprueba acceso, recuperación, prealerta, recepción, facturas, asignación, estados de camión, entregas, soporte, pagos, privacidad de archivos, límite de tamaño y rollback. El proveedor de email se sustituye en las pruebas: no se envían mensajes a destinatarios externos.

## Pendientes para cerrar el sistema

1. Remitente verificado de Resend, destinatario de prueba autorizado, URL pública y webhook; actualmente `EMAIL_DELIVERY=preview`.
2. Configurar los importes comerciales definitivos: ya existe recargo fijo por excedente y vencimiento editable. Seguro y entrega se pueden corregir por factura antes del reporte de pago; no se cobran automáticamente importes no definidos.
3. Fotos y comprobantes son opcionales por decisión del usuario. Quedan por definir retención/escaneo de archivos y tamaño esperado de operación.
4. Respaldo, restauración probada, despliegue HTTPS, secretos rotados y usuario MySQL de privilegios mínimos para producción.
5. Aceptación de usuario con casos representativos y datos empresariales confirmados.

El mapa público se actualizará al final del cierre funcional; no se considera prueba de que el sistema entero esté terminado.

## Reglas y edición operativa

### Catálogos administrables (corrección del tarifario fijo)

Las cinco categorías originales son valores iniciales, no un enum de negocio. El catálogo admite hasta 100 categorías con identificadores estables, nombre editable, precio, medidas, peso, prioridad y estado activo/inactivo. Se administra desde Configuración y se guarda en MySQL, colección `settings` de la tabla `entities`; no requiere una base diferente de `ayl_real`.

Se pueden agregar, renombrar, ordenar, desactivar/reactivar y eliminar categorías sin referencias. Si hay cajas, líneas de factura o capacidades de camión vinculadas, el servidor impide eliminarlas y permite desactivarlas. Debe quedar al menos una activa. Las categorías inactivas salen de nuevas cotizaciones/prealertas, pero siguen disponibles para resolver operaciones existentes y sus documentos.

Las capacidades de camión ya no usan un enum de cinco categorías. Una categoría sin capacidad configurada tiene capacidad **cero**, nunca ilimitada. La validación de creación/edición consulta el catálogo real. Los nombres de categorías se conservan en cajas y líneas de factura; un cambio posterior de nombre/precio no modifica una factura emitida. El tarifario público, el cotizador, recepción, bodega, editores, camiones y manifiestos reconocen categorías nuevas.

Los destinos de viajes también se agregan o retiran en Configuración (uno por línea). Quitar un destino impide usarlo en viajes nuevos, sin borrar ni cambiar rutas históricas. El origen de esta operación sigue siendo Miami; esto no implementa múltiples bodegas.

La configuración usa revisión optimista para rechazar pantallas desactualizadas y se guarda de forma transaccional con el tarifario. Los identificadores/cantidades inválidos, nombres duplicados y catálogos sin categorías activas se rechazan. Los estados operativos y roles siguen siendo reglas estructurales protegidas: no son catálogos libremente editables.

- `/admin/configuracion`: origen, empaque, facturación, entrega, tipo de cambio, tarifas/límites, recargo fijo USD por caja excedida y días de vencimiento (1–365). La política de recargo requiere un importe positivo. El valor inicial es cero y no se activa sin configurar.
- Un excedente compara las medidas/peso reales con la categoría prealertada. Se elige una categoría física válida y se suma el recargo fijo configurado; no se aceptan cajas por encima de la categoría máxima. El importe queda congelado en la recepción y luego en la factura.
- Cambiar configuración no recalcula documentos existentes. Los recargos se muestran en recepción, factura del cliente, revisión administrativa y PDF.
- `/admin/edicion`: cajas, envíos, facturas, camiones, choferes, soporte y referencias de reportes de pago. Enlaces a los editores existentes de clientes, direcciones, destinatarios, programación/capacidad y reglas.
- `/cliente/editar`: prealertas propias antes de recibirlas, entrega/destinatario del envío antes de la asignación y método/referencia del reporte mientras está pendiente. No permite editar registros ajenos ni precios.
- Las cajas vinculadas/facturadas, envíos asignados y camiones despachados no se modifican retroactivamente. Se permite una aclaración visible. Para corregir antes de despacho se retira primero la asignación usando la herramienta existente.
- No se alteran importes pagados ni en revisión. Se preservan los comprobantes. Corregir un reporte pendiente invalida la revisión abierta en otra pantalla: debe actualizarse antes de aprobar o rechazar.
- Cada corrección guarda motivo, actor, fecha y valores anteriores/posteriores en `operationalEdits` dentro de la misma transacción. El historial administrativo muestra las últimas correcciones y los datos completos permanecen en MySQL, con acceso administrativo.
- Se comprueba una revisión canónica del JSON para impedir sobrescribir cambios simultáneos, independientemente del orden de claves usado por MySQL.

## Correos y recorrido comprobado

`/admin/correos` permite diagnosticar dominios del proveedor y enviar una prueba explícita al destinatario autorizado, sin liberar la cola operativa. La clave permanece solo en el servidor. La prueba registra aceptación o fallo en MySQL y tiene límite de frecuencia. Consultar dominios requiere permisos suficientes en la clave; una clave de solo envío puede funcionar para enviar sin permitir listar dominios.

Se agregó el aviso de factura emitida y las muestras de diseño de facturación, recepción, pago, entrega y soporte. Los enlaces operativos usan una única URL base, sin el antiguo fallback al puerto 3000. El modo operativo sigue en `preview` hasta confirmar remitente, URL pública y entrega real. Las pruebas automatizadas usan un proveedor simulado; no son prueba de entrega externa.

Los mensajes de autenticación llevan vencimiento en la cola. El worker no envía enlaces vencidos ni libera mensajes retenidos más de 23 horas al activar el proveedor; se marcan fallidos y se elimina el contenido sensible. El usuario debe solicitar un enlace nuevo. La conexión externa de esta revisión devolvió `application_error` y la comprobación de red desde el entorno devolvió `EACCES`; no se acreditó envío real.

El recorrido integral en la base temporal prueba: registro, token extraído del correo cifrado, verificación, login, prealerta, recepción **sin foto**, destinatario, envío, carga, despacho/factura, reporte **sin comprobante**, aprobación, tránsito, llegada, entrega individual y cierre del camión. Comprueba estados finales y persistencia. También se prueban correcciones de precios, versiones antiguas, propietario, choferes, asuntos de soporte y reportes de pago.

La revisión de navegador comprobó login administrativo, el centro de edición, los nuevos campos de configuración y el rechazo de un recargo sin importe. La base operativa no recibió clientes/cajas ficticios. El recorrido automatizado no sustituye la aceptación manual del negocio ni la comprobación de entregabilidad real de Resend.
