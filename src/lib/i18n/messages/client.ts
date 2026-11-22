import { cloverMessages } from "../catalogs/client-clover";

/**
 * Mensajes de las Server Actions: Panel del cliente — client-actions.ts, push-actions.ts, clover-actions.ts y src/lib/payments/clover.ts.
 * Los traduce `runMutation` al devolver el resultado (campos `error`, `message`…), según el idioma de la petición.
 * Clave: el texto en español tal como lo devuelve el código; los valores variables van como `{nombre}`
 * («La caja {code} ya está cargada.» cubre cualquier código). Clave: español; valor: inglés.
 *
 * push-actions.ts y clover-actions.ts no pasan por `runMutation`: sus mensajes están aquí para cuando
 * se envuelvan con `localizeResult`. Los de Clover ya se traducen en el navegador (`cloverMessages`,
 * catalogs/client-clover.ts); los de push necesitan que src/components/pwa/push-settings.tsx los traduzca.
 */
export const clientMessages = {
  // client-actions.ts
  "Tu sesión ya no es válida.": "Your session is no longer valid.",
  "Revisa la pre-alerta.": "Check the pre-alert.",
  "Las prealertas no están habilitadas en el modo de operación actual.": "Pre-alerts aren't enabled in the current operating mode.",
  "Selecciona una categoría disponible.": "Select an available category.",
  "Ese tracking ya fue registrado.": "That tracking number has already been registered.",
  "Revisa el envío.": "Check the shipment.",
  "Una o más cajas no pertenecen a tu cuenta.": "One or more boxes don't belong to your account.",
  "Resuelve las cajas excedidas antes de crear el envío.": "Resolve the boxes that exceed their category before creating the shipment.",
  "Todas las cajas deben estar disponibles en bodega.": "All boxes must be available at the warehouse.",
  "Las cajas seleccionadas tienen otro destinatario asignado en recepción. Solicita a operaciones corregirlo antes de crear el envío.": "The selected boxes have a different recipient assigned at receiving. Ask operations to correct it before creating the shipment.",
  "Selecciona un destinatario con dirección vigente.": "Select a recipient with a current address.",
  "Estas piezas tienen datos de entrega distintos registrados en recepción. Crea envíos separados o solicita una corrección.": "These pieces have different delivery details recorded at receiving. Create separate shipments or request a correction.",
  "Completa la dirección del destinatario antes de solicitar entrega a domicilio.": "Complete the recipient's address before requesting home delivery.",
  "Indica la ciudad o bodega de retiro antes de solicitar el envío.": "Enter the pickup city or warehouse before requesting the shipment.",
  "La entrega a domicilio no está habilitada en este momento.": "Home delivery isn't available at the moment.",
  "Por ahora solo operamos entrega a domicilio.": "For now, we only offer home delivery.",
  "Revisa los datos del pago.": "Check the payment details.",
  "No encontramos la factura en tu cuenta.": "We couldn't find the invoice in your account.",
  "El importe debe coincidir con el total de la factura. Los abonos parciales no están habilitados.": "The amount must match the invoice total. Partial payments aren't enabled.",
  "Revisa las contraseñas.": "Check the passwords.",
  "La contraseña actual no coincide.": "The current password doesn't match.",
  "La contraseña nueva debe ser distinta de la actual.": "The new password must be different from the current one.",
  "Revisa tus datos.": "Check your details.",
  "Ese correo ya está asociado a otra cuenta.": "That email is already linked to another account.",
  "El correo de acceso no se modifica aquí. Contacta a soporte para verificar el cambio.": "Your login email can't be changed here. Contact support to verify the change.",
  "Revisa la dirección.": "Check the address.",
  "No encontramos esa dirección en tu cuenta.": "We couldn't find that address in your account.",
  "La dirección está vinculada a un destinatario. Cámbialo o elimínalo primero.": "The address is linked to a recipient. Change or delete that recipient first.",
  "Revisa el destinatario.": "Check the recipient.",
  "Selecciona una dirección de tu cuenta.": "Select an address from your account.",
  "No encontramos ese destinatario en tu cuenta.": "We couldn't find that recipient in your account.",
  "El destinatario forma parte del historial de envíos y no puede eliminarse.": "The recipient is part of your shipment history and can't be deleted.",
  "Revisa el mensaje.": "Check the message.",
  "No encontramos ese ticket en tu cuenta.": "We couldn't find that ticket in your account.",
  "El ticket está cerrado. Abre uno nuevo para darle seguimiento.": "The ticket is closed. Open a new one to follow up.",
  // push-actions.ts (sin runMutation)
  "Inicia sesión como cliente y comprueba que los avisos estén habilitados.": "Log in as a customer and check that notifications are enabled.",
  "Espera unos minutos antes de reintentar.": "Wait a few minutes before trying again.",
  "El navegador no envió una suscripción compatible.": "The browser didn't send a compatible subscription.",
  // clover-actions.ts, payments/clover.ts y clover-provider.ts (sin runMutation)
  ...cloverMessages,
} as const;
