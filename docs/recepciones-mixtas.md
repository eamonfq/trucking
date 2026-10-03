# Recepciones con varios conceptos

En Recepción → Paquetes y cobro, **Una modalidad** mantiene la operación existente. **Varios conceptos · carga mixta** permite separar mercancías con precio, pesaje o modalidad diferentes dentro de una misma recepción.

Ejemplo:

| Concepto | Piezas | Peso | Cobro | Total USD |
| --- | ---: | --- | --- | ---: |
| Moto Honda, VIN 201285 | 1 | No registrado | Precio acordado | 3,000.00 |
| Cajas extras | 5 | 117 lb conjuntas, solo estas cajas | $3.20 por libra | 374.40 |
| Recepción completa | 6 | 117 lb conocidas; falta la moto | Conceptos independientes | 3,374.40 |

El redondeo a la siguiente libra se aplica una sola vez al peso conjunto de cada concepto. No se distribuyen peso ni costo entre conceptos distintos. Si cada caja tiene un peso diferente, agrega conceptos separados; «mismo peso por pieza» exige confirmar que los pesos realmente coincidan.

Cada pieza conserva código, etiqueta, estado, factura y pagos asociados. Cuando las cajas se pesaron juntas, su distribución interna permite sumar la carga del camión, pero las vistas la identifican como peso conjunto, no como un pesaje individual. El precio acordado con peso desconocido exige marcarlo expresamente; no se inventa un peso cero ni se toma de otra mercancía.

Bodega, expediente del cliente, panel del cliente y almacenes agrupan por recepción, con piezas desplegables. Las piezas continúan seleccionándose o escaneándose individualmente para cargar y descargar. El correo sigue siendo único por recepción. Los operadores de almacén reciben únicamente contenido y datos operativos/contactos autorizados, nunca importes de los conceptos.

El peso pendiente se completa desde el detalle administrativo de la pieza antes de salir de origen. Este registro no cambia la cotización, facturas ni pagos. Los camiones con límite de peso no aceptan piezas con peso desconocido. Sin límite configurado, los totales identifican expresamente el peso parcial.

Las recepciones anteriores no se recalculan ni se reconstruyen leyendo sus notas. Un registro histórico con seis piezas y prorrateo global conserva su historial; el administrador debe revisar el desglose y sus facturas antes de decidir una corrección. No crear una nueva recepción para reemplazarlo sin retirar primero el registro incorrecto y conciliar sus cobros.

La información nueva se conserva en los documentos JSON existentes de MySQL. No se requiere migración de tablas ni cambios de configuración para esta función.
