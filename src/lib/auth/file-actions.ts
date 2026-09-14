"use server";
import { appendPayment, paymentLocation } from "@/lib/services/payment-records";
import { runMutation } from "@/lib/db/mutation";
import { requireAdminUser } from "@/lib/auth/actions";
import { sendEmail, siteUrl } from "@/lib/services/email";
import { boxes, invoices, users, notifications } from "@/lib/db/collections";
import { receptionPaymentSchema } from "@/lib/schemas/reception-payment";
import { invoiceTotal, matchesInvoiceTotal } from "@/lib/utils/invoices";
import { transitionInvoice } from "@/lib/domain/state-machine";
import { approvePayment, receiveBox } from "@/lib/auth/admin-actions";
import { reportInvoicePayment } from "@/lib/auth/client-actions";
import { savePrivateFile, validateUpload } from "@/lib/files/repository";
import { z } from "zod";
import { receptionSchema } from "@/lib/schemas/admin";

export async function receivePackageGroup(input:unknown,data:FormData,paymentInput?:unknown){
  return runMutation("admin",async()=>{
    const parsed=z.array(receptionSchema).min(1).max(50).safeParse(input);
    if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message??"Revisa los paquetes (máximo 50)."};
    const items=parsed.data;
    if(items.some(p=>p.customer!==items[0].customer||p.originWarehouseId!==items[0].originWarehouseId||p.recipientId!==items[0].recipientId))return {ok:false as const,error:"Un grupo debe tener el mismo cliente, origen y destinatario."};
    const prealerts=items.flatMap(p=>p.prealertId?[p.prealertId]:[]);
    if(new Set(prealerts).size!==prealerts.length)return {ok:false as const,error:"Una prealerta solo puede vincularse a una pieza."};
    const payment=paymentInput===undefined?null:receptionPaymentSchema.safeParse(paymentInput);
    if(payment&&!payment.success)return {ok:false as const,error:"Revisa el método y el monto del pago."};
    const results=[];
    for(const item of items){
      const result=await receiveBoxWithPhoto({...item,invoiceNow:!!payment||item.invoiceNow},data);
      if(!result.ok)return result;
      results.push(result);
    }
    const total=results.reduce((sum,r)=>sum+(r.invoice?invoiceTotal(r.invoice):0),0);
    if(payment?.success){
      if(results.some(r=>!r.invoice||r.box.status==="rechazada"))return {ok:false as const,error:"No se puede cobrar un grupo con piezas rechazadas."};
      if(["tarjeta","transferencia","deposito"].includes(payment.data.method)&&Math.abs((payment.data.amount??0)-total)>0.001)return {ok:false as const,error:`El monto debe cubrir el total del grupo: USD ${total.toFixed(2)}.`};
      for(const result of results){const saved=await recordWarehousePayment(result.invoice!.id,{...payment.data,amount:invoiceTotal(result.invoice!)},null);if(!saved.ok)return saved;result.invoice=saved.invoice;}
    }
    const groupId=crypto.randomUUID();
    results.forEach((r,index)=>{const group={id:groupId,index:index+1,total:results.length};r.box.receptionGroup=group;boxes.find(b=>b.id===r.box.id)!.receptionGroup=group;});
    return {ok:true as const,results,total};
  });
}

export async function receiveBoxWithPhoto(input: unknown, data: FormData, paymentInput?: unknown) {
  return runMutation("admin", async () => {
    const upload = await validateUpload(data,"box");
    if (!upload.ok) return upload;
    const payment = paymentInput === undefined ? null : receptionPaymentSchema.safeParse(paymentInput);
    if (payment && !payment.success) return { ok: false as const, error: payment.error.issues[0]?.message ?? "Revisa el pago." };
    const receiptData = new FormData();
    if (data.get("receipt")) receiptData.set("file", data.get("receipt")!);
    const receipt = await validateUpload(receiptData, "invoice");
    if (!receipt.ok) return receipt;
    if (payment?.success && !paymentLocation(payment.data.warehouseId)) return {ok:false as const,error:"Selecciona la ubicación donde registras el pago."};
    const receptionInput = payment && input && typeof input === "object" ? {...input, invoiceNow:true} : input;
    const result = await receiveBox(receptionInput);
    if (!result.ok) return result;
    if (upload.file) {
      const id = await savePrivateFile(result.box.userId,"box",result.box.id,upload.file);
      const box = boxes.find(item=>item.id===result.box.id)!;
      box.photoFileId = id; box.photos = [upload.file.name];
      result.box = box;
    }
    if (payment?.success) {
      if (!result.invoice || result.box.status === "rechazada") return {ok:false as const,error:"No se puede registrar un pago para una caja rechazada."};
      const saved = await recordWarehousePayment(result.invoice.id, payment.data, receipt.file);
      if (!saved.ok) return saved;
      result.invoice = saved.invoice;
    }
    return result;
  });
}
export async function reportPaymentWithReceipt(invoiceId: string, input: unknown, data: FormData) {
  return runMutation("cliente", async () => {
    const upload = await validateUpload(data,"invoice");
    if (!upload.ok) return upload;
    const result = await reportInvoicePayment(invoiceId,input);
    if (!result.ok) return result;
    if (upload.file) {
      const id = await savePrivateFile(result.invoice.userId,"invoice",result.invoice.id,upload.file);
      const invoice = invoices.find(item=>item.id===result.invoice.id)!;
      invoice.paymentReport!.receiptFileId = id;
      invoice.paymentReport!.receiptName = upload.file.name;
      invoice.receiptFiles = [...(invoice.receiptFiles ?? []), {id,name:upload.file.name}];
      result.invoice = invoice;
    }
    return result;
  });
}

async function recordWarehousePayment(invoiceId: string, payment: { method: "efectivo" | "destino" | "tarjeta" | "transferencia" | "deposito"; amount?: number; reference?:string; warehouseId?:string }, file: Parameters<typeof savePrivateFile>[3] | null) {
  const invoice = invoices.find(item => item.id === invoiceId);
  if (!invoice || !["emitida", "pendiente-pago-destino"].includes(invoice.status)) return {ok:false as const,error:"La factura ya cambió. Actualiza antes de registrar el cobro."};
  if (["tarjeta","transferencia","deposito"].includes(payment.method) && !matchesInvoiceTotal(invoice, payment.amount ?? 0)) return {ok:false as const,error:"El monto recibido debe coincidir con el total exacto de la factura."};
  if(!paymentLocation(payment.warehouseId))return {ok:false as const,error:"Selecciona una ubicación activa para el cobro."};
  const actor = await requireAdminUser();
  const at = new Date().toISOString();
  const next = transitionInvoice(invoice, payment.method === "destino" ? "pendiente-pago-destino" : "pago-reportado", {actor:actor.id, at, note:payment.method === "destino" ? "Acuerdo de pago pendiente en destino. No se ha recibido dinero." : `Cobro en ${payment.method} registrado por operaciones.`});
  if (!next.ok) return next;
  Object.assign(invoice, next.value);
  let id: string | undefined;
  if(file){id=await savePrivateFile(invoice.userId, "invoice", invoice.id, file);invoice.receiptFiles=[...(invoice.receiptFiles??[]),{id,name:file.name}];}
  const entry=appendPayment(invoice,actor,payment.method==="destino"?"acuerdo":"pendiente",payment.method,payment.method==="efectivo"?undefined:payment.reference,payment.warehouseId);
  const reference=entry.externalReference || entry.folio;
  invoice.collectionReferences=[...(invoice.collectionReferences??[]),{reference,method:payment.method,at}];
  invoice.collectionMethod = payment.method;
  if (payment.method !== "destino") {
    invoice.paymentReport = {method:payment.method, amountUsd:invoiceTotal(invoice), reference, receiptFileId:id, receiptName:file?.name, reportedAt:at};
    return approvePayment(invoice.id, `Cobro total en ${payment.method} confirmado por ${actor.id} con comprobante.`, at);
  }
  notifications.unshift({id:crypto.randomUUID(), userId:invoice.userId, title:"Pago pendiente en destino", body:`${invoice.number}: el total de ${invoiceTotal(invoice)} USD se pagará en destino.`, createdAt:at, read:false});
  const user = users.find(item => item.id === invoice.userId);
  if (user) await sendEmail({to:user.email, subject:"Pago pendiente en destino", heading:"Tu pago se realizará en destino", body:`La factura ${invoice.number}, por ${invoiceTotal(invoice)} USD, sigue pendiente de cobro. La referencia registrada documenta el acuerdo y no acredita un pago.`,actionLabel:"Ver factura",actionUrl:`${siteUrl()}/cliente/facturas/${invoice.id}`});
  return {ok:true as const, invoice};
}

export async function collectDestinationPayment(invoiceId: string, input: unknown, data: FormData) {
  return runMutation("admin", async () => {
    const invoice = invoices.find(item => item.id === invoiceId);
    if (!invoice || invoice.status !== "pendiente-pago-destino") return {ok:false as const,error:"La factura no tiene un cobro pendiente en destino. Actualiza antes de continuar."};
    const payment = receptionPaymentSchema.safeParse(input);
    if (!payment.success || payment.data.method === "destino") return {ok:false as const,error:"Selecciona el método con el que se recibió el pago."};
    const upload = await validateUpload(data,"invoice");
    if (!upload.ok) return upload;
    if (!paymentLocation(payment.data.warehouseId)) return {ok:false as const,error:"Selecciona la ubicación del cobro."};
    return recordWarehousePayment(invoice.id,payment.data,upload.file);
  });
}
