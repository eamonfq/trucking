import type { Invoice, PaymentRecord } from "@/lib/types";
import type { InvoiceCorrection } from "@/lib/schemas/invoice-correction";
import { invoiceTotal } from "./invoices";

export function isCloverInvoice(invoice: Invoice) {
  return !!invoice.cloverPaymentId || invoice.collectionMethod === "clover" || invoice.paymentReport?.method === "clover" || !!invoice.payments?.some(payment => payment.method === "clover");
}

export function invoiceCorrectionDraft(invoice: Invoice): InvoiceCorrection {
  return {issuedDate:invoice.issuedAt.slice(0,10),dueDate:invoice.dueAt.slice(0,10),status:invoice.status,insuranceUsd:invoice.insuranceUsd,homeDeliveryUsd:invoice.homeDeliveryUsd,excessFeeUsd:invoice.excessFeeUsd??0,
    lines:invoice.lines.map(line=>({...line,categoryName:line.categoryName??line.categoryId,description:line.description??""})),
    payments:(invoice.payments??[]).map(payment=>({folio:payment.folio,method:payment.method as InvoiceCorrection["payments"][number]["method"],amountUsd:payment.amountUsd,status:payment.status,externalReference:payment.externalReference??"",recordedDate:payment.recordedAt.slice(0,10),warehouseId:payment.warehouseId??""}))};
}

// Validate everything before changing any stored entity or allocating payment folios.
export function validateInvoiceCorrection(invoice: Invoice, data: InvoiceCorrection, locations: {id:string;name:string;active?:boolean}[]) {
  if(data.dueDate<data.issuedDate)throw new Error("El vencimiento no puede ser anterior a la emisión.");
  const total=invoiceTotal({...invoice,...data});
  if(!(total>0)||total>100000000)throw new Error("El total debe ser positivo y estar dentro del límite permitido.");
  const existing=invoice.payments??[];
  const folios=data.payments.filter(p=>p.folio).map(p=>p.folio);
  if(new Set(folios).size!==folios.length||folios.some(f=>!existing.some(p=>p.folio===f)))throw new Error("Los folios de pago no coinciden con esta factura.");
  if(existing.some(p=>!folios.includes(p.folio)))throw new Error("Los pagos anteriores no se borran. Corrige su estado o referencia; el folio debe conservarse.");
  if(isCloverInvoice(invoice)){
    const original=invoiceCorrectionDraft(invoice).payments;
    if(data.status!==invoice.status||Math.round(total*100)!==Math.round(invoiceTotal(invoice)*100)||data.payments.length!==original.length||data.payments.some((p,i)=>Object.entries(p).some(([key,value])=>value!==original[i]?.[key as keyof typeof p])))throw new Error("Clover protege el importe, estado y pagos del cargo. Puedes corregir textos o partidas conservando el mismo total; no se realizan cargos ni reembolsos.");
    // Online and historical Clover charges may not carry a warehouse or individual payment records.
    // Their existing provider confirmation must stay intact, not be converted into an offline payment.
    return total;
  }
  for(const payment of data.payments){
    if(!payment.folio&&payment.amountUsd>total)throw new Error("Un pago nuevo no puede superar el total de la factura.");
    const previous=existing.find(p=>p.folio===payment.folio);
    if(payment.method==="clover"&&previous?.method!=="clover")throw new Error("Un cargo Clover solo se confirma desde el proveedor.");
    if(previous?.method==="clover"&&Object.entries(payment).some(([key,value])=>value!==invoiceCorrectionDraft({...invoice,payments:[previous]}).payments[0][key as keyof typeof payment]))throw new Error("Los cargos reales de Clover no se pueden modificar manualmente.");
    if(payment.method==="destino"&&payment.status!=="acuerdo"||payment.status==="acuerdo"&&payment.method!=="destino")throw new Error("Pago en destino es un acuerdo, no dinero confirmado.");
    if(!payment.warehouseId&&payment.status!=="pendiente"&&payment.status!=="rechazado")throw new Error("Selecciona la ubicación de cada pago o acuerdo.");
    if(payment.warehouseId&&!locations.some(w=>w.id===payment.warehouseId))throw new Error("Selecciona una ubicación válida.");
    if(!previous&&payment.warehouseId&&locations.find(w=>w.id===payment.warehouseId)?.active===false)throw new Error("Para un pago nuevo selecciona un almacén activo.");
  }
  const confirmed=data.payments.filter(p=>p.status==="confirmado").reduce((sum,p)=>sum+Math.round(p.amountUsd*100),0);
  const pending=data.payments.filter(p=>p.status==="pendiente").reduce((sum,p)=>sum+Math.round(p.amountUsd*100),0);
  if(data.status==="pagada"&&confirmed!==Math.round(total*100))throw new Error(`Para dejarla pagada, los pagos confirmados deben sumar USD ${total.toFixed(2)}.`);
  if(data.status!=="pagada"&&confirmed!==0)throw new Error("Hay pagos confirmados. La factura debe quedar pagada y sus importes deben coincidir con el total. No se realizan reembolsos desde este editor.");
  if(data.status==="pago-reportado"&&pending!==Math.round(total*100)||data.status!=="pago-reportado"&&pending!==0)throw new Error("El estado debe coincidir con los reportes pendientes de revisión y su importe total.");
  if(data.status==="pendiente-pago-destino"&&!data.payments.some(p=>p.status==="acuerdo"))throw new Error("Agrega o conserva el acuerdo de pago en destino.");
  return total;
}

export function correctedPayment(previous: PaymentRecord, data: InvoiceCorrection["payments"][number], location?:{id:string;name:string}) {
  return {...previous,method:data.method,amountUsd:data.amountUsd,status:data.status,externalReference:data.externalReference||undefined,recordedAt:data.recordedDate===previous.recordedAt.slice(0,10)?previous.recordedAt:`${data.recordedDate}T12:00:00.000Z`,warehouseId:location?.id,warehouseName:location?.name};
}
