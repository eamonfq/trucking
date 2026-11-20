"use server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireAdminUser } from "./actions";
import { runMutation } from "@/lib/db/mutation";
import { withStore } from "@/lib/db/store";
import { nextDocumentSequence } from "@/lib/db/document-sequence";
import { billsOfLading, boxes, trucks, warehouses } from "@/lib/db/collections";
import { billOfLadingSchema, type BillOfLading } from "@/lib/schemas/bill-of-lading";
import { billOfLadingFromTruck, billOfLadingTotals, blankBillOfLading, groupTruckCargo } from "@/lib/utils/bill-of-lading";
import { clone } from "@/lib/services/delay";

const createSchema = z.object({ truckId: z.string().trim().max(80).optional() });
const latest = () => [...billsOfLading].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
const actorName = (user: { firstName?: string; paternalLastName?: string }) => [user.firstName, user.paternalLastName].filter(Boolean).join(" ") || "Administrador";

/** Creates a draft from a truck (cargo summarised by quantity) or a blank one. Repeated data comes from the latest BOL. */
export async function createBillOfLading(input: unknown) {
  return runMutation("admin:camiones", async () => {
    const user = await requireAdminUser(["camiones"]);
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false as const, error: "Solicitud no válida." };
    const truck = parsed.data.truckId ? trucks.find((item) => item.id === parsed.data.truckId) : undefined;
    if (parsed.data.truckId && !truck) return { ok: false as const, error: "No encontramos el camión seleccionado." };
    const now = new Date().toISOString();
    const code = `BOL-26${String(nextDocumentSequence("billOfLading")).padStart(4, "0")}` as const;
    const previous = latest();
    const draft = truck
      ? billOfLadingFromTruck({ number: code, today: now.slice(0, 10), truck, boxes: [...boxes], warehouses: [...warehouses], previous })
      : blankBillOfLading({ number: code, date: now.slice(0, 10), previous });
    // Prefilled data from older records must respect the same limits as a manual edit.
    const content = billOfLadingSchema.safeParse(draft);
    if (!content.success) return { ok: false as const, error: `Los datos del camión no caben en el formato (${content.error.issues[0]?.path.join(" › ")}). Crea uno en blanco.` };
    const bill: BillOfLading = { ...content.data, id: randomUUID(), code, truckId: truck?.id, truckCode: truck?.code, createdAt: now, createdBy: user.id, createdByName: actorName(user), updatedAt: now, updatedBy: user.id, updatedByName: actorName(user) };
    billsOfLading.push(bill);
    return { ok: true as const, id: bill.id, code: bill.code };
  });
}

export async function updateBillOfLading(id: string, input: unknown) {
  return runMutation("admin:camiones", async () => {
    const user = await requireAdminUser(["camiones"]);
    const index = billsOfLading.findIndex((item) => item.id === id);
    if (index < 0) return { ok: false as const, error: "No encontramos este bill of lading." };
    const parsed = billOfLadingSchema.safeParse(input);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return { ok: false as const, error: issue ? `${issue.path.join(" › ") || "Formulario"}: ${issue.message}` : "Revisa los datos del bill of lading." };
    }
    const current = billsOfLading[index]!;
    const bill: BillOfLading = { ...current, ...parsed.data, updatedAt: new Date().toISOString(), updatedBy: user.id, updatedByName: actorName(user) };
    billsOfLading[index] = bill;
    return { ok: true as const, bill: clone(bill) };
  });
}

export async function deleteBillOfLading(id: string) {
  return runMutation("admin:camiones", async () => {
    const index = billsOfLading.findIndex((item) => item.id === id);
    if (index < 0) return { ok: false as const, error: "No encontramos este bill of lading." };
    billsOfLading.splice(index, 1);
    return { ok: true as const };
  });
}

/** Current cargo of a truck, summarised by quantity, to refresh a draft after more boxes were loaded. Read only. */
export async function truckCargoForBillOfLading(truckId: string) {
  return withStore(async () => {
    await requireAdminUser(["camiones"]);
    const truck = trucks.find((item) => item.id === truckId);
    if (!truck) return { ok: false as const, error: "El camión ya no existe." };
    const lines = groupTruckCargo(boxes.filter((box) => truck.boxIds.includes(box.id)));
    const totals = billOfLadingTotals({ lines, orders: [] });
    return { ok: true as const, lines, pieces: totals.packageQty, weightLb: totals.weightLb };
  });
}
