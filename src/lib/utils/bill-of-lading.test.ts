import { describe, expect, it } from "vitest";
import type { Box, Truck, Warehouse } from "@/lib/types";
import { billOfLadingSchema } from "@/lib/schemas/bill-of-lading";
import { billOfLadingFromTruck, billOfLadingTotals, blankBillOfLading, DEFAULT_BOXES_DESCRIPTION, DEFAULT_CARRIER_NAME, groupTruckCargo, usDate } from "./bill-of-lading";

const box = (id: string, weightLb: number, extra: Partial<Box> = {}): Box => ({ id, code: `BX-${id}`, userId: "u", categoryId: "custom-cargo", status: "cargada-en-camion", dimensions: { length: 10, width: 10, height: 10 }, weightLb, timeline: [], ...extra });

describe("groupTruckCargo", () => {
  it("summarises ordinary boxes by quantity and keeps each vehicle on its own line", () => {
    const boxes = [
      ...Array.from({ length: 25 }, (_, i) => box(`b${i}`, 40.4, { contentsNote: i % 2 ? "ENTREGAR EN VALLE DE JUAREZ." : undefined })),
      box("moto", 600, { contentsNote: "2007 HONDA SHADOW VIN:7M304403\n\nDESTINO: QUITUPAN" }),
      box("atv", 850, { contentsNote: "2026 Can-Am Outlander vin 001042" }),
    ];
    const lines = groupTruckCargo(boxes);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toMatchObject({ packageQty: 25, packageType: "BOXES", weightLb: 1010, description: DEFAULT_BOXES_DESCRIPTION });
    expect(lines[1]).toMatchObject({ packageQty: 1, packageType: "VEHICLE", weightLb: 600, description: "2007 HONDA SHADOW VIN:7M304403. DESTINO: QUITUPAN" });
    expect(lines[2]).toMatchObject({ packageQty: 1, weightLb: 850 });
  });

  it("groups the pieces of one vehicle reception and flags missing weights instead of inventing them", () => {
    const group = (index: number) => ({ id: "rec-1", code: "BX-260001", index, total: 3 });
    const note = "2013 CAN-AM OUTLANDER 650 VIN: DJ000291\n2019 POLARIS 1000 VIN: KH84153";
    const lines = groupTruckCargo([
      box("v1", 1058.667, { contentsNote: note, receptionGroup: group(1) }),
      box("v2", 1058.667, { contentsNote: note, receptionGroup: group(2) }),
      box("v3", 1058.666, { contentsNote: note, receptionGroup: group(3) }),
      box("c1", 0, { weightUnknown: true }),
      box("c2", 30),
    ]);
    expect(lines.map((line) => [line.packageQty, line.weightLb])).toEqual([[2, 30], [3, 3176]]);
    expect(lines[0]!.description).toContain("1 piece without recorded weight");
  });

  it("does not treat words that merely start with VIN as a vehicle", () => {
    expect(groupTruckCargo([box("x", 10, { contentsNote: "VINTAGE LAMPS" })])[0]!.packageType).toBe("BOXES");
  });
});

describe("prefill", () => {
  const warehouses: Warehouse[] = [
    { id: "chi", name: "Chicago", city: "Arlington Heights", address: "75 Example Dr, Arlington Heights, IL 60005", active: true, arrivalMessage: "" },
    { id: "vj", name: "Valle de Juárez", city: "Valle de Juárez", address: "Las Cuatro Esquinas, 49540 Valle de Juárez, Jalisco", active: true, arrivalMessage: "" },
  ];
  const truck: Truck = { id: "t", code: "TR-260101", status: "cargando", plate: "QA", driverId: "d", driverName: "Chofer", departureDate: "2026-09-14", route: "", destinationCity: "Valle de Juárez", originWarehouseId: "chi", stops: [{ warehouseId: "vj", city: "Valle de Juárez", arrivalDate: "2026-09-18" }], boxIds: ["a", "b"], capacity: {}, notes: "HANDLE WITH CARE", timeline: [] };

  it("fills origin, destination, cargo and special instructions from the truck", () => {
    const bill = billOfLadingFromTruck({ number: "BOL-260001", today: "2026-11-08", truck, warehouses, boxes: [box("a", 40), box("b", 60), box("other", 99)] });
    expect(bill).toMatchObject({ date: "2026-09-14", number: "BOL-260001", shipFrom: "75 Example Dr\nArlington Heights, IL 60005", shipTo: "Las Cuatro Esquinas\n49540 Valle de Juárez, Jalisco", specialInstructions: "HANDLE WITH CARE", carrierName: DEFAULT_CARRIER_NAME, freightTerms: "prepaid" });
    expect(bill.orders[0]).toMatchObject({ orderNumber: "TR-260101", packages: 2, weightLb: 100 });
    expect(billOfLadingSchema.parse(bill)).toEqual(bill);
  });

  it("repeats carrier, SCAC, third party and signatures from the latest bill", () => {
    const previous = { carrierName: "OTRO", scac: "ABCD", billTo: "EXAMPLE SALES INC", freightTerms: "third-party" as const, shipperSignature: "Firma", carrierSignature: "Chofer", trailerLoaded: "driver" as const, freightCounted: "driver-pieces" as const, specialInstructions: "no se copia" };
    const bill = blankBillOfLading({ number: "BOL-260002", date: "2026-11-08", previous });
    expect(bill).toMatchObject({ carrierName: "OTRO", scac: "ABCD", billTo: "EXAMPLE SALES INC", freightTerms: "third-party", shipperSignature: "Firma", carrierSignature: "Chofer", trailerLoaded: "driver", freightCounted: "driver-pieces", specialInstructions: "", shipperSignatureDate: "2026-11-08" });
  });
});

describe("schema and totals", () => {
  it("accepts blank numbers and thousands separators, and rejects negatives", () => {
    const parsed = billOfLadingSchema.parse({ lines: [{ id: "l", packageQty: "1,234", weightLb: "" }] });
    expect(parsed.lines[0]).toMatchObject({ packageQty: 1234, weightLb: undefined, hazmat: false });
    expect(billOfLadingSchema.safeParse({ lines: [{ id: "l", weightLb: -1 }] }).success).toBe(false);
    expect(billOfLadingTotals({ lines: [{ ...parsed.lines[0]!, weightLb: 10.5 }, { ...parsed.lines[0]!, packageQty: 1, weightLb: 2.25 }], orders: [] })).toMatchObject({ packageQty: 1235, weightLb: 12.75 });
  });
  it("prints US dates", () => { expect(usDate("2026-09-12")).toBe("09/12/2026"); expect(usDate("")).toBe(""); });
});
