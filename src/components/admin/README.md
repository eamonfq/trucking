# Componentes administrativos

## Correcciones exclusivas del administrador completo

- **Facturas → Editar:** modifica partidas, cantidades, precios, cargos adicionales, fechas, estado y registros de pago. Requiere motivo y una revisión vigente. Conserva el número de factura, cliente, vínculos logísticos y folios de pago; registra el documento anterior y posterior en `operationalEdits` y añade un evento al historial.
- Para una factura pagada, los pagos confirmados deben coincidir con el nuevo total. El editor solo corrige documentación: no cobra tarjetas ni ejecuta reembolsos. No permite borrar folios existentes; un registro incorrecto puede marcarse rechazado, con la correspondiente corrección del estado de la factura.
- **Clover:** protege el total, estado y registros del proveedor, incluidos pagos en línea e históricos. Solo admite correcciones que mantengan el importe original.
- **Clientes → Expediente → Cajas → Retirar duplicado:** elige una caja o la recepción completa, revisa el impacto, indica motivo y confirma con `RETIRAR`. Desaparece del inventario activo y del panel del cliente, pero se guarda recuperable en `customerArchivedBoxes`.
- **Cajas retiradas → Restaurar:** recupera los mismos códigos y vínculos. Los códigos de documentos no se reutilizan. Tras retirar o restaurar una pieza de un grupo, reimprime sus etiquetas para actualizar la numeración de unidades.
- No se retiran cajas despachadas o vinculadas a camiones/envíos, ni una pieza individual de una recepción con peso conjunto. No se retiran cajas cuyo cobro Clover esté en curso o pendiente de conciliación.
- El retiro conserva facturas, pagos y fotos. No anula deuda ni devuelve dinero automáticamente: los documentos financieros deben revisarse por separado. El acceso y las escrituras se verifican en el servidor, no solo mediante botones visibles.

Las pruebas de integración usan una base MySQL temporal independiente. Ninguna cuenta, caja, recepción o factura existente se modifica durante esas pruebas. Estas herramientas no requieren una migración nueva: utilizan las colecciones JSON existentes.
