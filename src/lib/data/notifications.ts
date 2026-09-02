import type { Notification } from "@/lib/types";

export const notifications: Notification[] = [
  { id: "not-001", userId: "usr-001", title: "Caja recibida", body: "Tu caja BX-260002 fue registrada en bodega.", createdAt: "2026-09-01T15:00:00.000Z", read: false },
  { id: "not-002", userId: "usr-001", title: "Envío en camino", body: "El envío SH-260003 avanzó en su ruta a México.", createdAt: "2026-08-31T17:30:00.000Z", read: true },
  { id: "not-003", userId: "usr-002", title: "Pago validado", body: "El pago de tu factura demo fue aprobado.", createdAt: "2026-08-30T12:00:00.000Z", read: false },
];
