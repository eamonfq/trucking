"use server";
import { z } from "zod";
import { requireAdminUser } from "./actions";
import { audit } from "./repository";
import { runMutation } from "@/lib/db/mutation";
import { collection } from "@/lib/db/store";
import { invoices,users,warehouses,notifications } from "@/lib/db/collections";
import { recordRevision } from "@/lib/db/revision";
import { invoiceCorrectionSchema } from "@/lib/schemas/invoice-correction";
import { correctedPayment, isCloverInvoice, validateInvoiceCorrection } from "@/lib/utils/invoice-correction";
import { appendPayment } from "@/lib/services/payment-records";
import { sendEmail,siteUrl } from "@/lib/services/email";

const edits=collection<{id:string;kind:string;entityId:string;actorId:string;at:string;reason:string;before:unknown;after:unknown}>("operationalEdits");
export async function correctInvoice(input:unknown){
  return runMutation("admin",async()=>{
    const actor=await requireAdminUser();
    const parsed=z.object({id:z.string().min(1),expected:z.string().length(64),reason:z.string().trim().min(5).max(1000),values:invoiceCorrectionSchema}).strict().safeParse(input);
    if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message??"Revisa los campos de la factura."};
    const {id,expected,reason,values}=parsed.data,invoice=invoices.find(i=>i.id===id);
    if(!invoice)return {ok:false as const,error:"La factura ya no existe."};
    if(recordRevision(invoice)!==expected)return {ok:false as const,error:"La factura cambió. Cierra el editor y actualiza antes de corregirla."};
    try{validateInvoiceCorrection(invoice,values,warehouses);}catch(error){return {ok:false as const,error:error instanceof Error?error.message:"Revisa los pagos."};}
    const before=structuredClone(invoice),at=new Date().toISOString(),actorName=`${actor.firstName} ${actor.paternalLastName}`;
    Object.assign(invoice,{lines:values.lines,insuranceUsd:values.insuranceUsd,homeDeliveryUsd:values.homeDeliveryUsd,excessFeeUsd:values.excessFeeUsd,status:values.status,
      issuedAt:values.issuedDate===invoice.issuedAt.slice(0,10)?invoice.issuedAt:`${values.issuedDate}T00:00:00.000Z`,dueAt:values.dueDate===invoice.dueAt.slice(0,10)?invoice.dueAt:`${values.dueDate}T23:59:59.000Z`});
    const previous=invoice.payments??[];
    const financialLocked=isCloverInvoice(before);
    if(!financialLocked){
    invoice.payments=[];
    for(const data of values.payments){
      const old=previous.find(p=>p.folio===data.folio),location=warehouses.find(w=>w.id===data.warehouseId);
      const payment=old?correctedPayment(old,data,location):correctedPayment(appendPayment(invoice,actor,data.status==="acuerdo"?"acuerdo":"pendiente",data.method,data.externalReference,data.warehouseId,data.amountUsd),data,location);
      if(!old)invoice.payments!.pop();
      if(data.status==="confirmado"&&old?.status!=="confirmado")Object.assign(payment,{confirmedAt:at,confirmedBy:actor.id,confirmedByName:actorName});
      invoice.payments!.push(payment);
    }
    const current=invoice.payments.filter(p=>values.status==="pagada"?p.status==="confirmado":values.status==="pago-reportado"?p.status==="pendiente":p.status==="acuerdo");
    invoice.collectionMethod=current.length>1?"mixto":current[0]?.method as typeof invoice.collectionMethod;
    invoice.collectionReferences=current.map(p=>({method:p.method as NonNullable<typeof invoice.collectionReferences>[number]["method"],reference:p.externalReference??p.folio,at:p.recordedAt}));
    if(["pagada","pago-reportado"].includes(invoice.status))invoice.paymentReport={...invoice.paymentReport,amountUsd:current.reduce((s,p)=>s+p.amountUsd,0),method:invoice.collectionMethod??"",reference:current.map(p=>p.externalReference??p.folio).join(", "),reportedAt:at};else{delete invoice.paymentReport;delete invoice.paymentReviewNote;}
    }
    invoice.timeline.push({from:before.status,to:invoice.status,actor:actorName,at,note:`Corrección administrativa: ${reason}. Sin cargos ni reembolsos externos.`});
    edits.unshift({id:crypto.randomUUID(),kind:"invoice",entityId:id,actorId:actor.id,at,reason,before,after:structuredClone(invoice)});
    await audit(actor.id,`invoice.corrected:${id}`);
    const customer=users.find(u=>u.id===invoice.userId),body=`Se corrigió la factura ${invoice.number}. Motivo: ${reason}. Consulta el desglose actualizado en tu panel.`;
    notifications.unshift({id:crypto.randomUUID(),userId:invoice.userId,title:"Factura actualizada",body,createdAt:at,read:false});
    if(customer?.email)await sendEmail({to:customer.email,subject:`Factura actualizada · ${invoice.number}`,heading:"Tu factura fue actualizada",body,actionLabel:"Ver factura",actionUrl:`${siteUrl()}/cliente/facturas/${id}`});
    return {ok:true as const,invoice:structuredClone(invoice)};
  });
}
