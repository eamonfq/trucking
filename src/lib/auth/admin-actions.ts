"use server";
import { warehouseSupports } from "@/lib/config/warehouses";
import { appendPayment, paymentLocation } from "@/lib/services/payment-records";
import { calculateBilling, billingDescription } from "@/lib/utils/billing";
import { CUSTOM_CARGO_ID, CUSTOM_CARGO_NAME } from "@/lib/config/custom-cargo";
import { requireAdminUser } from "./actions";
import { warehouses } from "@/lib/db/collections";
import { recordRevision } from "@/lib/db/revision";
import { runMutation } from "@/lib/db/mutation";

import { boxes } from "@/lib/db/collections";
import { invoices } from "@/lib/db/collections";
import { shipments } from "@/lib/db/collections";
import { trucks } from "@/lib/db/collections";
import { users } from "@/lib/db/collections";
import { createAccount, synchronizeAccount } from "@/lib/auth/repository";
import { sendAccountLink } from "@/lib/auth/account-email";
import { randomToken } from "@/lib/auth/crypto";
import { matchesInvoiceTotal } from "@/lib/utils/invoices";
import { addresses, recipients } from "@/lib/db/collections";
import { drivers } from "@/lib/db/collections";
import { notifications } from "@/lib/db/collections";
import { configService } from "@/lib/services/config";
import { sendEmail, siteUrl } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import { transitionBox, transitionInvoice, transitionTruckWithCascade } from "@/lib/domain/state-machine";
import type { BoxCategory, BoxCategoryId } from "@/lib/config/box-categories";
import type { FlowConfig } from "@/lib/config/flow";
import type { Address, Box, Invoice, Recipient, Truck, User } from "@/lib/types";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { receptionSchema, truckSchema } from "@/lib/schemas/admin";
import { getStatusLabel } from "@/lib/config/status";
import { CUSTOMER_COPY } from "@/lib/config/customers";
import { customerAddressSchema, customerProfileSchema, customerRecipientSchema, internalNoteSchema, lockerCodeSchema, quickCustomerSchema } from "@/lib/schemas/customer";

const adminActor = "Operaciones A&L";
const now = () => new Date().toISOString();
const nextId = (prefix: string, length: number) => `${prefix}-${length + 1}-${crypto.randomUUID()}`;
const findCustomer = (userId: string) => users.find((user) => user.id === userId && user.role === "cliente");
const recordCustomerActivity = (user: User, type: string, description: string) => user.activity.unshift({ id: `act-${crypto.randomUUID()}`, type, description, actor: adminActor, at: now() });
const pushNotification = (userId: string, title: string, body: string) => { const notification = { id: nextId("not", notifications.length), userId, title, body, createdAt: now(), read: false }; notifications.unshift(notification); return notification; };

type NewCustomer = {
  firstName: string; paternalLastName: string; maternalLastName?: string;
  email: string; phone: string; rfc?: string;
  street: string; exteriorNumber: string; interiorNumber?: string; neighborhood: string;
  postalCode: string; municipality: string; state: string; references?: string;
};

/** Alta de cliente compartida por el gestor y por la recepción en bodega. */
async function registerCustomer(data: NewCustomer) { return createAccount(data, randomToken()); }

export async function createCustomerAsAdmin(input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const parsed = quickCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };
  if (users.some((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase())) return { ok: false as const, error: "Ya existe una cuenta con ese correo." };
  const { user, address } = await registerCustomer(parsed.data);
  await sendAccountLink(user, "invite");
  return { ok: true as const, user, address };

  });
}

/**
 * Alta rápida desde el mostrador de recepción: el operador no define contraseña,
 * se envía una invitación de un solo uso para que el cliente defina su contraseña.
 */
export async function createCustomerAtReception(input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const parsed = quickCustomerSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };
  if (users.some((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase())) return { ok: false as const, error: "Ya existe una cuenta con ese correo." };
  const { user, address } = await registerCustomer(parsed.data);
  await sendAccountLink(user, "invite");
  return { ok: true as const, user, address, invitationStatus: "Invitación en cola" };

  });
}

export async function updateCustomerProfile(userId: string, input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = customerProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };
  if (users.some((item) => item.id !== userId && item.email.toLowerCase() === parsed.data.email.toLowerCase())) return { ok: false as const, error: "Ese correo ya está asociado a otra cuenta." };
  if (user.email !== parsed.data.email.toLowerCase()) return { ok: false as const, error: "Por seguridad, el correo de acceso no se modifica desde este formulario." };
  Object.assign(user, parsed.data, { email: parsed.data.email.toLowerCase(), phone: parsed.data.phone, rfc: parsed.data.rfc || undefined });
  await synchronizeAccount(user);
  recordCustomerActivity(user, "perfil", CUSTOMER_COPY.activity.profileUpdated);
  return { ok: true as const, user };

  });
}

export async function toggleCustomerStatus(userId: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  user.active = !user.active;
  await synchronizeAccount(user);
  recordCustomerActivity(user, "estado", user.active ? CUSTOMER_COPY.activity.statusActivated : CUSTOMER_COPY.activity.statusDeactivated);
  return { ok: true as const, user };

  });
}

export async function resetCustomerPassword(userId: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  recordCustomerActivity(user, "seguridad", CUSTOMER_COPY.activity.passwordReset);
  await sendAccountLink(user, "reset");
  return { ok: true as const, user, invitationStatus: "Recuperación en cola" };

  });
}

export async function changeCustomerLocker(userId: string, input: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = lockerCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el casillero." };
  if (users.some((item) => item.id !== userId && item.lockerCode === parsed.data)) return { ok: false as const, error: "Ese casillero ya está asignado." };
  user.lockerCode = parsed.data;
  await synchronizeAccount(user);
  recordCustomerActivity(user, "casillero", CUSTOMER_COPY.activity.lockerChanged);
  return { ok: true as const, user };

  });
}

export async function addCustomerNote(userId: string, input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = internalNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la nota." };
  const note = { id: `note-${crypto.randomUUID()}`, body: parsed.data.body, actor: adminActor, at: now() };
  user.internalNotes.unshift(note);
  recordCustomerActivity(user, "nota", CUSTOMER_COPY.activity.noteAdded);
  return { ok: true as const, user, note };

  });
}

export async function upsertCustomerAddress(userId: string, input: unknown, addressId?: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = customerAddressSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la dirección." };
  let address: Address;
  if (addressId) {
    const index = addresses.findIndex((item) => item.id === addressId && item.userId === userId);
    if (index < 0) return { ok: false as const, error: "No encontramos la dirección." };
    address = { ...addresses[index]!, ...parsed.data };
    addresses[index] = address;
    recordCustomerActivity(user, "dirección", CUSTOMER_COPY.activity.addressUpdated);
  } else {
    address = { id: nextId("addr", addresses.length), userId, ...parsed.data };
    addresses.push(address);
    recordCustomerActivity(user, "dirección", CUSTOMER_COPY.activity.addressCreated);
  }
  return { ok: true as const, user, address };

  });
}

export async function deleteCustomerAddress(userId: string, addressId: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  const index = addresses.findIndex((item) => item.id === addressId && item.userId === userId);
  if (!user || index < 0) return { ok: false as const, error: "No encontramos la dirección." };
  if (recipients.some((recipient) => recipient.addressId === addressId)) return { ok: false as const, error: "La dirección está vinculada a un destinatario. Cámbialo o elimínalo primero." };
  addresses.splice(index, 1);
  recordCustomerActivity(user, "dirección", CUSTOMER_COPY.activity.addressDeleted);
  return { ok: true as const, user };

  });
}

export async function upsertCustomerRecipient(userId: string, input: unknown, recipientId?: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = customerRecipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el destinatario." };
  if (!addresses.some((address) => address.id === parsed.data.addressId && address.userId === userId)) return { ok: false as const, error: "Selecciona una dirección del cliente." };
  const normalized = { ...parsed.data, phone: parsed.data.phone };
  let recipient: Recipient;
  if (recipientId) {
    const index = recipients.findIndex((item) => item.id === recipientId && item.userId === userId);
    if (index < 0) return { ok: false as const, error: "No encontramos el destinatario." };
    recipient = { ...recipients[index]!, ...normalized };
    recipients[index] = recipient;
    recordCustomerActivity(user, "destinatario", CUSTOMER_COPY.activity.recipientUpdated);
  } else {
    recipient = { id: nextId("rec", recipients.length), userId, ...normalized };
    recipients.push(recipient);
    recordCustomerActivity(user, "destinatario", CUSTOMER_COPY.activity.recipientCreated);
  }
  return { ok: true as const, user, recipient };

  });
}

export async function deleteCustomerRecipient(userId: string, recipientId: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const user = findCustomer(userId);
  const index = recipients.findIndex((item) => item.id === recipientId && item.userId === userId);
  if (!user || index < 0) return { ok: false as const, error: "No encontramos el destinatario." };
  if (shipments.some(shipment => shipment.recipientId === recipientId)) return { ok: false as const, error: "El destinatario forma parte del historial de envíos." };
  recipients.splice(index, 1);
  recordCustomerActivity(user, "destinatario", CUSTOMER_COPY.activity.recipientDeleted);
  return { ok: true as const, user };

  });
}

async function createInvoiceForBoxes(userId: string, invoiceBoxes: Box[], actor: string) {
  const rates = await configService.getCatalog();
  const groups = new Map<string, Invoice["lines"][number]>();
  invoiceBoxes.forEach(box=>{
    const rate=rates.find(r=>r.id===box.categoryId);
    const price=box.customPriceUsd??rate?.priceUsd??0;
    const description=box.billing ? `${box.code} · ${billingDescription(box.billing)}` : undefined;
    const key=box.billing ? box.id : `${box.categoryId}:${price}`;
    const previous=groups.get(key);
    groups.set(key,{categoryId:box.categoryId,categoryName:box.categoryName??rate?.name??box.categoryId,description,quantity:(previous?.quantity??0)+1,unitPriceUsd:price});
  });
  const flow = await configService.getFlowConfig();
  const issuedAt = now();
  const invoice: Invoice = {
    id: nextId("inv", invoices.length),
    number: `AL-26-${String(invoices.length + 1).padStart(4, "0")}`,
    userId,
    shipmentId: invoiceBoxes.find((box) => box.shipmentId)?.shipmentId ?? "",
    boxIds: invoiceBoxes.map((box) => box.id),
    status: "emitida",
    issuedAt,
    dueAt: new Date(new Date(issuedAt).getTime() + flow.invoiceDueDays * 86_400_000).toISOString(),
    lines: Array.from(groups.values()),
    excessFeeUsd: invoiceBoxes.reduce((sum, box) => sum + (box.excessFeeUsd ?? 0), 0),
    insuranceUsd: 0,
    homeDeliveryUsd: 0,
    timeline: [{ from: null, to: "emitida", actor, at: issuedAt, note: "Documento generado según la configuración de facturación." }],
  };
  invoices.push(invoice);
  const customer = users.find(user => user.id === userId);
  if (customer) await sendEmail({ to: customer.email, subject: `Factura emitida · ${invoice.number}`, heading: "Tu factura está disponible", body: `${invoice.number}: consulta el desglose y reporta tu pago. El comprobante es opcional.`, actionLabel: "Ver factura", actionUrl: `${siteUrl()}/cliente/facturas/${invoice.id}` });
  pushNotification(userId, "Factura emitida", `${invoice.number} por ${invoiceBoxes.length} ${invoiceBoxes.length === 1 ? "caja" : "cajas"} ya está disponible en tu panel.`);
  return invoice;
}

export async function receiveBox(input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const parsed = receptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos de recepción." };
  const customer = findCustomer(parsed.data.customer);
  if (!customer || !customer.active) return { ok: false as const, error: "Selecciona un cliente activo." };
  const prealert = parsed.data.prealertId ? boxes.find(item => item.id === parsed.data.prealertId) : undefined;
  if (parsed.data.prealertId && (!prealert || prealert.userId !== customer.id || prealert.status !== "pre-alertada")) return { ok: false as const, error: "La prealerta ya fue recibida o no pertenece a este cliente." };
  const [rates, flow, catalog] = await Promise.all([configService.getRateTable(), configService.getFlowConfig(), configService.getCatalog()]);
  const origins=warehouses.filter(w=>w.active&&warehouseSupports(w,"origen"));
  const originId=parsed.data.originWarehouseId||(origins.length===1?origins[0].id:undefined);
  const origin=origins.find(w=>w.id===originId);
  if(!parsed.data.reject&&((origins.length&&!origin)||(originId&&!origin)))return {ok:false as const,error:"Selecciona el almacén de origen donde recibes la carga."};
  const dimensions = { length: parsed.data.length, width: parsed.data.width, height: parsed.data.height };
  const suggestion = suggestCategory(dimensions, parsed.data.weightLb, rates);
  const mode=parsed.data.billingMode ?? (!suggestion.category ? "manual" : "fijo");
  const custom=(mode==="manual" || !suggestion.category) && !parsed.data.reject;
  if(mode==="fijo" && !suggestion.category && !parsed.data.reject)return {ok:false as const,error:"Sin categoría estándar: selecciona cobro por libra o cotización manual."};
  if(mode==="manual" && !parsed.data.reject && !parsed.data.customPriceUsd)return {ok:false as const,error:"Carga personalizada: indica el precio acordado para registrarla."};
  const categoryId = (custom ? CUSTOM_CARGO_ID : parsed.data.overrideCategory || suggestion.category?.id || rates.at(-1)?.id) as BoxCategoryId;
  if (!custom && !rates.some((rate) => rate.id === categoryId)) return { ok: false as const, error: "Selecciona una categoría válida." };
  if (!custom && !parsed.data.reject && !suggestCategory(dimensions, parsed.data.weightLb, rates.filter(rate => rate.id === categoryId)).category) return { ok: false as const, error: "La categoría elegida no admite las medidas o el peso. Usa una categoría válida; una nota no permite saltarse los límites." };
  if (mode==="fijo" && !custom && !parsed.data.reject && flow.excessPolicy === "rechazo" && prealert && !suggestCategory(dimensions, parsed.data.weightLb, catalog.filter(rate => rate.id === prealert.categoryId)).category) return { ok: false as const, error: "La caja excede la categoría prealertada y la política activa exige rechazo. Registra el motivo." };
  const createdAt = now();
  const id = prealert?.id ?? nextId("box", boxes.length);
  const code = prealert?.code ?? `BX-26${String(boxes.length + 1).padStart(4, "0")}` as const;
  const rejected = Boolean(parsed.data.reject);
  const note = custom ? (mode==="manual" ? `Carga personalizada. Precio acordado USD ${parsed.data.customPriceUsd}. Medidas y peso reales registrados.` : "Carga fuera de categoría estándar. Cobro por libra.") : rejected ? parsed.data.rejectionReason : parsed.data.overrideCategory ? parsed.data.overrideReason : suggestion.reason ? `Categoría ajustada por ${suggestion.reason.replaceAll("-", " ")}.` : "Medidas y peso validados.";
  const billing = rejected ? undefined : calculateBilling(mode, dimensions, parsed.data.weightLb, flow, mode==="manual" ? parsed.data.customPriceUsd : rates.find(rate=>rate.id===categoryId)?.priceUsd);
  const box: Box = {
    billing, originWarehouseId:origin?.id,originWarehouseName:origin?.name,
    id, code, userId: customer.id, categoryId, categoryName: custom ? CUSTOM_CARGO_NAME : rates.find(rate=>rate.id===categoryId)?.name ?? categoryId, customPriceUsd:billing?.amountUsd, status: rejected ? "rechazada" : "en-bodega", dimensions, weightLb: parsed.data.weightLb,
    excessFeeUsd: mode==="fijo" && !custom && !rejected && flow.excessPolicy === "recargo" && prealert && !suggestCategory(dimensions, parsed.data.weightLb, catalog.filter(rate => rate.id === prealert.categoryId)).category ? flow.excessFeeUsd : 0,
    receivedAt: createdAt, originTracking: prealert?.originTracking,
    photos: [],
    timeline: rejected
      ? [...(prealert?.timeline ?? []), { from: prealert ? "pre-alertada" : null, to: "rechazada", actor: adminActor, at: createdAt, note }]
      : [
        ...(prealert?.timeline ?? []),
        { from: prealert ? "pre-alertada" : null, to: "recibida", actor: adminActor, at: createdAt, note: `Paquete recibido físicamente en ${origin?.name??"bodega de origen"}.` },
        { from: "recibida", to: "categorizada", actor: adminActor, at: createdAt, note: `${note} ${billing ? billingDescription(billing) : ""}` },
        { from: "categorizada", to: "en-bodega", actor: adminActor, at: createdAt, note: "Disponible para asignación a guía máster." },
      ],
  };
  if (prealert) boxes[boxes.findIndex(item => item.id === prealert.id)] = box;
  else boxes.push(box);
  const notification = pushNotification(customer.id, rejected ? "Caja rechazada" : "Caja recibida", rejected ? `${code} fue rechazada: ${parsed.data.rejectionReason}.` : `${code} fue registrada en bodega como ${box.categoryName}.`);
  let invoice: Invoice | undefined;
  if (!rejected && (flow.billingMoment === "al-recibir" || parsed.data.invoiceNow)) invoice = await createInvoiceForBoxes(customer.id, [box], adminActor);
  await sendEmail({ to: customer.email, subject: rejected ? `Recepción rechazada ${code}` : `Caja recibida ${code}`, heading: rejected ? "La recepción requiere tu atención" : "Tu caja ya está en bodega", body: notification.body, actionLabel: "Ver mis cajas", actionUrl: `${siteUrl()}/cliente/cajas` });
  return { ok: true as const, suggestion, code, box, invoice, notification };

  });
}

export async function loadBoxesOnTruck(boxIds: string[], truckId: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const truck = trucks.find((item) => item.id === truckId);
  if (!truck) return { ok: false as const, error: "Selecciona un camión disponible." };
  const rejected: Array<{ boxId: string; reason: string }> = [];
  const assigned: Box[] = [];
  for (const boxId of boxIds) {
    const result = await assignBoxToTruck(truckId, boxId);
    if (!result.ok) rejected.push({ boxId, reason: result.error });
    else assigned.push({ ...result.box });
  }
  return { ok: true as const, count: assigned.length, assigned, rejected, truck: { ...truck } };

  });
}

export async function transitionTruckState(truckId: string, note?: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const truckIndex = trucks.findIndex((item) => item.id === truckId);
  if (truckIndex < 0) return { ok: false as const, error: "No encontramos el camión seleccionado." };
  const previousStatus = trucks[truckIndex]!.status;
  const result = transitionTruckWithCascade(trucks[truckIndex]!, boxes, shipments, { actor: "Operaciones A&L", note });
  if (!result.ok) return result;
  trucks[truckIndex] = result.value.truck;
  result.value.changedBoxIds.forEach((id) => { const index = boxes.findIndex((box) => box.id === id); boxes[index] = result.value.boxes.find((box) => box.id === id)!; });
  result.value.changedShipmentIds.forEach((id) => { const index = shipments.findIndex((shipment) => shipment.id === id); shipments[index] = result.value.shipments.find((shipment) => shipment.id === id)!; });
  const userIds = new Set(boxes.filter((box) => result.value.truck.boxIds.includes(box.id)).map((box) => box.userId));
  const generatedInvoices: Invoice[] = [];
  const flow = await configService.getFlowConfig();
  if (previousStatus === "cargando" && result.value.truck.status === "despachado" && flow.billingMoment === "al-despachar") {
    for (const userId of userIds) {
      const eligible = boxes.filter((box) => result.value.truck.boxIds.includes(box.id) && box.userId === userId && !invoices.some((invoice) => invoice.boxIds?.includes(box.id)));
      if (eligible.length) generatedInvoices.push(await createInvoiceForBoxes(userId, eligible, adminActor));
    }
  }
  userIds.forEach((userId) => pushNotification(userId, "Tu carga avanzó de etapa", `El camión ${result.value.truck.code} cambió a ${getStatusLabel(result.value.truck.status).toLowerCase()}.`));
  await Promise.all(users.filter((user) => userIds.has(user.id)).map((user) => sendEmail({ to: user.email, subject: `Actualización ${result.value.truck.code}`, heading: "Tu carga avanzó de etapa", body: `El camión ${result.value.truck.code} cambió al estado ${result.value.truck.status}.`, actionLabel: "Ver seguimiento", actionUrl: `${siteUrl()}/cliente/envios` })));
  return { ok: true as const, truck: result.value.truck, changedBoxes: result.value.changedBoxIds.length, changedShipments: result.value.changedShipmentIds.length, generatedInvoices };

  });
}
export async function approvePayment(invoiceId: string, note: string, expectedReportedAt?: string, warehouseId?:string) {
  return approveValidatedPayment(invoiceId, note, expectedReportedAt, warehouseId);
}
async function approveValidatedPayment(invoiceId: string, note: string, expectedReportedAt?: string, warehouseId?:string) {
  return runMutation("admin", async () => {
    const invoice = invoices.find(item => item.id === invoiceId);
    if (expectedReportedAt && invoice?.paymentReport?.reportedAt !== expectedReportedAt) return {ok:false as const,error:"El cliente corrigió el reporte. Actualiza y vuelve a revisar antes de aprobar."};
    if (!invoice?.paymentReport || !matchesInvoiceTotal(invoice, invoice.paymentReport.amountUsd)) return { ok: false as const, error: "El reporte debe cubrir el total exacto de la factura. Rechaza el importe incorrecto y solicita un nuevo reporte." };
    const existing=invoice.payments?.findLast(p=>p.status==="pendiente");
    const location=paymentLocation(warehouseId??existing?.warehouseId);
    if(!location)return {ok:false as const,error:"Selecciona la ubicación donde confirmas el pago."};
    const actor=await requireAdminUser();
    const entry=existing??appendPayment(invoice,actor,"pendiente",invoice.paymentReport.method,invoice.paymentReport.reference,location.id);
    entry.status="confirmado";entry.confirmedAt=new Date().toISOString();entry.confirmedBy=actor.id;entry.confirmedByName=`${actor.firstName} ${actor.paternalLastName}`;
    entry.warehouseId=location.id;entry.warehouseName=location.name;
    return approvePaymentTransition(invoiceId, note);
  });
}
async function approvePaymentTransition(invoiceId: string, note: string) {
  return runMutation("admin", async () => { await simulateLatency(); if (note.trim().length < 5) return { ok: false as const, error: "Agrega una nota de validación de al menos 5 caracteres." }; const index = invoices.findIndex((item) => item.id === invoiceId); if (index < 0) return { ok: false as const, error: "No encontramos la factura seleccionada." }; const result = transitionInvoice(invoices[index]!, "pagada", { actor: "Operaciones A&L", note }); if (!result.ok) return result; invoices[index] = { ...result.value, paymentReviewNote: note }; pushNotification(result.value.userId, "Pago aprobado", `Validamos el pago de ${result.value.number}. La factura quedó como pagada.`); const user = users.find((item) => item.id === result.value.userId); if (user) await sendEmail({ to: user.email, subject: "Pago aprobado", heading: "Tu pago fue aprobado", body: `La factura ${result.value.number} ahora aparece como pagada.`, actionLabel: "Ver factura", actionUrl: `${siteUrl()}/cliente/facturas/${result.value.id}` }); return { ok: true as const, invoice: invoices[index]! };

  });
}
export async function rejectPayment(invoiceId: string, note: string, expectedReportedAt?: string) {
  return runMutation("admin", async () => { await simulateLatency(); if (note.trim().length < 5) return { ok: false as const, error: "Explica el rechazo con al menos 5 caracteres." }; const index = invoices.findIndex((item) => item.id === invoiceId); if (index < 0) return { ok: false as const, error: "No encontramos la factura seleccionada." }; if (expectedReportedAt && invoices[index]!.paymentReport?.reportedAt !== expectedReportedAt) return {ok:false as const,error:"El reporte cambió. Actualiza antes de rechazarlo."}; if (invoices[index]!.status !== "pago-reportado") return { ok: false as const, error: "Solo puedes rechazar un pago que esté reportado y pendiente de revisión." }; const result = transitionInvoice(invoices[index]!, "emitida", { actor: adminActor, note }); if (!result.ok) return result; invoices[index] = { ...result.value, payments:result.value.payments?.map(p=>p.status==="pendiente"?{...p,status:"rechazado" as const}:p), paymentReviewNote: note, paymentReport: undefined }; pushNotification(result.value.userId, "Reporte de pago rechazado", `${result.value.number} necesita un nuevo reporte: ${note}`); const user = users.find((item) => item.id === result.value.userId); if (user) await sendEmail({ to: user.email, subject: "Reporte de pago rechazado", heading: "Necesitamos revisar tu reporte", body: `El reporte de ${result.value.number} fue rechazado: ${note}`, actionLabel: "Revisar factura", actionUrl: `${siteUrl()}/cliente/facturas/${result.value.id}` }); return { ok: true as const, invoice: invoices[index]! };
  });
}
export async function createTruck(input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del camión." };
  if(!(await configService.getFlowConfig()).destinationCities.includes(parsed.data.destinationCity)) return {ok:false as const,error:"El destino no está habilitado en Configuración."};
  const activeRates=await configService.getRateTable();
  if(Object.keys(parsed.data.capacity).some(id=>id!==CUSTOM_CARGO_ID&&!activeRates.some(rate=>rate.id===id))) return {ok:false as const,error:"La capacidad contiene categorías inactivas o inexistentes."};
  const number = trucks.length + 1;
  let driver = drivers.find((item) => item.id === parsed.data.driverId);
  if (parsed.data.driverId === "new") {
    driver = { id: `driver-${String(drivers.length + 1).padStart(3, "0")}`, name: parsed.data.newDriverName!, phone: parsed.data.newDriverPhone!, license: parsed.data.newDriverLicense!, active: true };
    drivers.push(driver);
  }
  if (!driver?.active) return { ok: false as const, error: "Selecciona un chofer activo." };
  const createdAt = new Date().toISOString();
  const truck: Truck = {
    id: `truck-${String(number).padStart(3, "0")}`,
    code: `TR-26${String(100 + number).padStart(4, "0")}`,
    plate: parsed.data.plate,
    driverId: driver.id,
    driverName: driver.name,
    departureDate: parsed.data.departureDate,
    stops: [],
    destinationCity: parsed.data.destinationCity,
    route: `${"Origen por confirmar"} → ${parsed.data.destinationCity}`,
    capacity: parsed.data.capacity,
    notes: parsed.data.notes,
    status: "planificado",
    boxIds: [],
    timeline: [{ from: null, to: "planificado", actor: "Operaciones A&L", at: createdAt, note: "Guía máster creada." }],
  };
  trucks.push(truck);
  return { ok: true as const, truck, driver };

  });
}

export async function updateTruck(truckId: string, input: unknown) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const truckIndex = trucks.findIndex((item) => item.id === truckId);
  if (truckIndex < 0) return { ok: false as const, error: "No encontramos el camión seleccionado." };
  if (trucks[truckIndex]!.status !== "planificado") return { ok: false as const, error: "Solo puedes editar un camión mientras está planificado." };
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del camión." };
  if(parsed.data.destinationCity!==trucks[truckIndex]!.destinationCity && !(await configService.getFlowConfig()).destinationCities.includes(parsed.data.destinationCity)) return {ok:false as const,error:"El destino no está habilitado en Configuración."};
  if (trucks[truckIndex]!.stops?.length && (parsed.data.destinationCity!==trucks[truckIndex]!.destinationCity || trucks[truckIndex]!.stops!.some(stop=>stop.arrivalDate<parsed.data.departureDate))) return {ok:false as const,error:"Edita los destinos desde Paradas del viaje y verifica las fechas de llegada."};
  const catalog=await configService.getCatalog();
  if(Object.keys(parsed.data.capacity).some(id=>id!==CUSTOM_CARGO_ID&&!catalog.some(rate=>rate.id===id))) return {ok:false as const,error:"La capacidad contiene categorías inexistentes."};
  const driver = drivers.find((item) => item.id === parsed.data.driverId);
  if (!driver?.active) return { ok: false as const, error: "Selecciona un chofer activo." };
  const assignedBoxes = boxes.filter(box => trucks[truckIndex]!.boxIds.includes(box.id));
  if (assignedBoxes.some(box => assignedBoxes.filter(item => item.categoryId === box.categoryId).length > (parsed.data.capacity[box.categoryId] ?? 0))) return { ok: false as const, error: "La capacidad no puede ser menor que las cajas ya asignadas. Retira las cajas primero." };
  trucks[truckIndex] = { ...trucks[truckIndex]!, plate: parsed.data.plate, driverId: driver.id, driverName: driver.name, departureDate: parsed.data.departureDate, destinationCity: parsed.data.destinationCity, route: trucks[truckIndex]!.stops?.length ? trucks[truckIndex]!.route : `${trucks[truckIndex]!.originWarehouseName ?? "Origen por confirmar"} → ${parsed.data.destinationCity}`, capacity: parsed.data.capacity, notes: parsed.data.notes };
  return { ok: true as const, truck: trucks[truckIndex]! };

  });
}

export async function assignBoxToTruck(truckId: string, boxId: string, scan?: { code: string; warehouseId: string }) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const truck = trucks.find((item) => item.id === truckId);
  const box = boxes.find((item) => item.id === boxId);
  if (!truck || !box) return { ok: false as const, error: "No encontramos el camión o la caja seleccionada." };
  if (truck.stops && !truck.stops.length) return {ok:false as const,error:"Configura las paradas y fechas antes de cargar paquetes."};
  if (truck.stops?.length) {
    if (!scan || scan.code !== box.code) return {ok:false as const,error:"La carga de este viaje requiere escanear el código del paquete."};
    if (!truck.stops.some(stop=>stop.warehouseId===scan.warehouseId) || !warehouses.some(w=>w.id===scan.warehouseId&&w.active&&warehouseSupports(w,"destino"))) return {ok:false as const,error:"El almacén no pertenece a las paradas activas del camión."};
    if (truck.status !== "cargando") return {ok:false as const,error:"Inicia la carga del camión antes de escanear."};
  }
  if(box.originWarehouseId&&truck.originWarehouseId!==box.originWarehouseId)return {ok:false as const,error:"El paquete está en otro almacén de origen. El viaje debe salir del mismo almacén."};
  const shipment = box.shipmentId ? shipments.find(item => item.id === box.shipmentId) : undefined;
  if (truck.stops?.length && shipment && !truck.stops.some(stop=>stop.warehouseId===scan?.warehouseId&&stop.city===shipment.destinationCity)) return {ok:false as const,error:"El destino del envío no coincide con el almacén seleccionado."};
  if (shipment && scan && boxes.some(item=>shipment.boxIds.includes(item.id)&&item.destinationWarehouseId&&item.destinationWarehouseId!==scan.warehouseId)) return {ok:false as const,error:"Todas las cajas del envío deben descargarse en el mismo almacén."};
  if (box.shipmentId && (!shipment || shipment.userId !== box.userId || !shipment.boxIds.includes(box.id))) return { ok: false as const, error: "La relación entre caja y envío es inconsistente." };
  if (shipment && (shipment.status !== "confirmado" || (shipment.truckId && shipment.truckId !== truck.id) || boxes.some(item => shipment.boxIds.includes(item.id) && item.truckId && item.truckId !== truck.id))) return { ok: false as const, error: "Todas las cajas de un envío deben viajar en el mismo camión, antes del despacho." };
  if (!(["planificado", "cargando"] as const).includes(truck.status as "planificado" | "cargando")) return { ok: false as const, error: "Solo puedes asignar cajas antes del despacho." };
  if (box.status !== "en-bodega" || box.truckId) return { ok: false as const, error: "La caja debe estar disponible en bodega." };
  const used = truck.boxIds.map((id) => boxes.find((item) => item.id === id)).filter((item) => item?.categoryId === box.categoryId).length;
  if (used >= (truck.capacity[box.categoryId] ?? 0)) return { ok: false as const, error: `La capacidad para ${box.categoryId} ya está completa.` };
  if (truck.status === "cargando") {
    const transition = transitionBox(box, "cargada-en-camion", { actor: "Operaciones A&L", note: `Asignada a ${truck.code}.` });
    if (!transition.ok) return transition;
    Object.assign(box, transition.value);
  }
  box.truckId = truck.id;
  if (scan) { box.destinationWarehouseId = scan.warehouseId; box.loadScan={at:new Date().toISOString(),actorId:(await requireAdminUser()).id,truckId:truck.id}; }
  if (shipment) shipment.truckId = truck.id;
  truck.boxIds = [...truck.boxIds, box.id];
  return { ok: true as const, truck, box };

  });
}

export async function removeBoxFromTruck(truckId: string, boxId: string) {
  return runMutation("admin", async () => {
  await simulateLatency();
  const truck = trucks.find((item) => item.id === truckId);
  const box = boxes.find((item) => item.id === boxId);
  if (!truck || !box || !truck.boxIds.includes(box.id)) return { ok: false as const, error: "La caja no está asignada a este camión." };
  if (!(["planificado", "cargando"] as const).includes(truck.status as "planificado" | "cargando")) return { ok: false as const, error: "No puedes retirar cajas después del despacho." };
  if (box.status === "cargada-en-camion") {
    const transition = transitionBox(box, "en-bodega", { actor: "Operaciones A&L", note: `Retirada de ${truck.code}.` });
    if (!transition.ok) return transition;
    Object.assign(box, transition.value);
  }
  delete box.truckId; delete box.loadScan; delete box.destinationWarehouseId;
  truck.boxIds = truck.boxIds.filter((id) => id !== box.id);
  const shipment = box.shipmentId ? shipments.find(item => item.id === box.shipmentId) : undefined;
  if (shipment && !boxes.some(item => shipment.boxIds.includes(item.id) && item.truckId === truck.id)) delete shipment.truckId;
  return { ok: true as const, truck, box };

  });
}
export async function saveFlowConfig(input: FlowConfig) {
  return runMutation("admin", async () => { return configService.updateFlowConfig(input);
  });
}
export async function saveRateTable(input: BoxCategory[]) {
  return runMutation("admin", async () => { return configService.updateRateTable(input);
  });
}
export async function saveSystemConfig(flow: FlowConfig, rates: BoxCategory[], expectedRevision?: string) {
  return runMutation("admin", async () => {
    try {
      if(expectedRevision && recordRevision({flow:await configService.getFlowConfig(),rates:await configService.getCatalog()})!==expectedRevision) return {ok:false as const,error:"Otro operador cambió la configuración. Actualiza antes de guardar."};
      const savedFlow = await configService.updateFlowConfig(flow);
      const savedRates = await configService.updateRateTable(rates);
      return { ok: true as const, flow: savedFlow, rates: savedRates, revision:recordRevision({flow:savedFlow,rates:savedRates}) };
    } catch (error) { return { ok: false as const, error: error instanceof Error && !("issues" in error) ? error.message : "Revisa categorías, precios, límites y días de vencimiento." }; }
  });
}
