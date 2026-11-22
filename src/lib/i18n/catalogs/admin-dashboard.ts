/**
 * Resumen del admin (`/admin`) y página de pendientes (`/admin/pendientes`), componentes de servidor.
 * Clave: español; valor: inglés.
 */
export const adminDashboard = {
  // /admin
  "Centro de control": "Control center",
  "Operación A&L": "A&L operations",
  "Del ingreso en Miami a la última entrega. Prioridades, carga y clientes en una sola vista.": "From intake in Miami to the final delivery. Priorities, loads and customers in a single view.",
  "Abrir pendientes": "Open to-do list",
  "Pagos por revisar": "Payments to review",
  "Consultas sin respuesta": "Unanswered inquiries",
  "Cajas listas para entrega": "Boxes ready for delivery",
  "Cajas en bodega": "Boxes at the warehouse",
  "Camiones activos": "Active trucks",
  "Entregadas": "Delivered",
  "Por cobrar": "To collect",
  "Atención del equipo": "Team focus",
  "Lo que necesita avanzar hoy": "What needs to move forward today",
  "{count} facturas vencidas": "{count} overdue invoices",
  "1 facturas vencidas": "1 overdue invoice",
  "Guías máster recientes": "Recent master waybills",
  "Ver todas": "View all",
  "{route} · {count} cajas": "{route} · {count} boxes",
  "{route} · 1 cajas": "{route} · 1 box",
  "Todavía no hay guías máster. Crea un camión para organizar la primera salida.": "No master waybills yet. Create a truck to organize the first departure.",
  // /admin/pendientes
  "Pendientes": "To-do",
  "Mesa operativa": "Operations desk",
  "Prioridades reales del sistema, ordenadas por atención y antigüedad. Cada pendiente te lleva a la herramienta para resolverlo.": "Real priorities from the system, sorted by urgency and age. Each item takes you to the tool that resolves it.",
  "Cliente no disponible": "Customer unavailable",
  "Pendiente de recepción física · {tracking}": "Awaiting physical receipt · {tracking}",
  "Sin tracking": "No tracking",
  "En destino, pendiente de registrar quién recibe": "At destination, recipient not yet recorded",
  "{loaded} de {total} cajas asignadas · {city}": "{loaded} of {total} boxes assigned · {city}",
  "Clover: conciliar cargo antes de volver a cobrar": "Clover: reconcile the charge before charging again",
  "Pendiente de pago en destino": "Awaiting payment at destination",
  "Reporte pendiente de validación": "Report awaiting validation",
  "Factura vencida": "Overdue invoice",
  "El cliente espera una respuesta": "The customer is waiting for a reply",
  "En seguimiento con soporte": "Being followed up by support",
} as const;

/** Rutas de camión generadas por el código («Origen por confirmar → Monterrey»). */
export const adminRouteMessages = {
  "Origen por confirmar → {city}": "Origin to be confirmed → {city}",
} as const;
