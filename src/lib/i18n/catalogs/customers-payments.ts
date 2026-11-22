/**
 * Cobro y movimientos de pago: `payment-capture.tsx` (forma de pago en mostrador, recepción y
 * facturas) y `payment-history.tsx` (folios de una factura; también en el panel del cliente).
 * Clave: español; valor: inglés.
 */
export const customersPayments = {
  // Formas de pago (etiquetas de las opciones)
  "Efectivo": "Cash",
  "En destino": "At destination",
  "Tarjeta externa": "External card",
  "Clover · cobrar": "Clover · charge",
  "Transferencia": "Transfer",
  "Depósito": "Deposit",
  "Zelle": "Zelle",
  "Cheque": "Check",
  "Combinar pagos": "Combine payments",
  // payment-capture.tsx
  "Selecciona la forma de pago": "Select the payment method",
  "Verificando…": "Checking…",
  "Requiere configuración": "Needs setup",
  "Verificando configuración de Clover…": "Checking Clover setup…",
  "Clover está disponible como método, pero todavía no puede cobrar.": "Clover is available as a method, but it can't charge yet.",
  "Si ya actualizaste las variables, reinicia el proceso de la aplicación en PM2 para que las lea.": "If you've already updated the variables, restart the app process in PM2 so it reads them.",
  "Volver a verificar": "Check again",
  "Total a cubrir": "Total due",
  "Por calcular": "To be calculated",
  "Monto pagado (USD)": "Amount paid (USD)",
  "Importe recibido; debe coincidir con el total. No se realiza un cargo bancario desde aquí.": "Amount received; it must match the total. No bank charge is made from here.",
  "Registra importes ya recibidos. No realiza cargos bancarios. La suma debe cubrir el total.": "Record amounts already received. No bank charges are made. The sum must cover the total.",
  "Pago {n} · método": "Payment {n} · method",
  "Pago {n} · monto USD": "Payment {n} · amount USD",
  "Pago {n} · número de cheque (opcional)": "Payment {n} · check number (optional)",
  "Pago {n} · referencia (opcional)": "Payment {n} · reference (optional)",
  "Completar restante": "Fill remaining",
  "Quitar pago": "Remove payment",
  "Agregar otro pago": "Add another payment",
  "Diferencia: {amount}": "Difference: {amount}",
  "Ubicación del registro": "Recording location",
  "Selecciona almacén": "Select warehouse",
  "Número de cheque / referencia (opcional)": "Check number / reference (optional)",
  "Referencia externa / transacción (opcional)": "External reference / transaction (optional)",
  "Ej. CH-001234": "E.g. CH-001234",
  "Ej. autorización o referencia bancaria": "E.g. authorization or bank reference",
  "Registra el número del cheque si lo tienes. El folio interno se genera automáticamente.": "Enter the check number if you have it. The internal number is generated automatically.",
  "No incluyas datos completos de tarjeta. El folio interno se genera automáticamente.": "Don't include full card details. The internal number is generated automatically.",
  "Completa la tarjeta en el formulario seguro. Solo se confirmará el pago cuando Clover lo apruebe.": "Enter the card in the secure form. The payment is confirmed only when Clover approves it.",
  "Pendiente de pago en destino. Se generará un folio de acuerdo; no registra dinero recibido.": "Pending payment at destination. An agreement number will be generated; no money received is recorded.",
  "Al guardar confirmas que recibiste el total. Se generará un folio de pago único y quedará registrado en la factura.": "By saving, you confirm you received the total. A unique payment number will be generated and recorded on the invoice.",
  // payment-history.tsx
  "Pago confirmado": "Payment confirmed",
  "En revisión": "Under review",
  "Reporte rechazado": "Report rejected",
  "Acuerdo · sin dinero recibido": "Agreement · no money received",
  "Folios y movimientos": "Payment numbers and transactions",
  "Referencia externa: {reference}": "External reference: {reference}",
  "Ubicación pendiente de validación": "Location pending validation",
  "Registrado por: {name}": "Recorded by: {name}",
  "Validado por: {name}": "Validated by: {name}",
  "Guía: {codes} · Paquetes: {packages}": "Shipment: {codes} · Packages: {packages}",
  "Pendiente de asignar": "Not yet assigned",
  "Factura: {number} · Paquetes vinculados: {count}": "Invoice: {number} · Linked packages: {count}",
} as const;

/**
 * Métodos de pago tal como se guardan (`efectivo`, `zelle`…). Se muestran crudos en español; en
 * inglés se traducen al mostrarlos con `translateMessage`. Clave: valor guardado; valor: inglés.
 */
export const paymentMethodNames = {
  "efectivo": "cash",
  "destino": "at destination",
  "tarjeta": "external card",
  "transferencia": "transfer",
  "deposito": "deposit",
  "zelle": "Zelle",
  "cheque": "check",
  "mixto": "combined",
  "clover": "Clover",
} as const;

/**
 * Avisos de configuración de Clover: los devuelve `cloverAvailability()` (clover-provider.ts) o los
 * genera `payment-capture.tsx`; se traducen al mostrarlos. Clave: español; valor: inglés.
 */
export const cloverIssues = {
  "Activa CLOVER_ENABLED=true.": "Enable CLOVER_ENABLED=true.",
  "Configura CLOVER_ENVIRONMENT como production o sandbox.": "Set CLOVER_ENVIRONMENT to production or sandbox.",
  "Falta {name} en el proceso del servidor.": "{name} is missing in the server process.",
  "NEXT_PUBLIC_SITE_URL debe usar HTTPS en producción.": "NEXT_PUBLIC_SITE_URL must use HTTPS in production.",
  "Configura el proxy confiable y TRUST_PROXY=true en producción.": "Set up the trusted proxy and TRUST_PROXY=true in production.",
  "La verificación tardó demasiado. Comprueba la conexión y vuelve a verificar.": "The check took too long. Check the connection and verify again.",
  "No se pudo consultar Clover en el servidor. Revisa la conexión o recarga la página después del despliegue.": "Couldn't check Clover on the server. Check the connection or reload the page after the deployment.",
  "El servidor no confirmó la configuración de Clover.": "The server didn't confirm the Clover setup.",
} as const;
