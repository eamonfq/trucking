"use server";

import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { users } from "@/lib/data/users";
import { configService } from "@/lib/services/config";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import { transitionInvoice, transitionTruckWithCascade } from "@/lib/domain/state-machine";
import type { BoxCategory, Dimensions } from "@/lib/config/box-categories";
import type { FlowConfig } from "@/lib/config/flow";
import type { Truck } from "@/lib/types";
import { suggestCategory } from "@/lib/utils/suggest-category";

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
export async function createTruck(input: Pick<Truck, "plate" | "driverName" | "departureDate" | "route">) { await simulateLatency(); const number = trucks.length + 1; const createdAt = new Date().toISOString(); const truck: Truck = { id: `truck-${String(number).padStart(3, "0")}`, code: `TR-26${String(100 + number).padStart(4, "0")}`, ...input, status: "planificado", boxIds: [], timeline: [{ from: null, to: "planificado", actor: "Operaciones A&L", at: createdAt, note: "Guía máster creada." }] }; trucks.push(truck); return { ok: true as const, truck }; }
export async function saveFlowConfig(input: FlowConfig) { return configService.updateFlowConfig(input); }
export async function saveRateTable(input: BoxCategory[]) { return configService.updateRateTable(input); }
