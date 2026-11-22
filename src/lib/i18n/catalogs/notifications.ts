/**
 * Avisos al cliente (solo servidor): título y cuerpo de la notificación del panel y del correo
 * que la acompaña. Se guardan ya traducidos al idioma del cliente (`userLocale`), porque la lista
 * de notificaciones los muestra tal cual. Clave: español; valor: inglés.
 */
export const notificationMessages = {
  // Etiquetas de los botones
  "Abrir mi panel": "Open my dashboard",
  "Ver factura": "View invoice",
  "Ver facturas": "View invoices",
  "Revisar factura": "Review invoice",
  "Ver mis cajas": "View my boxes",
  "Ver mis paquetes": "View my packages",
  "Ver seguimiento": "View tracking",
  "Ver conversación": "View conversation",
  "Revisar mi panel": "Check my dashboard",

  // Panel del cliente (src/lib/auth/client-actions.ts)
  "Pre-alerta registrada": "Pre-alert registered",
  "{code} quedó vinculada al tracking {tracking}.": "{code} is now linked to tracking {tracking}.",
  "Envío confirmado": "Shipment confirmed",
  "{code} agrupa {count} cajas hacia {city}.": "{code} groups {count} box(es) going to {city}.",
  "Pago enviado a revisión": "Payment sent for review",
  "Recibimos el reporte de {number}. Operaciones validará los datos del pago; el archivo es opcional.": "We received the payment report for {number}. Operations will verify the payment details; the file is optional.",
  "Contraseña actualizada": "Password updated",
  "La contraseña de tu cuenta se cambió correctamente. Si no fuiste tú, contacta a soporte.": "Your account password was changed successfully. If this wasn't you, contact support.",
  "Ticket de soporte abierto": "Support ticket opened",
  "{code} quedó registrado. Operaciones responderá en el mismo hilo.": "{code} was recorded. Operations will reply in the same thread.",

  // Facturas y recepción (src/lib/auth/admin-actions.ts)
  "Factura emitida · {number}": "Invoice issued · {number}",
  "Tu factura está disponible": "Your invoice is available",
  "{number}: consulta el desglose y reporta tu pago. El comprobante es opcional.": "{number}: check the breakdown and report your payment. The proof of payment is optional.",
  "Factura emitida": "Invoice issued",
  "{number} por 1 caja ya está disponible en tu panel.": "{number} for 1 box is now available in your dashboard.",
  "{number} por {count} cajas ya está disponible en tu panel.": "{number} for {count} boxes is now available in your dashboard.",
  "Caja rechazada": "Box rejected",
  "Caja recibida": "Box received",
  "{code} fue rechazada: {reason}.": "{code} was rejected: {reason}.",
  "{code} fue registrada en bodega como {category}.": "{code} was recorded at the warehouse as {category}.",
  "Recepción rechazada {code}": "Rejected receipt {code}",
  "Caja recibida {code}": "Box received {code}",
  "La recepción requiere tu atención": "Your receipt needs your attention",
  "Tu caja ya está en bodega": "Your box is at the warehouse",
  "Tu carga avanzó de etapa": "Your cargo moved to the next stage",
  "El camión {truck} cambió a {status}.": "Truck {truck} changed to {status}.",
  "Actualización {truck}": "Update {truck}",
  "El camión {truck} cambió al estado {status}.": "Truck {truck} changed to status {status}.",
  "Pago aprobado": "Payment approved",
  "Validamos el pago de {number}. La factura quedó como pagada.": "We verified the payment for {number}. The invoice is now marked as paid.",
  "Tu pago fue aprobado": "Your payment was approved",
  "La factura {number} ahora aparece como pagada.": "Invoice {number} now shows as paid.",
  "Reporte de pago rechazado": "Payment report rejected",
  "{number} necesita un nuevo reporte: {note}": "{number} needs a new report: {note}",
  "Necesitamos revisar tu reporte": "We need to review your report",
  "El reporte de {number} fue rechazado: {note}": "The report for {number} was rejected: {note}",

  // Corrección de facturas (src/lib/auth/invoice-actions.ts)
  "Se corrigió la factura {number}. Motivo: {reason}. Consulta el desglose actualizado en tu panel.": "Invoice {number} was corrected. Reason: {reason}. Check the updated breakdown in your dashboard.",
  "Factura actualizada": "Invoice updated",
  "Factura actualizada · {number}": "Invoice updated · {number}",
  "Tu factura fue actualizada": "Your invoice was updated",

  // Soporte y entregas (src/lib/auth/operations-actions.ts)
  "Soporte respondió tu consulta": "Support replied to your request",
  "Consulta cerrada": "Request closed",
  "Consulta actualizada": "Request updated",
  "{code}: tienes una nueva respuesta en tu panel.": "{code}: you have a new reply in your dashboard.",
  "{code}: cerramos tu consulta.": "{code}: we closed your request.",
  "{code}: tu consulta está en seguimiento.": "{code}: we are following up on your request.",
  "Entrega registrada": "Delivery recorded",
  "{code} fue entregada a {name}.": "{code} was delivered to {name}.",
  "{code} fue entregada a {name}. Todas las cajas de tu envío fueron entregadas.": "{code} was delivered to {name}. All boxes in your shipment were delivered.",

  // Cobros en almacén (src/lib/auth/file-actions.ts)
  "Pago confirmado": "Payment confirmed",
  "{number}: pagos combinados confirmados por USD {total}.": "{number}: combined payments confirmed for USD {total}.",
  "Pago confirmado · {number}": "Payment confirmed · {number}",
  "Tus pagos fueron registrados": "Your payments were recorded",
  "{number}: el total de USD {total} está liquidado mediante pagos combinados. Consulta los folios y métodos en tu factura.": "{number}: the total of USD {total} is paid in full through combined payments. See the payment numbers and methods on your invoice.",
  "Pago pendiente en destino": "Payment due at destination",
  "{number}: el total de {total} USD se pagará en destino.": "{number}: the total of {total} USD will be paid at destination.",
  "Tu pago se realizará en destino": "Your payment will be made at destination",
  "La factura {number}, por {total} USD, sigue pendiente de cobro. La referencia registrada documenta el acuerdo y no acredita un pago.": "Invoice {number}, for {total} USD, is still pending collection. The recorded reference documents the agreement and is not proof of payment.",

  // Correcciones administrativas (src/lib/auth/edit-actions.ts)
  "Se actualizó {record}. Motivo: {reason}": "We updated {record}. Reason: {reason}",
  "tu registro": "your record",
  "Registro actualizado": "Record updated",
  "Registro actualizado · A&L": "Record updated · A&L",
  "Una actualización en tu operación": "An update to your operation",

  // Almacén (src/lib/auth/warehouse-actions.ts)
  "Prealerta reasignada": "Pre-alert reassigned",
  "Operaciones corrigió la asignación de {code}. Ya no está vinculada a tu cuenta.": "Operations corrected the assignment of {code}. It is no longer linked to your account.",
  "Prealerta asignada": "Pre-alert assigned",
  "{code} · tracking {tracking}. Operaciones registró o actualizó tu prealerta.": "{code} · tracking {tracking}. Operations recorded or updated your pre-alert.",
  "Prealerta seleccionada en recepción": "Pre-alert selected at receiving",
  "El equipo seleccionó {code} (tracking {tracking}) para revisar su recepción. La confirmación física se notificará por separado.": "The team selected {code} (tracking {tracking}) to check it at receiving. You will be notified separately when it is physically confirmed.",
  "Paquete cargado": "Package loaded",
  "{code} fue escaneado al ingresar al camión {truck}. Destino: {destination}.": "{code} was scanned when it was loaded onto truck {truck}. Destination: {destination}.",
  "Carga registrada": "Load recorded",
  "{count} paquete(s) fueron cargados al camión {truck}. Destino: {destination}.": "{count} package(s) were loaded onto truck {truck}. Destination: {destination}.",
  "Paquete recibido en {warehouse}": "Package received at {warehouse}",

  // Clover (src/lib/payments/clover.ts)
  "Pago confirmado con Clover": "Payment confirmed with Clover",
  "Pago de USD {amount} confirmado con Clover para {invoices}. Referencia: {reference}.": "Payment of USD {amount} confirmed with Clover for {invoices}. Reference: {reference}.",
  "Tu pago fue confirmado": "Your payment was confirmed",
} as const;
