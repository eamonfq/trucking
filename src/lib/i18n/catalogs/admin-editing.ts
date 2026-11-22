/**
 * Edición con trazabilidad (`/admin/edicion` y `src/components/admin/operation-editor.tsx`, que también
 * usa `/cliente/editar`). Clave: español; valor: inglés.
 */
export const adminEditing = {
  // Página
  "Control operativo": "Operational control",
  "Cambios claros. Historial intacto.": "Clear changes. Intact history.",
  "Corrige cajas, envíos, facturas, camiones, choferes y asuntos de soporte. Cada cambio queda registrado y se notifica al cliente cuando corresponde.": "Correct boxes, shipments, invoices, trucks, drivers and support subjects. Every change is recorded, and the customer is notified when appropriate.",
  "Editar clientes y direcciones": "Edit customers and addresses",
  "Editar reglas y tarifas": "Edit rules and rates",
  "Capacidad y programación": "Capacity and scheduling",
  "Últimas correcciones": "Latest corrections",
  "Usuario registrado": "Registered user",
  "Sin correcciones todavía.": "No corrections yet.",
  // Editor: tipos de registro
  "Cajas / prealertas": "Boxes / pre-alerts",
  "Envíos": "Shipments",
  "Facturas": "Invoices",
  "Camiones": "Trucks",
  "Choferes": "Drivers",
  "Soporte": "Support",
  "Reportes de pago": "Payment reports",
  // Editor
  "Editar con trazabilidad": "Edit with traceability",
  "Los cambios conservan el registro anterior, el responsable y el motivo. Las operaciones cerradas admiten aclaraciones, no cambios silenciosos de importes o estados.": "Changes keep the previous record, who made them and why. Closed operations accept clarifications, not silent changes to amounts or statuses.",
  "Buscar por código o nombre": "Search by code or name",
  "Tipo de registro": "Record type",
  "Todos": "All",
  "Registro a corregir": "Record to correct",
  "Selecciona un registro": "Select a record",
  "Aún no hay registros operativos. Aparecerán aquí al trabajar con el sistema.": "No operational records yet. They'll appear here as you work with the system.",
  "Corrección guardada con historial.": "Correction saved with history.",
  "No pudimos confirmar el guardado. Actualiza antes de reintentar.": "We couldn't confirm the save. Refresh before trying again.",
  "Este registro tiene vínculos, facturación o movimientos que deben conservarse. Puedes agregar una aclaración; usa las acciones operativas para retirar una asignación o rechazar un reporte pendiente.": "This record has links, billing or activity that must be kept. You can add a clarification; use the operational actions to remove an assignment or reject a pending report.",
  "Solo agregar una aclaración": "Only add a clarification",
  "Motivo de la corrección (visible en el historial)": "Reason for the correction (shown in the history)",
  "Cambiar tarifas aquí modifica solo este documento. No cambia el tarifario global. Fotos y comprobantes siguen siendo opcionales.": "Changing rates here only modifies this document. It doesn't change the global rate table. Photos and proofs remain optional.",
  "Guardar corrección": "Save correction",
} as const;

/** Etiquetas de campos y opciones que genera `src/lib/services/editable-records.ts`; el editor las traduce al mostrarlas. */
const adminEditFieldLabels = {
  "Tracking de origen": "Origin tracking",
  "Categoría": "Category",
  "Carga personalizada": "Custom cargo",
  "Largo (in)": "Length (in)",
  "Ancho (in)": "Width (in)",
  "Alto (in)": "Height (in)",
  "Peso (lb)": "Weight (lb)",
  "Destinatario": "Recipient",
  "Entrega": "Delivery",
  "Sucursal": "Pickup location",
  "Domicilio": "Home delivery",
  "Método de pago": "Payment method",
  "Referencia de pago": "Payment reference",
  "Vencimiento": "Due date",
  "{category} · precio por unidad (USD)": "{category} · unit price (USD)",
  "Seguro acordado (USD)": "Agreed insurance (USD)",
  "Entrega acordada (USD)": "Agreed delivery (USD)",
  "Recargos (USD)": "Surcharges (USD)",
  "Placa": "License plate",
  "Chofer": "Driver",
  "Notas operativas": "Operational notes",
  "Nombre": "Name",
  "Teléfono": "Phone",
  "Licencia": "License",
  "Chofer activo": "Active driver",
  "Asunto": "Subject",
  "{number} · reporte {status}": "{number} · report {status}",
} as const;

/**
 * Mensajes de `src/lib/auth/edit-actions.ts`. Los dos primeros se devuelven antes de `runMutation`,
 * así que el editor también los traduce al mostrarlos; `messages/admin.ts` incluye todos.
 */
export const adminEditActionMessages = {
  "Tu rol solo permite recepción y consulta de paquetes.": "Your role only allows receiving and viewing packages.",
  "Inicia sesión para editar.": "Log in to edit.",
  "Revisa los campos y explica el motivo (5 a 1000 caracteres).": "Check the fields and explain the reason (5 to 1000 characters).",
  "No puedes editar este registro.": "You can't edit this record.",
  "El registro cambió. Actualiza la página antes de editar.": "The record changed. Refresh the page before editing.",
  "El cobro Clover protege esta factura contra cambios. Concilia el cargo antes de modificarla.": "The Clover charge protects this invoice from changes. Reconcile the charge before modifying it.",
  "Las medidas/categoría solo se corrigen antes de vincular o facturar la caja. Puedes agregar una aclaración sin alterar el historial.": "Dimensions/category can only be corrected before the box is linked or invoiced. You can add a clarification without altering the history.",
  "Ese tracking ya está registrado.": "That tracking number is already registered.",
  "Selecciona una categoría activa.": "Select an active category.",
  "Completa las tres medidas.": "Fill in all three dimensions.",
  "La categoría no admite las medidas/peso indicados.": "The category doesn't fit the given dimensions/weight.",
  "Esta pieza usa peso conjunto. No se puede cambiar su peso aisladamente; conserva el total de la recepción.": "This piece uses a combined weight. Its weight can't be changed on its own; keep the receipt total.",
  "La entrega fue registrada en recepción. Solicita a operaciones corregir el destinatario o la dirección de estas piezas.": "The delivery was recorded at receiving. Ask operations to correct the recipient or address of these pieces.",
  "Retira la asignación al camión antes de cambiar la entrega. Después del despacho solo se permiten aclaraciones.": "Remove the truck assignment before changing the delivery. After dispatch, only clarifications are allowed.",
  "El destinatario debe pertenecer al cliente y tener dirección vigente.": "The recipient must belong to the customer and have a current address.",
  "Ese método de entrega está deshabilitado.": "That delivery method is disabled.",
  "Solo se corrige un reporte pendiente de revisión.": "Only a report pending review can be corrected.",
  "No se alteran importes durante revisión ni después del pago. Agrega una aclaración o rechaza primero el reporte pendiente.": "Amounts can't be changed during review or after payment. Add a clarification or reject the pending report first.",
  "El vencimiento debe ser válido y posterior a la emisión.": "The due date must be valid and later than the issue date.",
  "El total debe ser positivo para admitir reportes de pago.": "The total must be positive to accept payment reports.",
  "Después del despacho se conservan los datos de la salida; agrega una aclaración.": "After dispatch, the departure details are kept; add a clarification.",
  "Selecciona un chofer activo.": "Select an active driver.",
  "Reasigna o cierra sus camiones antes de desactivar al chofer.": "Reassign or close their trucks before deactivating the driver.",
  "Revisa el formato y los límites de los campos.": "Check the format and limits of the fields.",
  "No se pudo editar.": "Couldn't edit.",
} as const;

/** Todo lo que el editor traduce en tiempo de ejecución. */
export const adminEditMessages = { ...adminEditFieldLabels, ...adminEditActionMessages } as const;
