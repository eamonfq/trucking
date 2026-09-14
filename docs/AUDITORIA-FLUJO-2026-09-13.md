# Auditoría del flujo — 13 de septiembre de 2026

## Recorrido verificado con MySQL aislado

Alta de cliente con dos destinatarios → recepción de dos piezas con medidas y precios diferentes → rechazo y rollback de pago incorrecto → cobro completo → panel del cliente limitado a sus datos → edición del directorio sin alterar la recepción → creación de envío conservando contacto histórico → corrección administrativa del receptor con actualización de todas las piezas → ruta con origen y destino → inicio de carga → escaneo individual → bloqueo de duplicados y despacho incompleto → despacho completo → rechazo de entrega antes de descarga → descarga escaneada de cada pieza → entrega de ambas → envío entregado y camión cerrado.

La suite existente también cubre pago pendiente en destino y bloqueo de entrega sin liquidar, permisos de almacén sin finanzas, rutas con varios destinos, autenticación y restablecimiento, propiedad de documentos privados, prealertas y rollback transaccional.

## Inconsistencias corregidas

1. Editar la entrega de un envío podía dejar etiquetas/contactos de las cajas desactualizados. La corrección administrativa previa a carga ahora actualiza las cajas vinculadas, conserva auditoría individual y añade una indicación de reimprimir etiquetas. Una recepción ya asignada no puede redirigirse desde el panel del cliente mediante el editor genérico.
2. El texto `Municipio, Estado` del almacén se comparaba literalmente con un municipio de dirección. Se comparan municipio y estado separados, ignorando tildes, espacios y mayúsculas, sin aceptar municipios distintos ni estados explícitamente distintos. También se valida el destino de paquetes con receptor registrado aunque todavía no tengan guía de cliente.

## Alcance y pendientes externos

- Pruebas automáticas locales, no auditoría ejecutada en el servidor de producción.
- La base operativa local ayl_real no contiene cajas, viajes ni facturas; el recorrido se ejecuta en una base temporal aislada, no con datos ficticios en producción.
- El modo de correo local sigue en preview. El usuario confirmó el envío en producción por separado; no se dispararon correos reales en esta auditoría. El webhook no es necesario si solo se desea envío.
- Falta validación con impresora física, tamaño 100 × 150 mm y lector real. Los controles utilizan lector en modo teclado + Enter.
- Los operadores de origen consultan paquetes/contactos; alta inicial, carga y cobros continúan reservados al administrador. No se otorgaron permisos financieros nuevos.
- La compatibilidad de destino sigue basada en municipio/estado. No existe un mapa de cobertura de un almacén hacia otros municipios; esa regla requiere definición si se necesita reparto regional.
- Las etiquetas ya impresas deben reimprimirse tras una corrección de destinatario; el sistema no puede actualizar papel emitido.
