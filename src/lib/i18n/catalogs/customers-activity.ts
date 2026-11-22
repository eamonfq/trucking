/**
 * Actividad del expediente del cliente. Estos textos se guardan en español al ocurrir cada evento
 * (`CUSTOMER_COPY.activity`, `admin-actions.ts`, `client-actions.ts`, `repository.ts`,
 * `customer-archive-actions.ts` y los datos de ejemplo) y se traducen al mostrarlos con
 * `useMessageTranslator`. Las notas escritas por el equipo no se traducen. Clave: español; valor: inglés.
 */
export const customersActivity = {
  // CUSTOMER_COPY.activity (src/lib/config/customers.ts)
  "Cuenta creada y casillero asignado.": "Account created and locker assigned.",
  "Datos de contacto actualizados.": "Contact details updated.",
  "Dirección agregada al expediente.": "Address added to the record.",
  "Dirección actualizada.": "Address updated.",
  "Dirección eliminada.": "Address deleted.",
  "Destinatario agregado al expediente.": "Recipient added to the record.",
  "Destinatario actualizado.": "Recipient updated.",
  "Destinatario eliminado.": "Recipient deleted.",
  "Cuenta activada.": "Account activated.",
  "Cuenta desactivada.": "Account deactivated.",
  "Contraseña temporal generada.": "Temporary password generated.",
  "Número de casillero actualizado.": "Locker number updated.",
  "Nota interna agregada.": "Internal note added.",
  // Alta (repository.ts) y datos de ejemplo (src/lib/data/users.ts)
  "Cuenta creada. Verificación de correo pendiente.": "Account created. Email verification pending.",
  "Cliente registrado sin correo. Acceso al portal pendiente.": "Customer registered without email. Portal access pending.",
  "Cuenta activada y casillero asignado.": "Account activated and locker assigned.",
  "Cuenta creada; validación documental pendiente.": "Account created; document validation pending.",
  // Acciones del cliente desde su panel (client-actions.ts)
  "Pre-alerta {code} registrada con tracking {tracking}.": "Pre-alert {code} registered with tracking {tracking}.",
  "Envío {code} creado hacia {city}.": "Shipment {code} created for {city}.",
  "Pago reportado para {number}.": "Payment reported for {number}.",
  "Contraseña actualizada desde el panel.": "Password updated from the dashboard.",
  "Datos de contacto actualizados desde el panel.": "Contact details updated from the dashboard.",
  "Dirección {label} actualizada.": "Address {label} updated.",
  "Dirección {label} agregada.": "Address {label} added.",
  "Dirección {label} eliminada.": "Address {label} deleted.",
  "Destinatario {name} actualizado.": "Recipient {name} updated.",
  "Destinatario {name} agregado.": "Recipient {name} added.",
  "Destinatario {name} eliminado.": "Recipient {name} deleted.",
  "Ticket {code} abierto: {subject}.": "Ticket {code} opened: {subject}.",
  // Retiro y restauración de cajas (customer-archive-actions.ts)
  "{count} caja(s) retirada(s) del inventario; restaurables. Facturas y pagos conservados. {reason}": "{count} box(es) removed from inventory; restorable. Invoices and payments kept. {reason}",
  "{count} caja(s) restaurada(s) al inventario. {reference}": "{count} box(es) restored to inventory. {reference}",
  // Autores que no son una persona (admin-actions.ts y repository.ts)
  "Operaciones A&L": "A&L Operations",
  "Sistema": "System",
  // Estado que devuelve resetCustomerPassword (no pasa por la traducción de runMutation)
  "Recuperación en cola": "Password reset queued",
} as const;
