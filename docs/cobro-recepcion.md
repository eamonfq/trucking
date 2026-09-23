# Cobro de recepción

- **Peso:** solo peso real, redondeado hacia arriba a libra completa × tarifa por libra.
- **Volumen:** largo × ancho × alto en pulgadas ÷ divisor base × factor dimensional. El resultado es directamente el precio en USD, redondeado a dos decimales, sin multiplicarlo por la tarifa por libra ni redondearlo a libras. Ejemplo: 16 × 26 × 15 ÷ 1000 × 19 = USD 118.56. El peso real no participa en el precio.
- **Carga especial:** precio manual acordado por pieza; independiente de peso y medidas.

Se conserva la tarifa, divisor y factor configurables. No se recalculan facturas anteriores.

El peso real es obligatorio al guardar cualquiera de los tres métodos para controlar el peso físico del camión. En volumen se muestra la cotización antes de capturarlo. Las dimensiones no son obligatorias en peso ni carga especial: internamente se conservan como cero cuando no fueron registradas, pero se muestran como «No registradas». Los totales de volumen indican cuando faltan medidas.

Cada pieza puede tener peso distinto. La opción de repetir peso requiere confirmación explícita. Cada unidad conserva su código escaneable y etiqueta, dentro del mismo número de recepción.

Los nuevos cobros por volumen guardan `volumePricing: direct-usd`. Los registros históricos sin esta marca conservan su cálculo anterior. No se modifican facturas emitidas.

Compatibilidad: `peso-real` y `volumen` son modalidades nuevas. `peso` conserva la regla histórica del mayor entre peso real y dimensional; `fijo` conserva los precios históricos por categoría. No requieren migración SQL porque el detalle de cobro se almacena en el documento operativo JSON existente.

La etiqueta incluye remitente (cliente y teléfono), casillero, peso real, medidas si existen, destinatario y teléfono, código común de recepción, código de pieza y posición dentro del grupo. El remitente proviene del perfil del cliente y el destinatario de la captura de recepción.
