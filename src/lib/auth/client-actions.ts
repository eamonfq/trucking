"use server";

import { getSession } from "@/lib/auth/actions";
import { addresses, recipients } from "@/lib/data/addresses";
import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { notifications } from "@/lib/data/notifications";
import { shipments } from "@/lib/data/shipments";
import { supportTickets } from "@/lib/data/support";
import { demoCredentials, users } from "@/lib/data/users";
import { transitionInvoice, transitionShipment } from "@/lib/domain/state-machine";
import { changePasswordSchema } from "@/lib/schemas/auth";
import { customerAddressSchema, customerProfileSchema, customerRecipientSchema } from "@/lib/schemas/customer";
import { createShipmentSchema, paymentReportSchema, prealertSchema, supportReplySchema, supportSchema } from "@/lib/schemas/logistics";
import { configService } from "@/lib/services/config";
import { simulateLatency } from "@/lib/services/delay";
import { sendEmail } from "@/lib/services/email";
import type { Address, Box, Recipient, Shipment, SupportTicket, User } from "@/lib/types";
import { toClientUser } from "@/lib/utils/users";

const nextId = (prefix: string, length: number) => `${prefix}-${String(length + 1).padStart(3, "0")}`;
const fullName = (user: User) => `${user.firstName} ${user.paternalLastName}`.trim();

async function currentClient() {
  const session = await getSession();
  if (!session || session.role !== "cliente") return null;
  return users.find((user) => user.id === session.userId && user.role === "cliente" && user.active) ?? null;
}

function recordActivity(user: User, type: string, description: string) {
  user.activity.unshift({ id: `act-${crypto.randomUUID()}`, type, description, actor: fullName(user), at: new Date().toISOString() });
}

async function notify(userId: string, title: string, body: string, href = "/cliente") {
  const user = users.find((item) => item.id === userId);
  const createdAt = new Date().toISOString();
  notifications.unshift({ id: nextId("not", notifications.length), userId, title, body, createdAt, read: false });
  if (user) await sendEmail({ to: user.email, subject: title, heading: title, body, actionLabel: "Abrir mi panel", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${href}` });
}

export async function createPrealert(input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = prealertSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la pre-alerta." };
  const rates = await configService.getRateTable();
  const category = rates.find((item) => item.id === parsed.data.estimatedCategory);
  if (!category) return { ok: false as const, error: "Selecciona una categoría disponible." };
  if (boxes.some((box) => box.originTracking?.toLowerCase() === parsed.data.tracking.toLowerCase())) return { ok: false as const, error: "Ese tracking ya fue registrado." };
  const at = new Date().toISOString();
  const box: Box = { id: nextId("box", boxes.length), code: `BX-26${String(boxes.length + 1).padStart(4, "0")}`, userId: user.id, categoryId: category.id, status: "pre-alertada", dimensions: { ...category.dimensions }, weightLb: 0, originTracking: parsed.data.tracking, photos: [], timeline: [{ from: null, to: "pre-alertada", actor: fullName(user), at, note: `${parsed.data.store}: ${parsed.data.description}. Valor declarado USD ${parsed.data.declaredValue}.` }] };
  boxes.push(box);
  recordActivity(user, "pre-alerta", `Pre-alerta ${box.code} registrada con tracking ${parsed.data.tracking}.`);
  await notify(user.id, "Pre-alerta registrada", `${box.code} quedó vinculada al tracking ${parsed.data.tracking}.`, `/cliente/cajas/${box.code}`);
  return { ok: true as const, box };
}

export async function createClientShipment(input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = createShipmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el envío." };
  const selected = boxes.filter((box) => parsed.data.boxIds.includes(box.id));
  if (selected.length !== parsed.data.boxIds.length || selected.some((box) => box.userId !== user.id)) return { ok: false as const, error: "Una o más cajas no pertenecen a tu cuenta." };
  if (selected.some((box) => box.status === "excede-categoria")) return { ok: false as const, error: "Resuelve las cajas excedidas antes de crear el envío." };
  if (selected.some((box) => box.status !== "en-bodega" || box.truckId || box.shipmentId)) return { ok: false as const, error: "Todas las cajas deben estar disponibles en bodega." };
  const recipient = recipients.find((item) => item.id === parsed.data.recipientId && item.userId === user.id);
  const address = recipient && addresses.find((item) => item.id === recipient.addressId && item.userId === user.id);
  if (!recipient || !address) return { ok: false as const, error: "Selecciona un destinatario con dirección vigente." };
  const flow = await configService.getFlowConfig();
  if (parsed.data.deliveryMethod === "domicilio" && flow.deliveryMode === "sucursal") return { ok: false as const, error: "La entrega a domicilio no está habilitada en este momento." };
  if (parsed.data.deliveryMethod === "sucursal" && flow.deliveryMode === "domicilio") return { ok: false as const, error: "Por ahora solo operamos entrega a domicilio." };
  const at = new Date().toISOString();
  const draft: Shipment = { id: nextId("ship", shipments.length), code: `SH-26${String(shipments.length + 1).padStart(4, "0")}`, userId: user.id, recipientId: recipient.id, boxIds: selected.map((box) => box.id), status: "pendiente", destinationCity: address.municipality, timeline: [{ from: null, to: "pendiente", actor: fullName(user), at, note: `Solicitud creada con ${selected.length} cajas. Entrega: ${parsed.data.deliveryMethod === "domicilio" ? "a domicilio" : "en sucursal"}.` }] };
  const confirmed = transitionShipment(draft, "confirmado", { actor: "Sistema A&L", at, note: "Cajas elegibles y destinatario validados." });
  if (!confirmed.ok) return confirmed;
  shipments.push(confirmed.value);
  selected.forEach((box) => { box.shipmentId = confirmed.value.id; });
  recordActivity(user, "envío", `Envío ${confirmed.value.code} creado hacia ${confirmed.value.destinationCity}.`);
  await notify(user.id, "Envío confirmado", `${confirmed.value.code} agrupa ${confirmed.value.boxIds.length} cajas hacia ${confirmed.value.destinationCity}.`, `/cliente/envios/${confirmed.value.code}`);
  return { ok: true as const, shipment: confirmed.value };
}

export async function reportInvoicePayment(invoiceId: string, input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = paymentReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del pago." };
  const index = invoices.findIndex((invoice) => invoice.id === invoiceId && invoice.userId === user.id);
  if (index < 0) return { ok: false as const, error: "No encontramos la factura en tu cuenta." };
  const result = transitionInvoice(invoices[index]!, "pago-reportado", { actor: fullName(user), note: `Pago reportado con referencia ${parsed.data.reference}.` });
  if (!result.ok) return result;
  invoices[index] = { ...result.value, paymentReport: { amountUsd: parsed.data.amount, method: parsed.data.method, reference: parsed.data.reference, receiptName: parsed.data.receiptName, reportedAt: new Date().toISOString() }, paymentReviewNote: undefined };
  recordActivity(user, "pago", `Pago reportado para ${invoices[index]!.number}.`);
  await notify(user.id, "Pago enviado a revisión", `Recibimos el reporte de ${invoices[index]!.number}. Operaciones validará el comprobante.`, `/cliente/facturas/${invoiceId}`);
  return { ok: true as const, invoice: invoices[index]! };
}

export async function markClientNotificationsRead(notificationId?: string) {
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  notifications.filter((item) => item.userId === user.id && (!notificationId || item.id === notificationId)).forEach((item) => { item.read = true; });
  return { ok: true as const, unread: notifications.filter((item) => item.userId === user.id && !item.read).length };
}

export async function changeClientPassword(input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa las contraseñas." };
  const credentials = demoCredentials.filter((item) => item.userId === user.id);
  if (!credentials.some((item) => item.password === parsed.data.currentPassword)) return { ok: false as const, error: "La contraseña actual no coincide." };
  if (parsed.data.currentPassword === parsed.data.password) return { ok: false as const, error: "La contraseña nueva debe ser distinta de la actual." };
  credentials.forEach((item) => { item.password = parsed.data.password; });
  recordActivity(user, "seguridad", "Contraseña actualizada desde el panel.");
  await notify(user.id, "Contraseña actualizada", "La contraseña de tu cuenta se cambió correctamente. Si no fuiste tú, contacta a soporte.", "/cliente/cuenta/seguridad");
  return { ok: true as const };
}

export async function updateClientProfile(input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = customerProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa tus datos." };
  const email = parsed.data.email.toLowerCase();
  if (users.some((item) => item.id !== user.id && item.email.toLowerCase() === email)) return { ok: false as const, error: "Ese correo ya está asociado a otra cuenta." };
  const previousEmail = user.email;
  Object.assign(user, parsed.data, { email, phone: parsed.data.phone.startsWith("+52") ? parsed.data.phone : `+52${parsed.data.phone}`, rfc: parsed.data.rfc || undefined });
  demoCredentials.filter((item) => item.userId === user.id && item.identifier === previousEmail).forEach((item) => { item.identifier = email; });
  recordActivity(user, "perfil", "Datos de contacto actualizados desde el panel.");
  return { ok: true as const, user: toClientUser(user) };
}

export async function upsertClientAddress(input: unknown, addressId?: string) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = customerAddressSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la dirección." };
  let address: Address;
  if (addressId) {
    const index = addresses.findIndex((item) => item.id === addressId && item.userId === user.id);
    if (index < 0) return { ok: false as const, error: "No encontramos esa dirección en tu cuenta." };
    address = { ...addresses[index]!, ...parsed.data };
    addresses[index] = address;
    recordActivity(user, "dirección", `Dirección ${address.label} actualizada.`);
  } else {
    address = { id: nextId("addr", addresses.length), userId: user.id, ...parsed.data };
    addresses.push(address);
    recordActivity(user, "dirección", `Dirección ${address.label} agregada.`);
  }
  return { ok: true as const, address };
}

export async function deleteClientAddress(addressId: string) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const index = addresses.findIndex((item) => item.id === addressId && item.userId === user.id);
  if (index < 0) return { ok: false as const, error: "No encontramos esa dirección en tu cuenta." };
  if (recipients.some((recipient) => recipient.addressId === addressId)) return { ok: false as const, error: "La dirección está vinculada a un destinatario. Cámbialo o elimínalo primero." };
  const [removed] = addresses.splice(index, 1);
  recordActivity(user, "dirección", `Dirección ${removed!.label} eliminada.`);
  return { ok: true as const };
}

export async function upsertClientRecipient(input: unknown, recipientId?: string) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = customerRecipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el destinatario." };
  if (!addresses.some((address) => address.id === parsed.data.addressId && address.userId === user.id)) return { ok: false as const, error: "Selecciona una dirección de tu cuenta." };
  const normalized = { ...parsed.data, phone: parsed.data.phone.startsWith("+52") ? parsed.data.phone : `+52${parsed.data.phone}` };
  let recipient: Recipient;
  if (recipientId) {
    const index = recipients.findIndex((item) => item.id === recipientId && item.userId === user.id);
    if (index < 0) return { ok: false as const, error: "No encontramos ese destinatario en tu cuenta." };
    recipient = { ...recipients[index]!, ...normalized };
    recipients[index] = recipient;
    recordActivity(user, "destinatario", `Destinatario ${recipient.name} actualizado.`);
  } else {
    recipient = { id: nextId("rec", recipients.length), userId: user.id, ...normalized };
    recipients.push(recipient);
    recordActivity(user, "destinatario", `Destinatario ${recipient.name} agregado.`);
  }
  return { ok: true as const, recipient };
}

export async function deleteClientRecipient(recipientId: string) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const index = recipients.findIndex((item) => item.id === recipientId && item.userId === user.id);
  if (index < 0) return { ok: false as const, error: "No encontramos ese destinatario en tu cuenta." };
  if (shipments.some((shipment) => shipment.recipientId === recipientId && shipment.status !== "entregado")) return { ok: false as const, error: "El destinatario tiene envíos en curso. Espera a que se entreguen." };
  const [removed] = recipients.splice(index, 1);
  recordActivity(user, "destinatario", `Destinatario ${removed!.name} eliminado.`);
  return { ok: true as const };
}

export async function createSupportTicket(input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = supportSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el mensaje." };
  const at = new Date().toISOString();
  const ticket: SupportTicket = {
    id: nextId("tkt", supportTickets.length),
    code: `AYL-${String(supportTickets.length + 482).padStart(6, "0")}`,
    userId: user.id,
    subject: parsed.data.subject,
    status: "abierto",
    createdAt: at,
    updatedAt: at,
    messages: [{ id: `msg-${crypto.randomUUID()}`, author: "cliente", authorName: fullName(user), body: parsed.data.message, at }],
  };
  supportTickets.unshift(ticket);
  recordActivity(user, "soporte", `Ticket ${ticket.code} abierto: ${ticket.subject}.`);
  await notify(user.id, "Ticket de soporte abierto", `${ticket.code} quedó registrado. Operaciones responderá en el mismo hilo.`, "/cliente/soporte");
  return { ok: true as const, ticket };
}

export async function replySupportTicket(ticketId: string, input: unknown) {
  await simulateLatency();
  const user = await currentClient();
  if (!user) return { ok: false as const, error: "Tu sesión ya no es válida." };
  const parsed = supportReplySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el mensaje." };
  const ticket = supportTickets.find((item) => item.id === ticketId && item.userId === user.id);
  if (!ticket) return { ok: false as const, error: "No encontramos ese ticket en tu cuenta." };
  if (ticket.status === "cerrado") return { ok: false as const, error: "El ticket está cerrado. Abre uno nuevo para darle seguimiento." };
  const at = new Date().toISOString();
  ticket.messages.push({ id: `msg-${crypto.randomUUID()}`, author: "cliente", authorName: fullName(user), body: parsed.data.message, at });
  ticket.status = "abierto";
  ticket.updatedAt = at;
  return { ok: true as const, ticket: { ...ticket, messages: [...ticket.messages] } };
}
