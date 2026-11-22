/**
 * Documentos del cliente en PDF (solo servidor): factura carta, factura térmica de 80 mm y recibo de
 * recepción. Siguen el idioma del cliente (`userLocale`), también cuando los descarga el admin.
 * Clave: español; valor: inglés.
 */
export const pdfInvoice = {
  // Factura carta (src/lib/pdf/invoice-document.tsx)
  "Factura {number}": "Invoice {number}",
  "USA → México": "USA → Mexico",
  "Factura": "Invoice",
  "{number} · Estado: {status}": "{number} · Status: {status}",
  "Categoría": "Category",
  "Cantidad": "Quantity",
  "Precio": "Price",
  "Importe": "Amount",
  "Subtotal": "Subtotal",
  "Recargo por excedente": "Excess surcharge",
  "Seguro": "Insurance",
  "Entrega": "Delivery",
  "Total": "Total",
  "Documento operativo de cobro. No sustituye un comprobante fiscal. Los pagos están sujetos a validación por A&L.": "Operational billing document. It does not replace a tax receipt. Payments are subject to verification by A&L.",

  // Factura térmica y recibo de recepción (src/lib/pdf/thermal-document.tsx)
  "Recibo {reference}": "Receipt {reference}",
  "RECIBO DE RECEPCIÓN": "RECEIVING RECEIPT",
  "FACTURA - VOUCHER": "INVOICE - VOUCHER",
  "{count} unidad(es) recibida(s)": "{count} unit(s) received",
  "Peso conjunto: {weight} lb. Las piezas no se pesaron individualmente.": "Combined weight: {weight} lb. The pieces were not weighed individually.",
  "Origen: {origin}": "Origin: {origin}",
  "Destinatario: {name} / {phone}": "Recipient: {name} / {phone}",
  "Estado: {status}": "Status: {status}",
  "Recargo": "Surcharge",
  "Total factura": "Invoice total",
  "Folio: {folio}": "Number: {folio}",
  "Referencia: {reference}": "Reference: {reference}",
  "Sin ubicación": "No location",
  "RESUMEN DE PAGOS CONFIRMADOS": "CONFIRMED PAYMENTS SUMMARY",
  "TOTAL": "TOTAL",
  "ESTIMADO": "ESTIMATE",
  "Pendiente de pago: {amount}": "Balance due: {amount}",
  "PAGO CONFIRMADO": "PAYMENT CONFIRMED",
  "PENDIENTE DE PAGO EN DESTINO": "PAYMENT DUE AT DESTINATION",
  "CONSULTA EL ESTADO DE LAS FACTURAS": "CHECK THE STATUS OF YOUR INVOICES",
  "Importe estimado de recepción. Consulta facturas y pagos en el panel; este recibo no acredita un pago.": "Estimated receiving amount. Check invoices and payments in your dashboard; this receipt is not proof of payment.",
  "Documento operativo. No sustituye un comprobante fiscal. Solo los pagos confirmados acreditan dinero recibido.": "Operational document. It does not replace a tax receipt. Only confirmed payments are proof of money received.",
} as const;

/**
 * Textos guardados en español que el PDF traduce al mostrarlos (`translateMessage`): métodos y estados
 * de pago (identificadores) y la descripción de cobro que genera `billingDescription()`
 * (src/lib/utils/billing.ts), con o sin el prefijo «código · contenido · » de la línea de factura.
 * Si una descripción fue editada a mano y no coincide, se muestra tal cual.
 */
export const pdfStoredTexts = {
  // Métodos de pago
  "efectivo": "cash",
  "tarjeta": "card",
  "transferencia": "transfer",
  "deposito": "deposit",
  "zelle": "Zelle",
  "cheque": "check",
  "destino": "payment at destination",
  "clover": "Clover",
  "mixto": "mixed",
  // Estados de un pago
  "confirmado": "confirmed",
  "pendiente": "pending",
  "rechazado": "rejected",
  "acuerdo": "agreement",
  // Descripción de cobro de una línea
  "Peso conjunto {total} lb / {pieces} piezas · total USD {amount} · peso y cargo de esta pieza prorrateados, no pesaje individual": "Combined weight {total} lb / {pieces} pieces · total USD {amount} · this piece's weight and charge are prorated, not weighed individually",
  "{prefix}Peso conjunto {total} lb / {pieces} piezas · total USD {amount} · peso y cargo de esta pieza prorrateados, no pesaje individual": "{prefix}Combined weight {total} lb / {pieces} pieces · total USD {amount} · this piece's weight and charge are prorated, not weighed individually",
  "Volumen · ({formula}) × {factor} = USD {amount} · peso real informativo {actual} lb": "Volume · ({formula}) × {factor} = USD {amount} · actual weight for reference {actual} lb",
  "{prefix}Volumen · ({formula}) × {factor} = USD {amount} · peso real informativo {actual} lb": "{prefix}Volume · ({formula}) × {factor} = USD {amount} · actual weight for reference {actual} lb",
  "Peso real {actual} lb · cobro {billable} lb × USD {price}": "Actual weight {actual} lb · billed {billable} lb × USD {price}",
  "{prefix}Peso real {actual} lb · cobro {billable} lb × USD {price}": "{prefix}Actual weight {actual} lb · billed {billable} lb × USD {price}",
  "Volumen · peso dimensional {dimensional} lb · cobro {billable} lb × USD {price} · peso real informativo {actual} lb": "Volume · dimensional weight {dimensional} lb · billed {billable} lb × USD {price} · actual weight for reference {actual} lb",
  "{prefix}Volumen · peso dimensional {dimensional} lb · cobro {billable} lb × USD {price} · peso real informativo {actual} lb": "{prefix}Volume · dimensional weight {dimensional} lb · billed {billable} lb × USD {price} · actual weight for reference {actual} lb",
  "Peso real {actual} lb · dimensional {dimensional} lb · cobro {billable} lb × USD {price}": "Actual weight {actual} lb · dimensional {dimensional} lb · billed {billable} lb × USD {price}",
  "{prefix}Peso real {actual} lb · dimensional {dimensional} lb · cobro {billable} lb × USD {price}": "{prefix}Actual weight {actual} lb · dimensional {dimensional} lb · billed {billable} lb × USD {price}",
  "Cotización manual acordada": "Agreed manual quote",
  "{prefix}Cotización manual acordada": "{prefix}Agreed manual quote",
  "Precio fijo": "Fixed price",
  "{prefix}Precio fijo": "{prefix}Fixed price",
} as const;
