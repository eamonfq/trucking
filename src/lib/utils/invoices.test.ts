import { describe, expect, it } from "vitest";
import { invoiceTotal, matchesInvoiceTotal, isInvoiceOverdue } from "./invoices";
import type { Invoice } from "@/lib/types";
const invoice:Invoice={id:"invoice",number:"AL-1",userId:"user",shipmentId:"ship",status:"emitida",issuedAt:"2026-01-01",dueAt:"2026-01-16",lines:[{categoryId:"small",quantity:2,unitPriceUsd:80.15}],insuranceUsd:5,homeDeliveryUsd:10,timeline:[]};
describe("importes y vencimientos",()=>{
  it("incluye todas las líneas y cargos",()=>expect(invoiceTotal(invoice)).toBe(175.3));
  it("compara centavos y rechaza importes incompletos o no finitos",()=>{expect(matchesInvoiceTotal(invoice,175.3)).toBe(true);for(const amount of [1,175.29,175.31,175.304,NaN,Infinity])expect(matchesInvoiceTotal(invoice,amount)).toBe(false);});
  it("calcula vencimiento solo para documentos exigibles",()=>{const at=Date.parse("2026-02-01");expect(isInvoiceOverdue(invoice,at)).toBe(true);expect(isInvoiceOverdue(invoice,Date.parse("2026-01-10"))).toBe(false);for(const status of ["borrador","pagada","pago-reportado"] as const)expect(isInvoiceOverdue({...invoice,status},at)).toBe(false);});
});
