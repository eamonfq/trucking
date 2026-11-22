/**
 * Entregas en destino (`delivery-desk.tsx` y `/admin/entregas`). Clave: español; valor: inglés.
 */
export const trucksDelivery = {
  // Página
  "Última milla": "Last mile",
  "Entregas": "Deliveries",
  "Confirma quién recibe cada caja y mantén al cliente informado hasta el último paso.": "Confirm who receives each box and keep the customer informed until the last step.",
  "Sin cliente": "No customer",
  "Sin destinatario asociado": "No linked recipient",
  "Sin envío": "No shipment",
  "Sin camión": "No truck",
  "Pendiente de autorización de entrega": "Awaiting delivery authorization",
  "Autorizado para entrega": "Cleared for delivery",
  "{amount} pendiente en facturas vinculadas": "{amount} outstanding on linked invoices",
  "Sin saldo pendiente": "No outstanding balance",
  // Mesa de entregas
  "Buscar caja, envío o cliente": "Search by box, shipment or customer",
  "Ver pendientes": "View pending",
  "Ver entregas registradas": "View recorded deliveries",
  "Envío / guía máster": "Shipment / master waybill",
  "Destinatario previsto": "Expected recipient",
  "Facturación vinculada": "Linked invoices",
  "Recibió: {name}": "Received by: {name}",
  "Entrega bloqueada · revisar pago": "Delivery blocked · check payment",
  "Registrar entrega": "Record delivery",
  "Entrega histórica sin constancia de recepción.": "Past delivery with no proof of receipt.",
  "Sin entregas registradas": "No recorded deliveries",
  "Sin entregas pendientes": "No pending deliveries",
  "Prueba con otro código o cliente.": "Try another code or customer.",
  "Las cajas aparecerán aquí cuando el camión llegue a destino.": "Boxes will appear here when the truck arrives at its destination.",
  "El cierre de un camión no entrega cajas automáticamente. Cada recepción se registra individualmente; el envío se completa al entregar su última caja.": "Closing a truck doesn't deliver its boxes automatically. Each handover is recorded individually; the shipment is complete when its last box is delivered.",
  // Formulario de entrega
  "Entrega registrada": "Delivery recorded",
  "{code} actualizada. Notificación y correo en cola.": "{code} updated. Notification and email queued.",
  "No se pudo guardar. Actualiza antes de volver a intentarlo.": "Couldn't save. Refresh before trying again.",
  "Nombre de quien recibió físicamente": "Name of the person who physically received it",
  "Verificación y observaciones de entrega": "Delivery verification and notes",
  "Ej. Identidad verificada en sucursal, caja recibida sin incidencias.": "E.g. Identity verified at the pickup location, box received with no issues.",
  "Confirma únicamente después de la entrega física. No guardes números de identificación. Este registro no incluye firma digital.": "Confirm only after the physical delivery. Don't store ID numbers. This record doesn't include a digital signature.",
  "Confirmar entrega de {code}": "Confirm delivery of {code}",
} as const;
