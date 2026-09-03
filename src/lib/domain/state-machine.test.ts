import { describe, expect, it } from "vitest";
import {
  BOX_TRANSITIONS,
  INVOICE_TRANSITIONS,
  SHIPMENT_TRANSITIONS,
  deliverBoxWithCascade,
  transitionBox,
  transitionInvoice,
  transitionShipment,
  transitionTruckWithCascade,
} from "@/lib/domain/state-machine";
import type { Box, BoxStatus, Invoice, InvoiceStatus, Shipment, ShipmentStatus, Truck } from "@/lib/types";
import { DEFAULT_TRUCK_CAPACITY } from "@/lib/config/operations";

const context = { actor: "Operaciones A&L", note: "Validación operativa", at: "2026-09-02T12:00:00.000Z" };
const box = (id: string, status: BoxStatus): Box => ({ id, code: `BX-${id}`, userId: "usr-001", categoryId: "small", status, dimensions: { length: 10, width: 16, height: 12 }, weightLb: 20, timeline: [] });
const shipment = (status: ShipmentStatus, boxIds = ["box-1"]): Shipment => ({ id: "ship-1", code: "SH-001", userId: "usr-001", recipientId: "rec-1", boxIds, truckId: "truck-1", status, destinationCity: "Ciudad de México", timeline: [] });
const invoice = (status: InvoiceStatus): Invoice => ({ id: "inv-1", number: "AL-0001", userId: "usr-001", shipmentId: "ship-1", status, issuedAt: "2026-08-01", dueAt: "2026-08-30", lines: [{ categoryId: "small", quantity: 1, unitPriceUsd: 80 }], insuranceUsd: 0, homeDeliveryUsd: 0, timeline: [] });

describe("transiciones de caja", () => {
  for (const [from, targets] of Object.entries(BOX_TRANSITIONS) as [BoxStatus, readonly BoxStatus[]][]) {
    for (const to of targets) {
      it(`permite ${from} → ${to}`, () => {
        const result = transitionBox(box("box-1", from), to, context);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.value.timeline.at(-1)).toMatchObject({ from, to, actor: context.actor });
      });
    }
    it(`rechaza permanencia en ${from}`, () => {
      expect(transitionBox(box("box-1", from), from, context)).toMatchObject({ ok: false });
    });
  }

  it("exige motivo al rechazar o marcar excedente", () => {
    expect(transitionBox(box("box-1", "recibida"), "rechazada", { actor: "Admin" })).toMatchObject({ ok: false });
    expect(transitionBox(box("box-1", "recibida"), "excede-categoria", { actor: "Admin" })).toMatchObject({ ok: false });
  });

  it("impide entregar una caja que todavía no llegó a destino", () => {
    expect(transitionBox(box("box-1", "en-transito"), "entregada", context)).toMatchObject({ ok: false });
  });
});

describe("transiciones de envío", () => {
  for (const [from, targets] of Object.entries(SHIPMENT_TRANSITIONS) as [ShipmentStatus, readonly ShipmentStatus[]][]) {
    for (const to of targets) {
      it(`permite ${from} → ${to}`, () => expect(transitionShipment(shipment(from), to, context).ok).toBe(true));
    }
    it(`rechaza permanencia en ${from}`, () => expect(transitionShipment(shipment(from), from, context).ok).toBe(false));
  }
});

describe("transiciones de factura", () => {
  for (const [from, targets] of Object.entries(INVOICE_TRANSITIONS) as [InvoiceStatus, readonly InvoiceStatus[]][]) {
    for (const to of targets) {
      it(`permite ${from} → ${to}`, () => expect(transitionInvoice(invoice(from), to, context).ok).toBe(true));
    }
    it(`rechaza permanencia en ${from}`, () => expect(transitionInvoice(invoice(from), from, context).ok).toBe(false));
  }

  it("no vence una factura antes de la fecha límite", () => {
    expect(transitionInvoice(invoice("emitida"), "vencida", { ...context, at: "2026-08-15" })).toMatchObject({ ok: false });
  });

  it("devuelve a emitida una factura cuando se rechaza el pago reportado", () => {
    expect(transitionInvoice(invoice("pago-reportado"), "emitida", { ...context, note: "Referencia bancaria no localizada." })).toMatchObject({ ok: true, value: { status: "emitida" } });
  });
});

describe("cascadas de camión", () => {
  it("recorre todas las etapas y actualiza cajas y envíos solo cuando corresponde", () => {
    let truck: Truck = { id: "truck-1", code: "TR-001", plate: "ABC-123", driverId: "driver-1", driverName: "Ana López", departureDate: "2026-09-04", route: "Miami → Ciudad de México", destinationCity: "Ciudad de México", status: "planificado", boxIds: ["box-1"], capacity: { ...DEFAULT_TRUCK_CAPACITY }, timeline: [] };
    let boxes = [box("box-1", "en-bodega")];
    let shipments = [shipment("confirmado")];
    for (const expected of ["cargando", "despachado", "en-frontera", "en-destino", "cerrado"] as const) {
      const result = transitionTruckWithCascade(truck, boxes, shipments, context);
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error);
      ({ truck, boxes, shipments } = result.value);
      expect(truck.status).toBe(expected);
    }
    expect(boxes[0]?.status).toBe("en-destino");
    expect(shipments[0]?.status).toBe("en-destino");
    expect(truck.timeline).toHaveLength(5);
    expect(transitionTruckWithCascade(truck, boxes, shipments, context)).toMatchObject({ ok: false });
  });

  it("impide despachar sin cajas", () => {
    const truck: Truck = { id: "truck-1", code: "TR-001", plate: "ABC-123", driverId: "driver-1", driverName: "Ana López", departureDate: "2026-09-04", route: "Miami → Puebla", destinationCity: "Puebla", status: "cargando", boxIds: [], capacity: { ...DEFAULT_TRUCK_CAPACITY }, timeline: [] };
    expect(transitionTruckWithCascade(truck, [], [], context)).toMatchObject({ ok: false, error: "No puedes despachar un camión sin cajas asignadas." });
  });
});

describe("entrega individual", () => {
  it("cierra el envío únicamente cuando todas sus cajas están entregadas", () => {
    let boxes = [box("box-1", "en-destino"), box("box-2", "en-destino")];
    let shipments = [shipment("en-destino", ["box-1", "box-2"])];
    const first = deliverBoxWithCascade("box-1", boxes, shipments, context);
    expect(first.ok).toBe(true);
    if (!first.ok) throw new Error(first.error);
    ({ boxes, shipments } = first.value);
    expect(shipments[0]?.status).toBe("en-destino");
    const second = deliverBoxWithCascade("box-2", boxes, shipments, context);
    expect(second.ok).toBe(true);
    if (!second.ok) throw new Error(second.error);
    expect(second.value.shipments[0]?.status).toBe("entregado");
    expect(second.value.completedShipmentIds).toEqual(["ship-1"]);
  });
});
