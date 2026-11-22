/**
 * Errores que lanzan los cálculos de recepción (`utils/reception-concepts.ts`, `utils/group-weight.ts`
 * y `calculateBilling` de `utils/billing.ts`). Se muestran en el navegador (total de una recepción
 * mixta) y los devuelve `receivePackageGroup`, así que también entran en `messages/reception.ts`.
 * Clave: español; valor: inglés.
 */
export const receptionUtilMessages = {
  // utils/reception-concepts.ts
  "Describe el contenido de cada concepto.": "Describe the contents of each line item.",
  "No repitas el identificador de un concepto.": "Don't repeat a line item identifier.",
  "La recepción admite hasta 50 piezas físicas en total.": "A receipt allows up to 50 physical pieces in total.",
  "Selecciona una caja vigente del catálogo.": "Select a current box from the catalog.",
  "Solo una cotización acordada permite peso no registrado; no ingreses un peso estimado.": "Only an agreed quote allows an unrecorded weight; don't enter an estimated weight.",
  "Registra el peso del concepto o marca peso no registrado en precio acordado.": "Enter the line item's weight, or mark the weight as not recorded with an agreed price.",
  "Indica una tarifa válida por libra.": "Enter a valid rate per pound.",
  "Indica el importe acordado para el concepto.": "Enter the agreed amount for the line item.",
  "Catálogo y volumen requieren peso por pieza; separa conceptos si las piezas son distintas.": "Catalog and volume pricing require a weight per piece; split them into separate line items if the pieces differ.",
  "{name}: el peso excede el límite de la caja seleccionada.": "{name}: the weight exceeds the limit of the selected box.",
  "Revisa las piezas del concepto.": "Check the line item's pieces.",
  "Revisa los conceptos.": "Check the line items.",
  // utils/group-weight.ts
  "Revisa el total y la cantidad de piezas.": "Check the total and the number of pieces.",
  "El total es demasiado pequeño para la cantidad de piezas.": "The total is too small for the number of pieces.",
  "El peso conjunto se admite en cobro por peso o carga especial.": "Combined weight is only allowed with weight pricing or special cargo.",
  // utils/billing.ts (calculateBilling)
  "Revisa las medidas, el peso y los factores.": "Check the measurements, the weight and the factors.",
  "Completa las tres medidas.": "Complete all three measurements.",
  "Escribe el peso real.": "Enter the actual weight.",
  "Revisa el importe del cobro.": "Check the charge amount.",
} as const;
