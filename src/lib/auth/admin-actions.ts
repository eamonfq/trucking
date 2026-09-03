"use server";

import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { demoCredentials, users } from "@/lib/data/users";
import { addresses, recipients } from "@/lib/data/addresses";
import { drivers } from "@/lib/data/drivers";
import { notifications } from "@/lib/data/notifications";
import { configService } from "@/lib/services/config";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import { transitionBox, transitionInvoice, transitionTruckWithCascade } from "@/lib/domain/state-machine";
import type { BoxCategory, BoxCategoryId } from "@/lib/config/box-categories";
import type { FlowConfig } from "@/lib/config/flow";
import type { Address, Box, Invoice, Recipient, Truck, User } from "@/lib/types";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { receptionSchema, truckSchema } from "@/lib/schemas/admin";
import { OPERATION_ORIGIN } from "@/lib/config/operations";
import { CUSTOMER_COPY } from "@/lib/config/customers";
import { customerAddressSchema, customerProfileSchema, customerRecipientSchema, internalNoteSchema, lockerCodeSchema } from "@/lib/schemas/customer";
import { registrationSchema } from "@/lib/schemas/registration";

const adminActor = "Operaciones A&L";
const now = () => new Date().toISOString();
const nextId = (prefix: string, length: number) => `${prefix}-${String(length + 1).padStart(3, "0")}`;
const findCustomer = (userId: string) => users.find((user) => user.id === userId && user.role === "cliente");
const recordCustomerActivity = (user: User, type: string, description: string) => user.activity.unshift({ id: `act-${crypto.randomUUID()}`, type, description, actor: adminActor, at: now() });

export async function createCustomerAsAdmin(input: unknown) {
  await simulateLatency();
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };
  if (users.some((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase())) return { ok: false as const, error: "Ya existe una cuenta con ese correo." };
  const numericIds = users.filter((user) => user.role === "cliente").map((user) => Number(user.id.replace("usr-", ""))).filter(Number.isFinite);
  const sequence = Math.max(0, ...numericIds) + 1;
  const userId = `usr-${String(sequence).padStart(3, "0")}`;
  const lockerCode = `AL-MX-${String(sequence).padStart(4, "0")}`;
  const createdAt = now();
  const user: User = {
    id: userId,
    role: "cliente",
    firstName: parsed.data.firstName,
    paternalLastName: parsed.data.paternalLastName,
    maternalLastName: parsed.data.maternalLastName,
    email: parsed.data.email.toLowerCase(),
    phone: `+52${parsed.data.phone}`,
    lockerCode,
    rfc: parsed.data.rfc || undefined,
    active: true,
    internalNotes: [],
    activity: [{ id: `act-${crypto.randomUUID()}`, type: "alta", description: CUSTOMER_COPY.activity.created, actor: adminActor, at: createdAt }],
  };
  const address: Address = { id: nextId("addr", addresses.length), userId, label: "Principal", street: parsed.data.street, exteriorNumber: parsed.data.exteriorNumber, interiorNumber: parsed.data.interiorNumber, neighborhood: parsed.data.neighborhood, postalCode: parsed.data.postalCode, municipality: parsed.data.municipality, state: parsed.data.state, references: parsed.data.references };
  users.push(user);
  addresses.push(address);
  demoCredentials.push({ identifier: user.email, password: parsed.data.password, userId }, { identifier: lockerCode, password: parsed.data.password, userId });
  await sendEmail({ to: user.email, subject: "Bienvenido a A&L Trucking Logistics", heading: `Tu casillero ${lockerCode} está listo`, body: `Hola ${user.firstName}. Tu cuenta fue creada por el equipo de operaciones y ya puedes comenzar a registrar compras.`, actionLabel: "Abrir mi panel", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente` });
  return { ok: true as const, user, address };
}

export async function updateCustomerProfile(userId: string, input: unknown) {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = customerProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del cliente." };
  if (users.some((item) => item.id !== userId && item.email.toLowerCase() === parsed.data.email.toLowerCase())) return { ok: false as const, error: "Ese correo ya está asociado a otra cuenta." };
  const oldEmail = user.email;
  Object.assign(user, parsed.data, { email: parsed.data.email.toLowerCase(), phone: parsed.data.phone.startsWith("+52") ? parsed.data.phone : `+52${parsed.data.phone}`, rfc: parsed.data.rfc || undefined });
  demoCredentials.filter((credential) => credential.userId === user.id && credential.identifier === oldEmail).forEach((credential) => { credential.identifier = user.email; });
  recordCustomerActivity(user, "perfil", CUSTOMER_COPY.activity.profileUpdated);
  return { ok: true as const, user };
}

export async function toggleCustomerStatus(userId: string) {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  user.active = !user.active;
  recordCustomerActivity(user, "estado", user.active ? CUSTOMER_COPY.activity.statusActivated : CUSTOMER_COPY.activity.statusDeactivated);
  return { ok: true as const, user };
}

export async function resetCustomerPassword(userId: string) {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const temporaryPassword = `Ayl${String(Math.floor(100000 + Math.random() * 900000))}!`;
  demoCredentials.filter((credential) => credential.userId === user.id).forEach((credential) => { credential.password = temporaryPassword; });
  recordCustomerActivity(user, "seguridad", CUSTOMER_COPY.activity.passwordReset);
  await sendEmail({ to: user.email, subject: "Contraseña temporal de A&L", heading: "Acceso temporal generado", body: `Tu contraseña temporal es ${temporaryPassword}. Cámbiala al ingresar a tu panel.`, actionLabel: "Iniciar sesión", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/iniciar-sesion` });
  return { ok: true as const, user, temporaryPassword };
}

export async function changeCustomerLocker(userId: string, input: string) {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = lockerCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el casillero." };
  if (users.some((item) => item.id !== userId && item.lockerCode === parsed.data)) return { ok: false as const, error: "Ese casillero ya está asignado." };
  const oldLocker = user.lockerCode;
  user.lockerCode = parsed.data;
  demoCredentials.filter((credential) => credential.userId === user.id && credential.identifier === oldLocker).forEach((credential) => { credential.identifier = user.lockerCode; });
  recordCustomerActivity(user, "casillero", CUSTOMER_COPY.activity.lockerChanged);
  return { ok: true as const, user };
}

export async function addCustomerNote(userId: string, input: unknown) {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = internalNoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa la nota." };
  const note = { id: `note-${crypto.randomUUID()}`, body: parsed.data.body, actor: adminActor, at: now() };
  user.internalNotes.unshift(note);
  recordCustomerActivity(user, "nota", CUSTOMER_COPY.activity.noteAdded);
  return { ok: true as const, user, note };
}

export async function upsertCustomerAddress(userId: string, input: unknown, addressId?: string) {
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
}

export async function deleteCustomerAddress(userId: string, addressId: string) {
  await simulateLatency();
  const user = findCustomer(userId);
  const index = addresses.findIndex((item) => item.id === addressId && item.userId === userId);
  if (!user || index < 0) return { ok: false as const, error: "No encontramos la dirección." };
  if (recipients.some((recipient) => recipient.addressId === addressId)) return { ok: false as const, error: "La dirección está vinculada a un destinatario. Cámbialo o elimínalo primero." };
  addresses.splice(index, 1);
  recordCustomerActivity(user, "dirección", CUSTOMER_COPY.activity.addressDeleted);
  return { ok: true as const, user };
}

export async function upsertCustomerRecipient(userId: string, input: unknown, recipientId?: string) {
  await simulateLatency();
  const user = findCustomer(userId);
  if (!user) return { ok: false as const, error: "No encontramos el cliente seleccionado." };
  const parsed = customerRecipientSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa el destinatario." };
  if (!addresses.some((address) => address.id === parsed.data.addressId && address.userId === userId)) return { ok: false as const, error: "Selecciona una dirección del cliente." };
  const normalized = { ...parsed.data, phone: parsed.data.phone.startsWith("+52") ? parsed.data.phone : `+52${parsed.data.phone}` };
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
}

export async function deleteCustomerRecipient(userId: string, recipientId: string) {
  await simulateLatency();
  const user = findCustomer(userId);
  const index = recipients.findIndex((item) => item.id === recipientId && item.userId === userId);
  if (!user || index < 0) return { ok: false as const, error: "No encontramos el destinatario." };
  recipients.splice(index, 1);
  recordCustomerActivity(user, "destinatario", CUSTOMER_COPY.activity.recipientDeleted);
  return { ok: true as const, user };
}

async function createInvoiceForBoxes(userId: string, invoiceBoxes: Box[], actor: string) {
  const rates = await configService.getRateTable();
  const groups = new Map<BoxCategoryId, number>();
  invoiceBoxes.forEach((box) => groups.set(box.categoryId, (groups.get(box.categoryId) ?? 0) + 1));
  const issuedAt = now();
  const invoice: Invoice = {
    id: nextId("inv", invoices.length),
    number: `AL-26-${String(invoices.length + 1).padStart(4, "0")}`,
    userId,
    shipmentId: invoiceBoxes.find((box) => box.shipmentId)?.shipmentId ?? "",
    boxIds: invoiceBoxes.map((box) => box.id),
    status: "emitida",
    issuedAt,
    dueAt: new Date(new Date(issuedAt).getTime() + 15 * 86_400_000).toISOString(),
    lines: Array.from(groups, ([categoryId, quantity]) => ({ categoryId, quantity, unitPriceUsd: rates.find((rate) => rate.id === categoryId)?.priceUsd ?? 0 })),
    insuranceUsd: 0,
    homeDeliveryUsd: 0,
    timeline: [{ from: null, to: "emitida", actor, at: issuedAt, note: "Documento generado según la configuración de facturación." }],
  };
  invoices.push(invoice);
  return invoice;
}

export async function receiveBox(input: unknown) {
  await simulateLatency();
  const parsed = receptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos de recepción." };
  const customer = findCustomer(parsed.data.customer);
  if (!customer || !customer.active) return { ok: false as const, error: "Selecciona un cliente activo." };
  const [rates, flow] = await Promise.all([configService.getRateTable(), configService.getFlowConfig()]);
  const dimensions = { length: parsed.data.length, width: parsed.data.width, height: parsed.data.height };
  const suggestion = suggestCategory(dimensions, parsed.data.weightLb, rates);
  if (!suggestion.category && !parsed.data.reject) return { ok: false as const, error: "La caja excede la categoría máxima. Registra el rechazo e indica el motivo." };
  const categoryId = (parsed.data.overrideCategory || suggestion.category?.id || rates.at(-1)?.id) as BoxCategoryId;
  if (!rates.some((rate) => rate.id === categoryId)) return { ok: false as const, error: "Selecciona una categoría válida." };
  const createdAt = now();
  const id = nextId("box", boxes.length);
  const code = `BX-26${String(boxes.length + 1).padStart(4, "0")}` as const;
  const rejected = Boolean(parsed.data.reject);
  const note = rejected ? parsed.data.rejectionReason : parsed.data.overrideCategory ? parsed.data.overrideReason : suggestion.reason ? `Categoría ajustada por ${suggestion.reason.replaceAll("-", " ")}.` : "Medidas y peso validados.";
  const box: Box = {
    id, code, userId: customer.id, categoryId, status: rejected ? "rechazada" : "en-bodega", dimensions, weightLb: parsed.data.weightLb,
    receivedAt: createdAt,
    photos: parsed.data.photoName ? [`Recepción: ${parsed.data.photoName}`] : [],
    timeline: rejected
      ? [{ from: null, to: "rechazada", actor: adminActor, at: createdAt, note }]
      : [
        { from: null, to: "recibida", actor: adminActor, at: createdAt, note: "Caja recibida físicamente en Miami." },
        { from: "recibida", to: "categorizada", actor: adminActor, at: createdAt, note },
        { from: "categorizada", to: "en-bodega", actor: adminActor, at: createdAt, note: "Disponible para asignación a guía máster." },
      ],
  };
  boxes.push(box);
  const notification = { id: nextId("not", notifications.length), userId: customer.id, title: rejected ? "Caja rechazada" : "Caja recibida", body: rejected ? `${code} fue rechazada: ${parsed.data.rejectionReason}.` : `${code} fue registrada en bodega como ${rates.find((rate) => rate.id === categoryId)?.name}.`, createdAt, read: false };
  notifications.unshift(notification);
  let invoice: Invoice | undefined;
  if (!rejected && flow.billingMoment === "al-recibir") invoice = await createInvoiceForBoxes(customer.id, [box], adminActor);
  await sendEmail({ to: customer.email, subject: rejected ? `Recepción rechazada ${code}` : `Caja recibida ${code}`, heading: rejected ? "La recepción requiere tu atención" : "Tu caja ya está en bodega", body: notification.body, actionLabel: "Ver mis cajas", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/cajas` });
  return { ok: true as const, suggestion, code, box, invoice, notification };
}

export async function loadBoxesOnTruck(boxIds: string[], truckId: string) {
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
}

export async function transitionTruckState(truckId: string, note?: string) {
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
  await Promise.all(users.filter((user) => userIds.has(user.id)).map((user) => sendEmail({ to: user.email, subject: `Actualización ${result.value.truck.code}`, heading: "Tu carga avanzó de etapa", body: `El camión ${result.value.truck.code} cambió al estado ${result.value.truck.status}.`, actionLabel: "Ver seguimiento", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/envios` })));
  return { ok: true as const, truck: result.value.truck, changedBoxes: result.value.changedBoxIds.length, changedShipments: result.value.changedShipmentIds.length, generatedInvoices };
}
export async function approvePayment(invoiceId: string, note: string) { await simulateLatency(); if (note.trim().length < 5) return { ok: false as const, error: "Agrega una nota de validación de al menos 5 caracteres." }; const index = invoices.findIndex((item) => item.id === invoiceId); if (index < 0) return { ok: false as const, error: "No encontramos la factura seleccionada." }; const result = transitionInvoice(invoices[index]!, "pagada", { actor: "Operaciones A&L", note }); if (!result.ok) return result; invoices[index] = { ...result.value, paymentReviewNote: note }; const user = users.find((item) => item.id === result.value.userId); if (user) await sendEmail({ to: user.email, subject: "Pago aprobado", heading: "Tu pago fue aprobado", body: `La factura ${result.value.number} ahora aparece como pagada.`, actionLabel: "Ver factura", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/facturas/${result.value.id}` }); return { ok: true as const, invoice: invoices[index]! };
}
export async function rejectPayment(invoiceId: string, note: string) { await simulateLatency(); if (note.trim().length < 5) return { ok: false as const, error: "Explica el rechazo con al menos 5 caracteres." }; const index = invoices.findIndex((item) => item.id === invoiceId); if (index < 0) return { ok: false as const, error: "No encontramos la factura seleccionada." }; const result = transitionInvoice(invoices[index]!, "emitida", { actor: adminActor, note }); if (!result.ok) return result; invoices[index] = { ...result.value, paymentReviewNote: note, paymentReport: undefined }; const user = users.find((item) => item.id === result.value.userId); if (user) await sendEmail({ to: user.email, subject: "Reporte de pago rechazado", heading: "Necesitamos otro comprobante", body: `El reporte de ${result.value.number} fue rechazado: ${note}`, actionLabel: "Revisar factura", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/facturas/${result.value.id}` }); return { ok: true as const, invoice: invoices[index]! }; }
export async function createTruck(input: unknown) {
  await simulateLatency();
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del camión." };
  const number = trucks.length + 1;
  let driver = drivers.find((item) => item.id === parsed.data.driverId);
  if (parsed.data.driverId === "new") {
    driver = { id: `driver-${String(drivers.length + 1).padStart(3, "0")}`, name: parsed.data.newDriverName!, phone: parsed.data.newDriverPhone!, license: parsed.data.newDriverLicense!, active: true };
    drivers.push(driver);
  }
  if (!driver) return { ok: false as const, error: "Selecciona un chofer activo." };
  const createdAt = new Date().toISOString();
  const truck: Truck = {
    id: `truck-${String(number).padStart(3, "0")}`,
    code: `TR-26${String(100 + number).padStart(4, "0")}`,
    plate: parsed.data.plate,
    driverId: driver.id,
    driverName: driver.name,
    departureDate: parsed.data.departureDate,
    destinationCity: parsed.data.destinationCity,
    route: `${OPERATION_ORIGIN} → ${parsed.data.destinationCity}`,
    capacity: parsed.data.capacity,
    notes: parsed.data.notes,
    status: "planificado",
    boxIds: [],
    timeline: [{ from: null, to: "planificado", actor: "Operaciones A&L", at: createdAt, note: "Guía máster creada." }],
  };
  trucks.push(truck);
  return { ok: true as const, truck, driver };
}

export async function updateTruck(truckId: string, input: unknown) {
  await simulateLatency();
  const truckIndex = trucks.findIndex((item) => item.id === truckId);
  if (truckIndex < 0) return { ok: false as const, error: "No encontramos el camión seleccionado." };
  if (trucks[truckIndex]!.status !== "planificado") return { ok: false as const, error: "Solo puedes editar un camión mientras está planificado." };
  const parsed = truckSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Revisa los datos del camión." };
  const driver = drivers.find((item) => item.id === parsed.data.driverId);
  if (!driver) return { ok: false as const, error: "Selecciona un chofer activo." };
  trucks[truckIndex] = { ...trucks[truckIndex]!, plate: parsed.data.plate, driverId: driver.id, driverName: driver.name, departureDate: parsed.data.departureDate, destinationCity: parsed.data.destinationCity, route: `${OPERATION_ORIGIN} → ${parsed.data.destinationCity}`, capacity: parsed.data.capacity, notes: parsed.data.notes };
  return { ok: true as const, truck: trucks[truckIndex]! };
}

export async function assignBoxToTruck(truckId: string, boxId: string) {
  await simulateLatency();
  const truck = trucks.find((item) => item.id === truckId);
  const box = boxes.find((item) => item.id === boxId);
  if (!truck || !box) return { ok: false as const, error: "No encontramos el camión o la caja seleccionada." };
  if (!(["planificado", "cargando"] as const).includes(truck.status as "planificado" | "cargando")) return { ok: false as const, error: "Solo puedes asignar cajas antes del despacho." };
  if (box.status !== "en-bodega" || box.truckId) return { ok: false as const, error: "La caja debe estar disponible en bodega." };
  const used = truck.boxIds.map((id) => boxes.find((item) => item.id === id)).filter((item) => item?.categoryId === box.categoryId).length;
  if (used >= truck.capacity[box.categoryId]) return { ok: false as const, error: `La capacidad para ${box.categoryId} ya está completa.` };
  if (truck.status === "cargando") {
    const transition = transitionBox(box, "cargada-en-camion", { actor: "Operaciones A&L", note: `Asignada a ${truck.code}.` });
    if (!transition.ok) return transition;
    Object.assign(box, transition.value);
  }
  box.truckId = truck.id;
  truck.boxIds = [...truck.boxIds, box.id];
  return { ok: true as const, truck, box };
}

export async function removeBoxFromTruck(truckId: string, boxId: string) {
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
  delete box.truckId;
  truck.boxIds = truck.boxIds.filter((id) => id !== box.id);
  return { ok: true as const, truck, box };
}
export async function saveFlowConfig(input: FlowConfig) { return configService.updateFlowConfig(input); }
export async function saveRateTable(input: BoxCategory[]) { return configService.updateRateTable(input); }
