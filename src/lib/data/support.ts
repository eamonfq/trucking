import type { SupportTicket } from "@/lib/types";

export const supportTickets: SupportTicket[] = [
  {
    id: "tkt-001",
    code: "AYL-000481",
    userId: "usr-001",
    subject: "Cambio de destinatario en el envío SH-260003",
    status: "en-revision",
    createdAt: "2026-08-30T16:10:00.000Z",
    updatedAt: "2026-08-31T14:20:00.000Z",
    messages: [
      { id: "msg-001", author: "cliente", authorName: "Mariana Demo", body: "Necesito cambiar a la persona que recibe el envío SH-260003 porque mi hermana ya no estará en esa dirección.", at: "2026-08-30T16:10:00.000Z" },
      { id: "msg-002", author: "soporte", authorName: "Operaciones A&L", body: "Ya lo revisamos. Mientras el camión no salga de Miami podemos cambiar al destinatario; registra la persona nueva en Destinatarios y responde aquí con su nombre.", at: "2026-08-31T14:20:00.000Z" },
    ],
  },
  {
    id: "tkt-002",
    code: "AYL-000474",
    userId: "usr-001",
    subject: "Comprobante de pago de la factura AL-26-0002",
    status: "cerrado",
    createdAt: "2026-08-24T18:00:00.000Z",
    updatedAt: "2026-08-25T15:45:00.000Z",
    messages: [
      { id: "msg-003", author: "cliente", authorName: "Mariana Demo", body: "Subí el comprobante pero no veo el cambio en la factura.", at: "2026-08-24T18:00:00.000Z" },
      { id: "msg-004", author: "soporte", authorName: "Operaciones A&L", body: "El comprobante llegó correctamente y la factura quedó marcada como pagada. Cerramos el ticket.", at: "2026-08-25T15:45:00.000Z" },
    ],
  },
  {
    id: "tkt-003",
    code: "AYL-000468",
    userId: "usr-002",
    subject: "Horario de recepción en bodega",
    status: "abierto",
    createdAt: "2026-08-20T13:30:00.000Z",
    updatedAt: "2026-08-20T13:30:00.000Z",
    messages: [
      { id: "msg-005", author: "cliente", authorName: "Diego Demo", body: "¿Hasta qué hora reciben cajas los sábados?", at: "2026-08-20T13:30:00.000Z" },
    ],
  },
];
