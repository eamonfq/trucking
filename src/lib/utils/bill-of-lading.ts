import type { Box, Truck, Warehouse } from "@/lib/types";
import type { BillOfLadingContent, BillOfLadingLine, BillOfLadingOrder } from "@/lib/schemas/bill-of-lading";
import { truckLoad } from "./truck-load";

export const DEFAULT_CARRIER_NAME = "A&L TRUCKING LOGISTICS";
export const DEFAULT_BOXES_DESCRIPTION = "Household goods and personal effects";

/** Pieces whose note carries a VIN are vehicles: they get their own line, as in the client's paper BOL. */
const VIN = /\bVIN(?![A-Z])/i;
const pieceNote = (box: Box) => (box.contentsNote ?? box.prealertDetails?.description ?? "").trim();
const oneLine = (value: string) => value.replace(/\s*\n+\s*/g, ". ").replace(/\.{2,}/g, ".").replace(/\s{2,}/g, " ").trim();
const wholePounds = (value: number) => Math.round(value);
const missingNote = (count: number) => (count ? ` (${count} pieza${count === 1 ? "" : "s"} sin peso registrado)` : "");

export function emptyBillOfLadingLine(id: string): BillOfLadingLine {
  return { id, handlingType: "", packageType: "", hazmat: false, description: "", nmfc: "", freightClass: "" };
}
export function emptyBillOfLadingOrder(id: string): BillOfLadingOrder {
  return { id, orderNumber: "", palletSlip: "", info: "" };
}

/**
 * Cargo summary instead of one row per piece: every ordinary box in one line with its quantity and
 * total weight, and each vehicle (note with a VIN) on its own line, grouped by reception and note.
 */
export function groupTruckCargo(boxes: Box[]): BillOfLadingLine[] {
  const regular: Box[] = [];
  const vehicles = new Map<string, Box[]>();
  for (const box of boxes) {
    const note = pieceNote(box);
    if (!VIN.test(note)) { regular.push(box); continue; }
    const key = `${box.receptionGroup?.id ?? box.id}\u0000${note}`;
    vehicles.set(key, [...(vehicles.get(key) ?? []), box]);
  }
  const lines: BillOfLadingLine[] = [];
  if (regular.length) {
    const load = truckLoad(regular);
    lines.push({ ...emptyBillOfLadingLine("cargo-boxes"), packageQty: regular.length, packageType: "BOXES", weightLb: wholePounds(load.weightLb), description: DEFAULT_BOXES_DESCRIPTION + missingNote(load.missingWeights) });
  }
  for (const [index, group] of [...vehicles.values()].entries()) {
    const load = truckLoad(group);
    lines.push({ ...emptyBillOfLadingLine(`cargo-vehicle-${index + 1}`), packageQty: group.length, packageType: "VEHICLE", weightLb: wholePounds(load.weightLb), description: (oneLine(pieceNote(group[0]!)) + missingNote(load.missingWeights)).slice(0, 500) });
  }
  return lines;
}

export function billOfLadingTotals(content: Pick<BillOfLadingContent, "lines" | "orders">) {
  const sum = <T,>(items: T[], pick: (item: T) => number | undefined) => Math.round(items.reduce((total, item) => total + (pick(item) ?? 0), 0) * 100) / 100;
  return {
    handlingQty: sum(content.lines, (line) => line.handlingQty),
    packageQty: sum(content.lines, (line) => line.packageQty),
    weightLb: sum(content.lines, (line) => line.weightLb),
    orderPackages: sum(content.orders, (order) => order.packages),
    orderWeightLb: sum(content.orders, (order) => order.weightLb),
  };
}

/** "75 Algonquin Dr, Arlington Heights, IL 60005" → street on the first line, the rest on the second. */
function warehouseBlock(warehouse: Warehouse | undefined, fallback: string) {
  const address = warehouse?.address?.trim();
  if (!address) return warehouse?.name ?? fallback;
  const comma = address.indexOf(",");
  return comma < 0 ? address : `${address.slice(0, comma).trim()}\n${address.slice(comma + 1).trim()}`;
}

/** Values that repeat from one BOL to the next (carrier, SCAC, third party, signatures) come from the latest one. */
type Repeated = Pick<BillOfLadingContent, "carrierName" | "scac" | "billTo" | "freightTerms" | "shipperSignature" | "carrierSignature" | "trailerLoaded" | "freightCounted">;
function repeated(previous?: Partial<BillOfLadingContent>): Repeated {
  return {
    carrierName: previous?.carrierName || DEFAULT_CARRIER_NAME,
    scac: previous?.scac ?? "",
    billTo: previous?.billTo ?? "",
    freightTerms: previous?.freightTerms ?? "prepaid",
    shipperSignature: previous?.shipperSignature ?? "",
    carrierSignature: previous?.carrierSignature ?? "",
    trailerLoaded: previous?.trailerLoaded ?? "",
    freightCounted: previous?.freightCounted ?? "",
  };
}

export function blankBillOfLading({ number, date, previous }: { number: string; date: string; previous?: Partial<BillOfLadingContent> }): BillOfLadingContent {
  return {
    date, number, shipFrom: "", sidNumber: "", shipTo: "", trailerNumber: "", serialNumbers: "", proNumber: "", specialInstructions: "", masterBol: false,
    orders: [emptyBillOfLadingOrder("order-1")], lines: [emptyBillOfLadingLine("line-1")],
    declaredValue: "", declaredValuePer: "", codAmount: "", codFeeTerms: "", customerCheckAcceptable: false,
    shipperSignatureDate: date, carrierSignatureDate: date,
    ...repeated(previous),
  };
}

export function billOfLadingFromTruck({ number, today, truck, boxes, warehouses, previous }: { number: string; today: string; truck: Truck; boxes: Box[]; warehouses: Warehouse[]; previous?: Partial<BillOfLadingContent> }): BillOfLadingContent {
  const date = /^\d{4}-\d{2}-\d{2}/.test(truck.departureDate) ? truck.departureDate.slice(0, 10) : today;
  const cargo = boxes.filter((box) => truck.boxIds.includes(box.id));
  const lines = groupTruckCargo(cargo);
  const totals = billOfLadingTotals({ lines, orders: [] });
  const origin = warehouses.find((item) => item.id === truck.originWarehouseId);
  const lastStop = truck.stops?.at(-1);
  const destination = warehouses.find((item) => item.id === lastStop?.warehouseId);
  return {
    ...blankBillOfLading({ number, date, previous }),
    shipFrom: warehouseBlock(origin, truck.originWarehouseName ?? ""),
    shipTo: warehouseBlock(destination, lastStop?.city ?? truck.destinationCity),
    specialInstructions: truck.notes ?? "",
    orders: [{ ...emptyBillOfLadingOrder("order-1"), orderNumber: truck.code, packages: cargo.length ? totals.packageQty : undefined, weightLb: cargo.length ? totals.weightLb : undefined }],
    lines: lines.length ? lines : [emptyBillOfLadingLine("line-1")],
  };
}

/** US form date: 2026-09-12 → 09/12/2026. */
export function usDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[2]}/${match[3]}/${match[1]}` : "";
}
