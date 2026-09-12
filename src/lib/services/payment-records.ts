import "server-only";
import { collection } from "@/lib/db/store";
import { warehouses, boxes } from "@/lib/db/collections";
import type { Invoice, User, PaymentRecord } from "@/lib/types";
import { invoiceTotal } from "@/lib/utils/invoices";

const counters=collection<{id:string;value:number}>("paymentCounters");
export function paymentLocation(id?:string) {
  const active=warehouses.filter(w=>w.active);
  return id?active.find(w=>w.id===id):active.length===1?active[0]:undefined;
}
// Called only inside the serialized write transaction; failed operations roll back the sequence too.
export function appendPayment(invoice:Invoice,actor:Pick<User,"id"|"firstName"|"paternalLastName">,status:PaymentRecord["status"],method:string,reference?:string,warehouseId?:string) {
  const location=paymentLocation(warehouseId);
  if(status!=="pendiente"&&!location)throw new Error("Selecciona la ubicación donde se registra el pago.");
  const year=new Date().getUTCFullYear(), id=`payments-${year}`;
  let counter=counters.find(c=>c.id===id);
  if(!counter){counter={id,value:0};counters.push(counter);}
  counter.value++;
  const entry:PaymentRecord={folio:`${status==="acuerdo"?"ACU":"PAG"}-${year}-${String(counter.value).padStart(6,"0")}`,status,amountUsd:invoiceTotal(invoice),method,externalReference:reference?.trim()||undefined,recordedAt:new Date().toISOString(),actorId:actor.id,actorName:`${actor.firstName} ${actor.paternalLastName}`,warehouseId:location?.id,warehouseName:location?.name,customerId:invoice.userId,invoiceId:invoice.id,boxIds:invoice.boxIds??boxes.filter(b=>b.shipmentId===invoice.shipmentId&&b.userId===invoice.userId).map(b=>b.id),shipmentId:invoice.shipmentId||undefined};
  entry.boxCodes=boxes.filter(b=>entry.boxIds.includes(b.id)&&b.userId===invoice.userId).map(b=>b.code);
  invoice.payments=[...(invoice.payments??[]),entry];return entry;
}
