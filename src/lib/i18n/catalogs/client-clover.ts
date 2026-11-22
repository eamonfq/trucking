/**
 * Pago con tarjeta por Clover (`src/components/payments/*`). Lo usan el panel del cliente y los
 * cobros del admin. Clave: español; valor: inglés.
 */
export const clover = {
  // clover-checkout.tsx
  "No se pudo consultar el pago.": "The payment couldn't be checked.",
  "Clover rechazó la tarjeta. No se confirmó un pago. Abre de nuevo el formulario para usar otra tarjeta.": "Clover declined the card. No payment was confirmed. Open the form again to use another card.",
  "No se confirmó el pago. Consulta el estado antes de intentar otra vez.": "The payment wasn't confirmed. Check the status before trying again.",
  "Pago seguro Clover": "Secure Clover payment",
  "Pagar con Clover": "Pay with Clover",
  "Tarjeta en formulario seguro. Solo se confirma el pago con la respuesta de Clover.": "Your card goes in a secure form. The payment is confirmed only by Clover's response.",
  "No se pudo consultar la factura.": "The invoice couldn't be checked.",
  "Abrir pago seguro": "Open secure payment",
  "Selecciona la ubicación del cobro.": "Select where the payment is collected.",
  "Total · {count} factura(s)": "Total · {count} invoice(s)",
  "Pago confirmado. Referencia: {reference}": "Payment confirmed. Reference: {reference}",
  "Continuar": "Continue",
  "Pago en verificación. No vuelvas a cobrar ni uses otro método hasta confirmar el resultado. Intento: {id}": "Payment being verified. Don't charge again or use another method until the result is confirmed. Attempt: {id}",
  "Consultar estado": "Check status",
  "ID del cargo en Clover": "Clover charge ID",
  "Copia el ID desde Clover para verificarlo. Esta consulta no realiza otro cargo.": "Copy the ID from Clover to verify it. This check doesn't make another charge.",
  "No se pudo verificar. No repitas el cobro.": "It couldn't be verified. Don't repeat the charge.",
  "Verificar cargo con Clover": "Verify charge with Clover",
  "Pagar {amount}": "Pay {amount}",
  // clover-card-fields.tsx
  "Número de tarjeta": "Card number",
  "Vencimiento": "Expiration date",
  "CVV": "CVV",
  "Código postal": "ZIP code",
  "No se pudo consultar la configuración de Clover.": "The Clover settings couldn't be checked.",
  "No se pudo abrir Clover.": "Clover couldn't be opened.",
  "Clover no está disponible.": "Clover isn't available.",
  "No se pudo cargar Clover. Revisa tu conexión y vuelve a intentar.": "Clover couldn't be loaded. Check your connection and try again.",
  "Espera a que el formulario seguro esté listo.": "Wait for the secure form to be ready.",
  "Revisa número de tarjeta, vencimiento, CVV y código postal.": "Check the card number, expiration date, CVV and ZIP code.",
  "Datos seguros de tarjeta Clover": "Secure Clover card details",
  "Modo de pruebas · no usar tarjetas reales": "Test mode · don't use real cards",
  "Reintentar": "Retry",
  "Cargando formulario seguro…": "Loading secure form…",
  "Procesado por Clover. No guardamos el número de tarjeta ni el CVV.": "Processed by Clover. We don't store the card number or CVV.",
} as const;

/**
 * Mensajes de las Server Actions de Clover (`src/lib/auth/clover-actions.ts`, `src/lib/payments/clover.ts`
 * y `clover-provider.ts`). Esas acciones no pasan por `runMutation`, así que el componente los traduce
 * al mostrarlos (`useMessageTranslator`); también se incluyen en `messages/client.ts`.
 */
export const cloverMessages = {
  // clover-actions.ts
  "Inicia sesión para usar Clover.": "Log in to use Clover.",
  "No se pudo confirmar la operación. Revisa el estado antes de volver a pagar.": "The operation couldn't be confirmed. Check the status before paying again.",
  "Inicia sesión con una cuenta autorizada.": "Log in with an authorized account.",
  "Demasiados intentos. Espera antes de continuar.": "Too many attempts. Wait before continuing.",
  "No se pudo verificar la IP del navegador. Revisa el proxy.": "The browser's IP address couldn't be verified. Check the proxy.",
  // payments/clover.ts
  "No tienes permiso para cobrar o pagar.": "You don't have permission to charge or pay.",
  "Selecciona entre 1 y 50 facturas.": "Select between 1 and 50 invoices.",
  "Las facturas deben pertenecer al mismo cliente y estar dentro de tus permisos.": "The invoices must belong to the same customer and be within your permissions.",
  "Hay distintos cobros en curso. Revisa cada factura.": "There are different charges in progress. Check each invoice.",
  "El pago requiere revisión administrativa.": "The payment requires administrative review.",
  "No mezcles facturas nuevas con un cargo existente.": "Don't mix new invoices with an existing charge.",
  "Otra factura de esta recepción ya tiene un cobro en curso. Abre esa factura para consultar el estado.": "Another invoice from this receipt already has a charge in progress. Open that invoice to check its status.",
  "Hay facturas pagadas o con un reporte por revisar. Actualiza antes de pagar.": "Some invoices are already paid or have a report pending review. Refresh before paying.",
  "La tarjeta no se pudo tokenizar.": "The card couldn't be tokenized.",
  "Esta tarjeta ya fue tokenizada para otro intento. Abre un formulario nuevo.": "This card was already tokenized for another attempt. Open a new form.",
  "La factura ya cambió; actualiza antes de cobrar.": "The invoice has changed; refresh before charging.",
  "El total cambió. Revisa el importe antes de confirmar.": "The total changed. Check the amount before confirming.",
  "Selecciona el almacén del cobro.": "Select the warehouse for this payment.",
  "Clover confirmó el cargo; conciliación local pendiente. No vuelvas a pagar.": "Clover confirmed the charge; local reconciliation is pending. Don't pay again.",
  "Indica el ID del cargo de Clover.": "Enter the Clover charge ID.",
  "Solo administración puede conciliar.": "Only administration can reconcile.",
  "No hay un cobro pendiente de conciliación.": "There's no charge pending reconciliation.",
  "Restaura la cuenta y entorno originales para conciliar.": "Restore the original account and environment to reconcile.",
  "El cargo no coincide con este intento. No se modificó el pago.": "The charge doesn't match this attempt. The payment wasn't changed.",
  // payments/clover-provider.ts (la lista {issues} es un diagnóstico de configuración y queda en español)
  "Clover no está habilitado: {issues}": "Clover isn't enabled: {issues}",
  "Faltan credenciales Clover.": "Clover credentials are missing.",
} as const;
