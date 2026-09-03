"use server";

import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { demoCredentials, users } from "@/lib/data/users";
import { addresses, recipients } from "@/lib/data/addresses";
import { drivers } from "@/lib/data/drivers";
import { configService } from "@/lib/services/config";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import { transitionBox, transitionInvoice, transitionTruckWithCascade } from "@/lib/domain/state-machine";
import type { BoxCategory, Dimensions } from "@/lib/config/box-categories";
import type { FlowConfig } from "@/lib/config/flow";
import type { Address, Recipient, Truck, User } from "@/lib/types";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { truckSchema } from "@/lib/schemas/admin";
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

export async function receiveBox(input: { dimensions: Dimensions; weightLb: number; userId: string }) { await simulateLatency(); const suggestion = suggestCategory(input.dimensions, input.weightLb); return { ok: true as const, suggestion, code: `BX-26${String(boxes.length + 1).padStart(4, "0")}` }; }
export async function loadBoxesOnTruck(boxIds: string[], truckId: string) { await simulateLatency(); boxes.filter((box) => boxIds.includes(box.id)).forEach((box) => { box.status = "cargada-en-camion"; box.shipmentId = box.shipmentId; }); const truck = trucks.find((item) => item.id === truckId); if (truck) truck.boxIds = Array.from(new Set([...truck.boxIds, ...boxIds])); return { ok: true as const, count: boxIds.length }; }

export async function transitionTruckState(truckId: string, note?: string) {
  await simulateLatency();
  const truckIndex = trucks.findIndex((item) => item.id === truckId);
  if (truckIndex < 0) return { ok: false as const, error: "No encontramos el camión seleccionado." };
  const result = transitionTruckWithCascade(trucks[truckIndex]!, boxes, shipments, { actor: "Operaciones A&L", note });
  if (!result.ok) return result;
  trucks[truckIndex] = result.value.truck;
  result.value.changedBoxIds.forEach((id) => { const index = boxes.findIndex((box) => box.id === id); boxes[index] = result.value.boxes.find((box) => box.id === id)!; });
  result.value.changedShipmentIds.forEach((id) => { const index = shipments.findIndex((shipment) => shipment.id === id); shipments[index] = result.value.shipments.find((shipment) => shipment.id === id)!; });
  const userIds = new Set(boxes.filter((box) => result.value.truck.boxIds.includes(box.id)).map((box) => box.userId));
  await Promise.all(users.filter((user) => userIds.has(user.id)).map((user) => sendEmail({ to: user.email, subject: `Actualización ${result.value.truck.code}`, heading: "Tu carga avanzó de etapa", body: `El camión ${result.value.truck.code} cambió al estado ${result.value.truck.status}.`, actionLabel: "Ver seguimiento", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/envios` })));
  return { ok: true as const, truck: result.value.truck, changedBoxes: result.value.changedBoxIds.length, changedShipments: result.value.changedShipmentIds.length };
}
export async function approvePayment(invoiceId: string) { await simulateLatency(); const index = invoices.findIndex((item) => item.id === invoiceId); if (index < 0) return { ok: false as const, error: "No encontramos la factura seleccionada." }; const result = transitionInvoice(invoices[index]!, "pagada", { actor: "Operaciones A&L", note: "Comprobante validado." }); if (!result.ok) return result; invoices[index] = result.value; const user = users.find((item) => item.id === result.value.userId); if (user) await sendEmail({ to: user.email, subject: "Pago aprobado", heading: "Tu pago fue aprobado", body: `La factura ${result.value.number} ahora aparece como pagada.`, actionLabel: "Ver factura", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/facturas/${result.value.id}` }); return { ok: true as const };
}
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
