"use server";

import { boxes } from "@/lib/data/boxes";
import { invoices } from "@/lib/data/invoices";
import { shipments } from "@/lib/data/shipments";
import { trucks } from "@/lib/data/trucks";
import { users } from "@/lib/data/users";
import { configService } from "@/lib/services/config";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import type { BoxCategory, Dimensions } from "@/lib/config/box-categories";
import type { FlowConfig } from "@/lib/config/flow";
import type { Truck, TruckStatus } from "@/lib/types";
import { suggestCategory } from "@/lib/utils/suggest-category";

export async function receiveBox(input: { dimensions: Dimensions; weightLb: number; userId: string }) { await simulateLatency(); const suggestion = suggestCategory(input.dimensions, input.weightLb); return { ok: true as const, suggestion, code: `BX-26${String(boxes.length + 1).padStart(4, "0")}` }; }
export async function loadBoxesOnTruck(boxIds: string[], truckId: string) { await simulateLatency(); boxes.filter((box) => boxIds.includes(box.id)).forEach((box) => { box.status = "cargada-en-camion"; box.shipmentId = box.shipmentId; }); const truck = trucks.find((item) => item.id === truckId); if (truck) truck.boxIds = Array.from(new Set([...truck.boxIds, ...boxIds])); return { ok: true as const, count: boxIds.length }; }

const truckSequence: TruckStatus[] = ["planificado", "cargando", "despachado", "en-frontera", "en-destino", "cerrado"];
export async function advanceTruck(truckId: string) { await simulateLatency(); const truck = trucks.find((item) => item.id === truckId); if (!truck) return { ok: false as const }; const currentIndex = truckSequence.indexOf(truck.status); truck.status = truckSequence[Math.min(currentIndex + 1, truckSequence.length - 1)]!; const boxStatus = truck.status === "despachado" || truck.status === "en-frontera" ? "en-transito" : truck.status === "en-destino" ? "en-destino" : truck.status === "cerrado" ? "entregada" : "cargada-en-camion"; boxes.filter((box) => truck.boxIds.includes(box.id)).forEach((box) => { box.status = boxStatus; }); shipments.filter((shipment) => shipment.truckId === truckId).forEach((shipment) => { shipment.status = truck.status === "cerrado" ? "entregado" : truck.status === "en-destino" ? "en-destino" : "en-transito"; }); const userIds = new Set(boxes.filter((box) => truck.boxIds.includes(box.id)).map((box) => box.userId)); await Promise.all(users.filter((user) => userIds.has(user.id)).map((user) => sendEmail({ to: user.email, subject: `Actualización ${truck.code}`, heading: "Tu carga avanzó de etapa", body: `El camión ${truck.code} cambió al estado ${truck.status}.`, actionLabel: "Ver seguimiento", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/envios` }))); return { ok: true as const, status: truck.status };
}
export async function approvePayment(invoiceId: string) { await simulateLatency(); const invoice = invoices.find((item) => item.id === invoiceId); if (!invoice) return { ok: false as const }; invoice.status = "pagada"; const user = users.find((item) => item.id === invoice.userId); if (user) await sendEmail({ to: user.email, subject: "Pago aprobado", heading: "Tu pago fue aprobado", body: `La factura ${invoice.number} ahora aparece como pagada.`, actionLabel: "Ver factura", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente/facturas/${invoice.id}` }); return { ok: true as const };
}
export async function createTruck(input: Pick<Truck, "plate" | "driverName" | "departureDate" | "route">) { await simulateLatency(); const number = trucks.length + 1; const truck: Truck = { id: `truck-${String(number).padStart(3, "0")}`, code: `TR-26${String(100 + number).padStart(4, "0")}`, ...input, status: "planificado", boxIds: [], timeline: [] }; trucks.push(truck); return { ok: true as const, truck }; }
export async function saveFlowConfig(input: FlowConfig) { return configService.updateFlowConfig(input); }
export async function saveRateTable(input: BoxCategory[]) { return configService.updateRateTable(input); }
