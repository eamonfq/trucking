/** Retiro de cajas del expediente (`customer-archive-dialog.tsx`). Clave: español; valor: inglés. */
export const customersArchive = {
  "No se pudo consultar la recepción.": "Couldn't look up the receipt.",
  "No se confirmó el retiro. Actualiza antes de reintentar.": "The removal wasn't confirmed. Refresh before trying again.",
  "Retirar caja o recepción": "Remove box or receipt",
  "Cancelar": "Cancel",
  "Retirar del inventario": "Remove from inventory",
  "Se retiran del inventario y del panel del cliente, con opción de restaurar desde este expediente. Las facturas, pagos y fotos se conservan: no se anulan cobros ni se devuelven importes.": "They're removed from inventory and from the customer's dashboard, and can be restored from this record. Invoices, payments and photos are kept: no charges are voided and no amounts are refunded.",
  "Qué deseas retirar": "What to remove",
  "Recepción completa · todas las cajas": "Entire receipt · all boxes",
  "Solo esta caja": "This box only",
  "Revisar impacto": "Review impact",
  "{count} caja(s) se retirarán.": "{count} box(es) will be removed.",
  "{invoices} factura(s) se conservan, {paid} pagada(s). Si el retiro requiere ajustes de facturación, revísalos por separado en Facturas.": "{invoices} invoice(s) kept, {paid} paid. If the removal requires billing adjustments, review them separately in Invoices.",
  "Motivo del retiro": "Reason for removal",
  "Ej. cancelación del cliente, corrección o error de registro": "E.g. customer cancellation, correction or data entry error",
  // La palabra de confirmación sigue siendo RETIRAR: la exige el servidor (customer-archive-actions.ts).
  "Escribe RETIRAR para confirmar": "Type RETIRAR to confirm",
} as const;

/**
 * Mensajes de `customer-archive-actions.ts`. `archiveCustomerBoxes` y `restoreCustomerBoxes` los
 * traducen en `runMutation` (se incluyen en `messages/customers.ts`); `previewCustomerArchive` no pasa
 * por `runMutation`, así que el diálogo los traduce al mostrarlos. Clave: español; valor: inglés.
 */
export const customersArchiveMessages = {
  "La caja ya no está en el inventario activo.": "The box is no longer in active inventory.",
  "El grupo incluye a otro cliente. Revisa sus vínculos.": "The group includes another customer. Check its links.",
  "Primero retira la asignación al envío o camión. El retiro no modifica movimientos logísticos.": "First remove the shipment or truck assignment. The removal doesn't change logistics movements.",
  "Solo se pueden retirar cajas o recepciones antes de su despacho.": "Boxes or receipts can only be removed before dispatch.",
  "Esta caja usa un peso conjunto. Retira la recepción completa, no una pieza con peso desconocido.": "This box uses a combined weight. Remove the entire receipt, not a piece with an unknown weight.",
  "Hay un cobro Clover en curso o por conciliar. Verifica su resultado antes de retirar estas cajas.": "There's a Clover charge in progress or pending reconciliation. Check its result before removing these boxes.",
  "Selecciona una caja o recepción.": "Select a box or receipt.",
  "No se pudo preparar el retiro.": "Couldn't prepare the removal.",
  "Escribe RETIRAR y explica el motivo.": "Type RETIRAR and explain the reason.",
  "No se puede retirar.": "It can't be removed.",
  "La operación cambió. Revisa nuevamente la vista previa.": "The operation changed. Review the preview again.",
  "El registro ya fue restaurado o no existe.": "The record was already restored or doesn't exist.",
  "El cliente ya no existe. No se restauraron cajas.": "The customer no longer exists. No boxes were restored.",
  "Hay una caja con el mismo código. Revisa el inventario antes de restaurar.": "There's a box with the same code. Check the inventory before restoring.",
} as const;
