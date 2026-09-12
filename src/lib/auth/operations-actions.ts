"use server";

import { deliveryPaymentError } from "@/lib/utils/delivery-payment";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/actions";
import { audit } from "@/lib/auth/repository";
import { runMutation } from "@/lib/db/mutation";
import { boxes, invoices, shipments, supportTickets, notifications, users } from "@/lib/db/collections";
import { deliverBoxWithCascade } from "@/lib/domain/state-machine";
import { sendEmail, siteUrl } from "@/lib/services/email";
import { SUPPORT_STATUSES } from "@/lib/types";

const supportInput = z.object({ ticketId: z.string().min(1), expectedUpdatedAt: z.string().min(1), body: z.string().trim().max(4000).default(""), status: z.enum(SUPPORT_STATUSES) });
export async function manageSupportTicket(input: unknown) {
  return runMutation("admin", async () => {
    const parsed = supportInput.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: "Revisa el mensaje y el estado del ticket." };
    const actor = await requireAdminUser();
    const { ticketId, expectedUpdatedAt, body, status } = parsed.data;
    const ticket = supportTickets.find(item => item.id === ticketId);
    if (!ticket) return { ok: false as const, error: "No encontramos el ticket." };
    if (ticket.updatedAt !== expectedUpdatedAt) return { ok: false as const, error: "El ticket recibió cambios. Actualiza antes de responder." };
    if (!body && status === ticket.status) return { ok: false as const, error: "Escribe una respuesta o cambia el estado." };
    if (body && body.length < 5) return { ok: false as const, error: "La respuesta debe tener al menos 5 caracteres." };
    if (ticket.status === "cerrado" && body) return { ok: false as const, error: "Reabre el ticket antes de responder." };
    const at = new Date(Math.max(Date.now(), Date.parse(ticket.updatedAt) + 1)).toISOString();
    if (body) ticket.messages.push({ id: `msg-${crypto.randomUUID()}`, author: "soporte", authorName: `${actor.firstName} ${actor.paternalLastName}`, body, at });
    ticket.status = status; ticket.updatedAt = at;
    const title = body ? "Soporte respondió tu consulta" : status === "cerrado" ? "Consulta cerrada" : "Consulta actualizada";
    const summary = body ? `${ticket.code}: tienes una nueva respuesta en tu panel.` : `${ticket.code}: ${status === "cerrado" ? "cerramos tu consulta" : "tu consulta está en seguimiento"}.`;
    notifications.unshift({ id: `not-${crypto.randomUUID()}`, userId: ticket.userId, title, body: summary, createdAt: at, read: false });
    const user = users.find(item => item.id === ticket.userId);
    if (user) await sendEmail({ to: user.email, subject: `${title} · ${ticket.code}`, heading: title, body: summary, actionLabel: "Ver conversación", actionUrl: `${siteUrl()}/cliente/soporte` });
    await audit(actor.id, "support.updated");
    return { ok: true as const, ticket: { ...ticket } };
  });
}

const deliveryInput = z.object({ boxId: z.string().min(1), receivedBy: z.string().trim().min(3, "Escribe el nombre de quien recibe.").max(160), note: z.string().trim().min(5, "Documenta cómo se verificó la entrega.").max(1000) });
export async function registerDelivery(input: unknown) {
  return runMutation("admin", async () => {
    const parsed = deliveryInput.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la entrega." };
    const actor = await requireAdminUser();
    const { boxId, receivedBy, note } = parsed.data;
    const target=boxes.find(b=>b.id===boxId);
    if(!target)return {ok:false as const,error:"Paquete no encontrado."};
    const blocked=deliveryPaymentError(target,invoices,boxes);if(blocked)return {ok:false as const,error:blocked};
    const at = new Date().toISOString();
    const result = deliverBoxWithCascade(boxId, boxes, shipments, { actor: `${actor.firstName} ${actor.paternalLastName}`, at, note: `Recibe: ${receivedBy}. ${note}` });
    if (!result.ok) return result;
    const box = result.value.boxes.find(item => item.id === boxId)!;
    box.deliveryReceipt = { receivedBy, note, deliveredAt: at, actorId: actor.id };
    boxes[boxes.findIndex(item => item.id === boxId)] = box;
    for (const id of result.value.completedShipmentIds) shipments[shipments.findIndex(item => item.id === id)] = result.value.shipments.find(item => item.id === id)!;
    const title = "Entrega registrada";
    const body = `${box.code} fue entregada a ${receivedBy}.${result.value.completedShipmentIds.length ? " Todas las cajas de tu envío fueron entregadas." : ""}`;
    notifications.unshift({ id: `not-${crypto.randomUUID()}`, userId: box.userId, title, body, createdAt: at, read: false });
    const user = users.find(item => item.id === box.userId);
    if (user) await sendEmail({ to: user.email, subject: `${title} · ${box.code}`, heading: title, body, actionLabel: "Ver seguimiento", actionUrl: `${siteUrl()}/cliente/cajas/${box.code}` });
    await audit(actor.id, "delivery.registered");
    return { ok: true as const, box };
  });
}
