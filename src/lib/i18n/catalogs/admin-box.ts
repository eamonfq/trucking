/** Detalle de caja del admin (`/admin/cajas/[id]`, componente de servidor). Clave: español; valor: inglés. */
export const adminBox = {
  "Volver a bodega": "Back to warehouse",
  "Detalle de caja": "Box details",
  "Imprimir etiqueta": "Print label",
  "Categoría": "Category",
  "Cargo asignado a esta pieza": "Charge assigned to this piece",
  "Precio de la pieza": "Piece price",
  "Peso registrado": "Recorded weight",
  "Medidas": "Dimensions",
  "Concepto: {description} · {quantity} pieza(s) · Total del concepto: {total}": "Line item: {description} · {quantity} piece(s) · Line item total: {total}",
  "Contenido / nota de carga": "Contents / load note",
  "Historial": "History",
  "Fotos de recepción": "Receiving photos",
  "Foto de recepción": "Receiving photo",
  "Registro anterior: solo se conservó el nombre, no el archivo.": "Earlier record: only the name was kept, not the file.",
  "Esta caja no tiene fotografías asociadas.": "This box has no photos.",
  "Vínculos operativos": "Operational links",
  "Recepción": "Receipt",
  "Sin recepción física": "No physical receipt",
  "Camión": "Truck",
  "Sin asignar": "Unassigned",
  "Envío": "Shipment",
  "Sin envío": "No shipment",
  "Facturas vinculadas": "Linked invoices",
  "Sin factura vinculada todavía.": "No linked invoice yet.",
} as const;

/**
 * Textos guardados en español que genera el código y muestra el detalle de caja: nombres de categoría
 * de la carga sin categoría estándar (admin-actions.ts, custom-cargo.ts) y la descripción del cobro
 * (`billingDescription` de src/lib/utils/billing.ts). Se traducen al mostrarlos.
 */
export const adminBoxMessages = {
  "Carga personalizada": "Custom cargo",
  "Paquete por peso": "Package by weight",
  "Paquete por volumen": "Package by volume",
  "Peso conjunto {total} lb / {pieces} piezas · total USD {amount} · peso y cargo de esta pieza prorrateados, no pesaje individual": "Combined weight {total} lb / {pieces} pieces · total USD {amount} · this piece's weight and charge are prorated, not weighed individually",
  "Volumen · ({length} × {width} × {height} in ÷ {base}) × {factor} = USD {amount} · peso real informativo {actual} lb": "Volume · ({length} × {width} × {height} in ÷ {base}) × {factor} = USD {amount} · actual weight for reference {actual} lb",
  "Peso real {actual} lb · cobro {billable} lb × USD {rate}": "Actual weight {actual} lb · billed {billable} lb × USD {rate}",
  "Volumen · peso dimensional {dimensional} lb · cobro {billable} lb × USD {rate} · peso real informativo {actual} lb": "Volume · dimensional weight {dimensional} lb · billed {billable} lb × USD {rate} · actual weight for reference {actual} lb",
  "Peso real {actual} lb · dimensional {dimensional} lb · cobro {billable} lb × USD {rate}": "Actual weight {actual} lb · dimensional {dimensional} lb · billed {billable} lb × USD {rate}",
  "Cotización manual acordada": "Agreed manual quote",
  "Precio fijo": "Fixed price",
} as const;
