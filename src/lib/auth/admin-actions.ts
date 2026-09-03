"use server";

import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { users } from "@/lib/data/users";
import { drivers } from "@/lib/data/drivers";
import { configService } from "@/lib/services/config";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import { transitionBox, transitionInvoice, transitionTruckWithCascade } from "@/lib/domain/state-machine";
import type { BoxCategory, Dimensions } from "@/lib/config/box-categories";
import type { FlowConfig } from "@/lib/config/flow";
import type { Truck } from "@/lib/types";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { truckSchema } from "@/lib/schemas/admin";
import { OPERATION_ORIGIN } from "@/lib/config/operations";

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
