/**
 * Directorio de clientes: `/admin/clientes` (`CUSTOMER_COPY.directory`) y `customer-manager.tsx`
 * (filtros, tabla y alta en mostrador). Los campos del formulario están en `customers-forms.ts`.
 * Clave: español; valor: inglés.
 */
export const customersDirectory = {
  // CUSTOMER_COPY.directory (src/lib/config/customers.ts)
  "Relación con clientes": "Customer relations",
  "Gestor de clientes": "Customer manager",
  "Administra altas, casilleros, saldos y actividad desde un solo directorio.": "Manage sign-ups, lockers, balances and activity from a single directory.",
  "No encontramos clientes": "No customers found",
  "Ajusta los filtros o registra un cliente para comenzar.": "Adjust the filters or register a customer to get started.",
  // Filtros
  "Buscar cliente": "Search customers",
  "Nombre, correo, casillero o teléfono": "Name, email, locker number or phone",
  "Estado de cuenta": "Account status",
  "Todos los estados": "All statuses",
  "Ciudad": "City",
  "Todas las ciudades": "All cities",
  "Nuevo cliente": "New customer",
  "{count} clientes encontrados": "Customers found: {count}",
  // Tabla
  "Casillero": "Locker",
  "Nombre": "Name",
  "Contacto": "Contact",
  "En bodega": "At the warehouse",
  "Saldo pendiente": "Outstanding balance",
  "Último movimiento": "Last activity",
  "Sin movimientos": "No activity",
  "Abrir expediente": "Open record",
  // Alta
  "Registrar cliente": "Register customer",
  "Usa los mismos datos y validaciones del registro público.": "Uses the same fields and validations as public sign-up.",
  "No se confirmó el alta": "The sign-up wasn't confirmed",
  "Conservamos tus datos. Revisa el directorio antes de reintentar.": "Your data is kept. Check the directory before trying again.",
  "No se pudo registrar": "Couldn't register the customer",
  "Cliente registrado": "Customer registered",
  "{code} fue asignado.": "{code} was assigned.",
  "La invitación quedó en cola de correo.": "The invitation is in the email queue.",
  "Sin correo: no se envió invitación.": "No email: no invitation was sent.",
  "Si indicas un correo enviaremos una invitación. Sin correo, puedes registrar y atender al cliente; su acceso al portal queda pendiente.": "If you enter an email, we'll send an invitation. Without an email, you can still register and serve the customer; their portal access stays pending.",
  "Dirección o retiro en bodega": "Address or warehouse pickup",
  "Todos los campos son opcionales. Si retira en bodega, basta el nombre o una referencia; aparecerá en la etiqueta.": "All fields are optional. For warehouse pickup, a name or reference is enough; it will appear on the label.",
  "Bodega o referencia de retiro": "Pickup warehouse or reference",
  "Ej. Bodega Valle de Juárez": "E.g. Valle de Juárez warehouse",
  "Crear cuenta": "Create account",
} as const;
