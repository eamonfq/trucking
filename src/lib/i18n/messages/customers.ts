import { customersArchiveMessages } from "../catalogs/customers-archive";

/**
 * Mensajes de las Server Actions: Clientes, facturas y pagos — invoice-actions.ts, customer-archive-actions.ts y utils/invoice-correction.ts.
 * Los traduce `runMutation` al devolver el resultado (campos `error`, `message`…), según el idioma de la petición.
 * Clave: el texto en español tal como lo devuelve el código; los valores variables van como `{nombre}`
 * («La caja {code} ya está cargada.» cubre cualquier código). Clave: español; valor: inglés.
 */
export const customerMessages = {
  // customer-archive-actions.ts (compartidos con el diálogo, porque la vista previa no pasa por runMutation)
  ...customersArchiveMessages,
  // invoice-actions.ts (correctInvoice)
  "Revisa los campos de la factura.": "Check the invoice fields.",
  "La factura ya no existe.": "The invoice no longer exists.",
  "La factura cambió. Cierra el editor y actualiza antes de corregirla.": "The invoice changed. Close the editor and refresh before correcting it.",
  "Revisa los pagos.": "Check the payments.",
  // utils/invoice-correction.ts (validateInvoiceCorrection, capturado por correctInvoice)
  "El vencimiento no puede ser anterior a la emisión.": "The due date can't be earlier than the issue date.",
  "El total debe ser positivo y estar dentro del límite permitido.": "The total must be positive and within the allowed limit.",
  "Los folios de pago no coinciden con esta factura.": "The payment numbers don't match this invoice.",
  "Los pagos anteriores no se borran. Corrige su estado o referencia; el folio debe conservarse.": "Previous payments aren't deleted. Correct their status or reference; the payment number must be kept.",
  "Clover protege el importe, estado y pagos del cargo. Puedes corregir textos o partidas conservando el mismo total; no se realizan cargos ni reembolsos.": "Clover protects the charge's amount, status and payments. You can correct text or line items while keeping the same total; no charges or refunds are made.",
  "Un pago nuevo no puede superar el total de la factura.": "A new payment can't exceed the invoice total.",
  "Un cargo Clover solo se confirma desde el proveedor.": "A Clover charge can only be confirmed by the provider.",
  "Los cargos reales de Clover no se pueden modificar manualmente.": "Real Clover charges can't be changed manually.",
  "Pago en destino es un acuerdo, no dinero confirmado.": "Payment at destination is an agreement, not confirmed money.",
  "Selecciona la ubicación de cada pago o acuerdo.": "Select the location of each payment or agreement.",
  "Selecciona una ubicación válida.": "Select a valid location.",
  "Para un pago nuevo selecciona un almacén activo.": "For a new payment, select an active warehouse.",
  "Para dejarla pagada, los pagos confirmados deben sumar USD {total}.": "To mark it as paid, confirmed payments must add up to USD {total}.",
  "Hay pagos confirmados. La factura debe quedar pagada y sus importes deben coincidir con el total. No se realizan reembolsos desde este editor.": "There are confirmed payments. The invoice must be marked as paid and its amounts must match the total. No refunds are made from this editor.",
  "El estado debe coincidir con los reportes pendientes de revisión y su importe total.": "The status must match the reports pending review and their total amount.",
  "Agrega o conserva el acuerdo de pago en destino.": "Add or keep the payment-at-destination agreement.",
  // services/payment-records.ts (appendPayment)
  "Selecciona la ubicación donde se registra el pago.": "Select the location where the payment is recorded.",
  "Monto parcial inválido.": "Invalid partial payment amount.",
} as const;
