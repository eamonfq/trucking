import { describe, expect, it } from "vitest";
import { getFlowGuide } from "./flow-guide";
import { DEFAULT_FLOW_CONFIG } from "@/lib/config/flow";
import { BOX_TRANSITIONS, SHIPMENT_TRANSITIONS, TRUCK_ACTIONS, INVOICE_TRANSITIONS } from "./state-machine";

describe("mapa del flujo público",()=>{
  it("documenta solo estados que existen en las máquinas reales",()=>{
    for(const track of ["envio","pagos","soporte"] as const)for(const step of getFlowGuide(DEFAULT_FLOW_CONFIG,track)){
      if(step.box)expect(BOX_TRANSITIONS).toHaveProperty(step.box);
      if(step.shipment)expect(SHIPMENT_TRANSITIONS).toHaveProperty(step.shipment);
      if(step.truck)expect(TRUCK_ACTIONS).toHaveProperty(step.truck);
      if(step.invoice)expect(INVOICE_TRANSITIONS).toHaveProperty(step.invoice);
      expect(step.client.length).toBeGreaterThan(10);expect(step.admin.length).toBeGreaterThan(10);expect(step.guard.length).toBeGreaterThan(10);
    }
  });
  it("separa confirmación, despacho, llegada y entrega",()=>{
    const steps=getFlowGuide(DEFAULT_FLOW_CONFIG,"envio");
    expect(steps.find(step=>step.id==="envio")).toMatchObject({box:"en-bodega",shipment:"confirmado"});
    expect(steps.find(step=>step.id==="salida")).toMatchObject({box:"en-transito",shipment:"en-transito",truck:"despachado"});
    expect(steps.find(step=>step.id==="frontera")).toMatchObject({box:"en-transito",shipment:"en-transito",truck:"en-frontera"});
    expect(steps.find(step=>step.id==="destino")).toMatchObject({box:"en-destino",shipment:"en-destino"});
    expect(steps.at(-1)).toMatchObject({box:"entregada",shipment:"entregado"});
  });
  it("adapta origen, facturación y entrega sin mutar la configuración",()=>{
    const direct={...DEFAULT_FLOW_CONFIG,originMode:"entrega-directa" as const,billingMoment:"al-recibir" as const,deliveryMode:"sucursal" as const};
    expect(getFlowGuide(direct,"envio")[1].box).toBeUndefined();
    expect(getFlowGuide(direct,"envio").find(step=>step.id==="recepcion")?.system).toContain("Emite aquí");
    expect(getFlowGuide(direct,"pagos")[0].summary).toContain("recepción");
    expect(getFlowGuide(direct,"envio").at(-1)?.summary).toContain("en sucursal");
    expect(DEFAULT_FLOW_CONFIG.originMode).toBe("casillero");
  });
  it("presenta soporte y revisión de pagos como flujos independientes",()=>{
    expect(getFlowGuide(DEFAULT_FLOW_CONFIG,"soporte").map(step=>step.support)).toEqual(["abierto","en-revision","abierto","cerrado"]);
    expect(getFlowGuide(DEFAULT_FLOW_CONFIG,"pagos").map(step=>step.invoice)).toEqual(["emitida","pendiente-pago-destino","pago-reportado","pago-reportado","pagada"]);
  });
});
