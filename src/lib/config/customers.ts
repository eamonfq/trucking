export const CUSTOMER_STATUS = {
  active: { label: "Activo", className: "bg-success-50 text-success-700" },
  inactive: { label: "Inactivo", className: "bg-stone-100 text-navy-500" },
} as const;

/**
 * Textos en español, que son las claves de los catálogos en inglés: `customers-directory.ts`,
 * `customers-detail.ts` (pestañas) y `customers-activity.ts`. `activity` se guarda en español en el
 * historial del cliente y se traduce al mostrarlo, así que estos valores no deben cambiar sin su catálogo.
 */
export const CUSTOMER_COPY = {
  directory: {
    eyebrow: "Relación con clientes",
    title: "Gestor de clientes",
    description: "Administra altas, casilleros, saldos y actividad desde un solo directorio.",
    emptyTitle: "No encontramos clientes",
    emptyDescription: "Ajusta los filtros o registra un cliente para comenzar.",
  },
  detail: {
    description: "Consulta y actualiza el expediente operativo, financiero y de contacto.",
  },
  tabs: ["Datos", "Direcciones", "Destinatarios", "Cajas", "Envíos", "Facturas", "Notas internas", "Actividad"],
  activity: {
    created: "Cuenta creada y casillero asignado.",
    profileUpdated: "Datos de contacto actualizados.",
    addressCreated: "Dirección agregada al expediente.",
    addressUpdated: "Dirección actualizada.",
    addressDeleted: "Dirección eliminada.",
    recipientCreated: "Destinatario agregado al expediente.",
    recipientUpdated: "Destinatario actualizado.",
    recipientDeleted: "Destinatario eliminado.",
    statusActivated: "Cuenta activada.",
    statusDeactivated: "Cuenta desactivada.",
    passwordReset: "Contraseña temporal generada.",
    lockerChanged: "Número de casillero actualizado.",
    noteAdded: "Nota interna agregada.",
  },
} as const;
