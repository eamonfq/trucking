/**
 * Mensajes de las Server Actions: Camiones, entregas y bill of lading — bill-of-lading-actions.ts, package-delivery-actions.ts, utils/bill-of-lading.ts, utils/delivery-payment.ts y utils/truck-load.ts.
 * Los traduce `runMutation` al devolver el resultado (campos `error`, `message`…), según el idioma de la petición.
 * Clave: el texto en español tal como lo devuelve el código; los valores variables van como `{nombre}`
 * («La caja {code} ya está cargada.» cubre cualquier código). Clave: español; valor: inglés.
 */
export const truckMessages = {
  // bill-of-lading-actions.ts
  "Solicitud no válida.": "Invalid request.",
  "No encontramos el camión seleccionado.": "We couldn't find the selected truck.",
  "Los datos del camión no caben en el formato ({path}). Crea uno en blanco.": "The truck's data doesn't fit the form ({path}). Create a blank one.",
  "No encontramos este bill of lading.": "We couldn't find this bill of lading.",
  "Revisa los datos del bill of lading.": "Check the bill of lading details.",
  // Errores del formulario: «{campo}: {mensaje de src/lib/schemas/bill-of-lading.ts}» (el campo es el nombre interno, en inglés).
  "{path}: Máximo {max} caracteres.": "{path}: Up to {max} characters.",
  "{path}: Usa una fecha válida.": "{path}: Use a valid date.",
  "{path}: Escribe un número válido.": "{path}: Enter a valid number.",
  "{path}: No uses números negativos.": "{path}: Don't use negative numbers.",
  "{path}: El número es demasiado grande.": "{path}: The number is too large.",
  "{path}: Máximo 20 filas de pedidos.": "{path}: Up to 20 order rows.",
  "{path}: Máximo 60 filas de carga.": "{path}: Up to 60 cargo rows.",
  "Formulario: {message}": "Form: {message}",
  // truckCargoForBillOfLading no pasa por runMutation: el editor lo traduce con catalogs/trucks-bill-of-lading.ts.
  "El camión ya no existe.": "The truck no longer exists.",
  // package-delivery-actions.ts
  "Escribe el nombre de quien recibe.": "Enter the recipient's name.",
  "Explica el motivo del cambio (al menos 5 caracteres).": "Explain the reason for the change (at least 5 characters).",
  "Revisa los datos de entrega.": "Check the delivery details.",
  "El paquete ya no está en el inventario activo.": "The package is no longer in active inventory.",
  "No se modifica la entrega de un paquete entregado o rechazado.": "The delivery of a delivered or rejected package can't be changed.",
  "El paquete cambió. Actualiza el detalle antes de guardar.": "The package changed. Refresh the details before saving.",
  "El destinatario debe pertenecer al cliente de este paquete.": "The recipient must belong to this package's customer.",
  "Selecciona una dirección guardada o captura una nueva, no ambas.": "Select a saved address or enter a new one, not both.",
  "La dirección debe pertenecer al cliente de este paquete.": "The address must belong to this package's customer.",
  "Selecciona una dirección o escribe una referencia para esta entrega.": "Select an address or enter a reference for this delivery.",
  // utils/delivery-payment.ts (registerDelivery y la mesa de entregas)
  "Entrega bloqueada: falta generar y liquidar la factura de este paquete.": "Delivery blocked: the invoice for this package still has to be issued and paid.",
  "Entrega bloqueada: el envío tiene pagos pendientes de liquidar o validar.": "Delivery blocked: the shipment has payments still to be settled or validated.",
} as const;
