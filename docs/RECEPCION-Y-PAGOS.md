# Recepción, alta y cobros

## Clientes

El diálogo de alta se monta fuera del formulario de recepción. Su envío no se propaga al formulario principal. Los errores conservan los datos; al crear se confirma el casillero y se selecciona el cliente, limpiando cualquier prealerta del cliente anterior.

El buscador permite nombre, apellidos, correo, teléfono y casillero, ignora acentos y muestra hasta 12 resultados. Incluye navegación por teclado y resumen del cliente seleccionado. Filtra el catálogo cargado; está pensado para cientos de clientes, no es una búsqueda SQL paginada para millones.

## Pago al recibir una caja

| Modalidad | Captura | Resultado |
| --- | --- | --- |
| Efectivo | Comprobante del cobro; monto automático igual al total | Factura pagada por confirmación de operaciones |
| Tarjeta | Monto exacto en USD y comprobante | Factura pagada por confirmación de operaciones |
| Destino | Comprobante del acuerdo; saldo automático igual al total | Pendiente de pago en destino, sin reporte de dinero recibido |

El registro de pago emite la factura en recepción incluso si la facturación general está configurada al despacho. El despacho no vuelve a facturar esas cajas. Las llamadas anteriores sin captura de pago conservan la regla de facturación general.

La foto sigue siendo opcional. Los pagos generan automáticamente un folio interno. Efectivo no necesita referencia externa; transferencia, depósito y tarjeta admiten referencia externa opcional, sin exigir archivos. Las referencias se conservan en la factura, incluyendo acuerdo original y cobro posterior. Los archivos históricos siguen accesibles; tarjeta se registra como un cobro ya realizado en terminal, no es una pasarela ni almacena datos de tarjeta.

Caja, factura, comprobantes y avisos se guardan en una misma transacción MySQL. Monto incorrecto, comprobante inválido o caja rechazada revierten el registro completo. No se admiten abonos parciales.

## Cobro en destino

En Facturas, filtrar Pendiente de pago en destino, abrir la factura y confirmar el cobro en efectivo o tarjeta con un nuevo comprobante. Se conserva el acuerdo original. Una factura ya cobrada no puede cobrarse de nuevo mediante esta acción. Solo el administrador puede confirmarla. Entregar la caja no liquida automáticamente la deuda. La entrega queda bloqueada mientras exista alguna factura del envío sin pagar, o falte facturación.

El cliente ve el estado pendiente y sus comprobantes; administración lo ve en Facturas y Pendientes. Los avisos se encolan, pero el entorno local sigue en EMAIL_DELIVERY=preview.

## Recepción compacta y carga personalizada

La recepción presenta tarjetas de categorías con dimensiones, peso máximo y precio. Al seleccionar una tarjeta se copian las dimensiones como referencia; el operador debe capturar el peso real. La prealerta vinculada muestra sus medidas anteriores.

Una carga que no cabe en ninguna categoría se registra como **Carga personalizada**, con dimensiones/peso reales y cobro por libra o cotización manual. El precio acordado es obligatorio al elegir cotización manual. No se rechaza automáticamente ni se agrega al catálogo público. Cada importe se conserva por paquete; cargas de diferente precio se facturan en líneas separadas. Los camiones tienen capacidad específica de carga personalizada (cero si no se configuró).

La forma de pago queda lateral en escritorio. Folio automático; referencia bancaria opcional. Foto y correcciones: sección opcional. La navegación de paneles muestra un indicador en el enlace y una vista de carga mientras llega la sección.

## Validación

Pruebas de interfaz: separación de formularios, alta exitosa con selección y límite de resultados con 500 clientes. Integración MySQL aislada: folio automático, monto incorrecto sin cambios parciales, cobro efectivo/tarjeta, deuda en destino, cobro posterior con conservación de archivos y rechazo del doble cobro.

## Cobro por peso (septiembre 2026)

- Configuración administrativa: tarifa inicial 3.20 USD/lb, divisor base 1000 y factor 19, editables y validados en servidor.
- Medidas actuales en pulgadas. Peso dimensional = largo × ancho × alto / divisor base × factor. Para un único divisor puede fijarse factor=1; se conserva inicialmente la fórmula exacta 1000/19, no su aproximación 52.63.
- Por paquete: libras cobradas = techo(máximo(peso real, peso dimensional)); total base = libras cobradas × tarifa. Ejemplo: 50.2 lb reales frente a 19 dimensionales → 51 × 3.20 = 163.20 USD.
- Recepción permite elegir peso (predeterminado de la interfaz), fijo por categoría o manual para vehículos, motos, cuatrimotos, maquinaria, mudanzas y otras cargas especiales. No se aplica recargo de categoría en peso/manual.
- El cálculo se realiza nuevamente en servidor. Se conserva en cada caja una instantánea de fórmula, tarifa, medidas, pesos y precio. La factura copia importes y desglose; cambios de configuración no recalculan recepciones ni facturas anteriores. Las cajas históricas sin instantánea mantienen el comportamiento anterior.
- Correcciones de medidas antes de vinculación/facturación recalculan el cobro por peso usando los factores originales y guardan historial. Después se permiten aclaraciones, no cambios silenciosos.
- El tipo de cobro se selecciona por paquete al recibirlo, no automáticamente por descripción del contenido. Un envío puede reunir paquetes con distintos modos y se suma el importe de cada uno.
- Pruebas usan una base MySQL desechable, sin crear operaciones en la base real.
