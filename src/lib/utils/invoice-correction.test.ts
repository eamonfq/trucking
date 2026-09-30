import { expect,it } from "vitest";
import { invoiceCorrectionSchema } from "@/lib/schemas/invoice-correction";
import type { Invoice,PaymentRecord } from "@/lib/types";
import { invoiceCorrectionDraft,validateInvoiceCorrection } from "./invoice-correction";
const payment:PaymentRecord={folio:"PAG-1",status:"confirmado",amountUsd:80,method:"efectivo",recordedAt:"2026-09-20T12:00:00.000Z",actorId:"a",actorName:"Admin",warehouseId:"w",warehouseName:"Chicago",customerId:"c",invoiceId:"i",boxIds:["b"]};
export const fixture:Invoice={id:"i",number:"AL-1",userId:"c",shipmentId:"",status:"pagada",issuedAt:"2026-09-20T12:00:00.000Z",dueAt:"2026-09-25T23:59:59.000Z",lines:[{categoryId:"small",categoryName:"Small",quantity:1,unitPriceUsd:80}],insuranceUsd:0,homeDeliveryUsd:0,payments:[payment],timeline:[]};
const locations=[{id:"w",name:"Chicago"}];
it("accepts editable paid invoice items and cheque payment when both totals match",()=>{
 const draft=invoiceCorrectionDraft(fixture);draft.lines=[{categoryId:"small",categoryName:"Transporte",description:"Corrección",quantity:2,unitPriceUsd:50}];draft.payments[0].amountUsd=100;draft.payments[0].method="cheque";draft.payments[0].externalReference="CH-1";
 expect(validateInvoiceCorrection(fixture,invoiceCorrectionSchema.parse(draft),locations)).toBe(100);
 expect(draft.payments[0].folio).toBe(payment.folio);
});
it("rejects paid totals that do not match, missing folios and invented payment folios",()=>{
 const draft=invoiceCorrectionDraft(fixture);draft.lines[0].unitPriceUsd=100;
 expect(()=>validateInvoiceCorrection(fixture,draft,locations)).toThrow("deben sumar");
 draft.lines[0].unitPriceUsd=80;draft.payments=[];
 expect(()=>validateInvoiceCorrection(fixture,draft,locations)).toThrow("no se borran");
 draft.payments=invoiceCorrectionDraft(fixture).payments;draft.payments[0].folio="another-invoice";
 expect(()=>validateInvoiceCorrection(fixture,draft,locations)).toThrow("folios");
});
it("requires agreement, report and confirmed status to agree with invoice state",()=>{
 const draft=invoiceCorrectionDraft(fixture);draft.status="emitida";
 expect(()=>validateInvoiceCorrection(fixture,draft,locations)).toThrow("pagos confirmados");
 draft.payments[0].status="acuerdo";draft.payments[0].method="efectivo";
 expect(()=>validateInvoiceCorrection(fixture,draft,locations)).toThrow("acuerdo");
 draft.payments[0].method="destino";draft.status="pendiente-pago-destino";
 expect(validateInvoiceCorrection(fixture,draft,locations)).toBe(80);
 draft.payments[0].status="pendiente";draft.payments[0].method="transferencia";draft.status="pago-reportado";
 expect(validateInvoiceCorrection(fixture,draft,locations)).toBe(80);
});
it("locks real Clover payments and totals but permits descriptions without changing the charge",()=>{
 const original={...fixture,cloverPaymentId:"clv-charge",payments:[{...payment,method:"clover"}]};
 const draft=invoiceCorrectionSchema.parse(invoiceCorrectionDraft(original));draft.lines[0].description="Contenido aclarado";
 expect(validateInvoiceCorrection(original,draft,locations)).toBe(80);
 draft.payments[0].method="efectivo";
 expect(()=>validateInvoiceCorrection(original,draft,locations)).toThrow("Clover");
 const newClover=invoiceCorrectionDraft(fixture);newClover.payments[0].method="clover";
 expect(()=>validateInvoiceCorrection(fixture,newClover,locations)).toThrow("proveedor");
});
it("validates dates, quantities, precision and the last invoice item",()=>{
 const draft=invoiceCorrectionDraft(fixture);
 expect(invoiceCorrectionSchema.safeParse({...draft,lines:[]}).success).toBe(false);
 expect(invoiceCorrectionSchema.safeParse({...draft,dueDate:"2026-02-30"}).success).toBe(false);
 expect(invoiceCorrectionSchema.safeParse({...draft,insuranceUsd:0.001}).success).toBe(false);
 expect(()=>validateInvoiceCorrection(fixture,{...draft,dueDate:"2026-09-19"},locations)).toThrow("emisión");
});
it("preserves online and legacy Clover confirmations without requiring an offline warehouse",()=>{
 for(const original of [
  {...fixture,cloverPaymentId:"online",payments:[{...payment,method:"clover",warehouseId:undefined}]},
  {...fixture,collectionMethod:"clover" as const,payments:[]},
 ]){
  const draft=invoiceCorrectionDraft(original);draft.lines[0].description="Aclaración de contenido";
  expect(validateInvoiceCorrection(original,draft,locations)).toBe(80);
  draft.lines[0].unitPriceUsd=81;
  expect(()=>validateInvoiceCorrection(original,draft,locations)).toThrow("Clover");
 }
});
