import "server-only";
import { categorySchema } from "@/lib/config/category-schema";
import { boxes, invoices, trucks } from "@/lib/db/collections";
import { z } from "zod";
import { BOX_CATEGORIES, type BoxCategory } from "@/lib/config/box-categories";
import { DEFAULT_FLOW_CONFIG, type FlowConfig, ORIGIN_MODES, PACKING_MODES, BILLING_MOMENTS, EXCESS_POLICIES, DELIVERY_MODES } from "@/lib/config/flow";
import { collection, withStore } from "@/lib/db/store";
import { clone } from "./delay";
const settings = collection<{ id: string; flow: FlowConfig; rates: BoxCategory[] }>("settings");
const current = () => settings[0] ?? { id: "main", flow: clone(DEFAULT_FLOW_CONFIG), rates: clone([...BOX_CATEGORIES]) };
const flowSchema = z.object({ pricePerLbUsd:z.number().positive().max(10000).multipleOf(0.01), dimensionalBase:z.number().positive().max(1000000), dimensionalFactor:z.number().positive().max(1000000), originMode: z.enum(ORIGIN_MODES), packingMode: z.enum(PACKING_MODES), billingMoment: z.enum(BILLING_MOMENTS), excessPolicy: z.enum(EXCESS_POLICIES), deliveryMode: z.enum(DELIVERY_MODES), exchangeRateMxn: z.number().positive().max(1000), excessFeeUsd: z.number().min(0).max(10000).multipleOf(0.01), invoiceDueDays: z.number().int().min(1).max(365), destinationCities:z.array(z.string().trim().min(2).max(80)).min(1).max(100).refine(items=>new Set(items.map(item=>item.toLowerCase())).size===items.length) });
export const configService = {
  getFlowConfig: () => withStore(async () => clone({ ...DEFAULT_FLOW_CONFIG, ...current().flow })),
  getCatalog: () => withStore(async () => clone(current().rates)),
  getRateTable: () => withStore(async () => clone(current().rates.filter(rate=>rate.active!==false))),
  updateFlowConfig: (input: Partial<FlowConfig>) => withStore(async () => { const value = current(); const flow = flowSchema.parse({ ...DEFAULT_FLOW_CONFIG, ...value.flow, ...input }); if (flow.excessPolicy === "recargo" && flow.excessFeeUsd <= 0) throw new Error("Define el recargo por caja antes de activar la política."); value.flow = flow; settings[0] = value; return clone(value.flow); }, true),
  updateRateTable: (input: BoxCategory[]) => withStore(async () => {
    const parsed=z.array(categorySchema).min(1).max(100).parse(input);
    if(new Set(parsed.map(rate=>rate.id)).size!==parsed.length || new Set(parsed.map(rate=>rate.name.toLocaleLowerCase())).size!==parsed.length || !parsed.some(rate=>rate.active)) throw new Error("Debe haber categorías únicas y al menos una activa.");
    for(const previous of current().rates) {
      if(parsed.some(rate=>rate.id===previous.id)) continue;
      if(boxes.some(box=>box.categoryId===previous.id) || invoices.some(invoice=>invoice.lines.some(line=>line.categoryId===previous.id)) || trucks.some(truck=>Object.hasOwn(truck.capacity,previous.id))) throw new Error(`La categoría ${previous.name} tiene historial. Desactívala en lugar de eliminarla.`);
    }
    for(const previous of current().rates) {
      boxes.filter(box=>box.categoryId===previous.id).forEach(box=>{box.categoryName??=previous.name;});
      invoices.forEach(invoice=>invoice.lines.filter(line=>line.categoryId===previous.id).forEach(line=>{line.categoryName??=previous.name;}));
    }
    const value = current(); value.rates = clone(parsed); settings[0] = value; return clone(value.rates);
  }, true),
};
