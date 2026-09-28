"use server";
import {nextDocumentSequence} from "@/lib/db/document-sequence";
import { appendPayment, paymentLocation } from "@/lib/services/payment-records";
import { runMutation } from "@/lib/db/mutation";
import { requireAdminUser } from "@/lib/auth/actions";
import { withReceptionPiece } from "@/lib/services/reception-context";
import { withConsolidatedEmail, sendEmail, siteUrl } from "@/lib/services/email";
import { boxes, invoices, users, notifications } from "@/lib/db/collections";
import { receptionPaymentSchema } from "@/lib/schemas/reception-payment";
import { invoiceTotal, matchesInvoiceTotal } from "@/lib/utils/invoices";
import { transitionInvoice } from "@/lib/domain/state-machine";
import { approvePayment, receiveBox } from "@/lib/auth/admin-actions";
import { reportInvoicePayment } from "@/lib/auth/client-actions";
import { savePrivateFile, validateUpload } from "@/lib/files/repository";
import { z } from "zod";
import type {Box,Invoice} from "@/lib/types";
import type {EmailInput} from "@/lib/services/email-template";
import { receptionSchema } from "@/lib/schemas/admin";
import {collection} from '@/lib/db/store';
import {recordRevision} from '@/lib/db/revision';
import {quoteGroupWeight,allocateUnits} from '@/lib/utils/group-weight';
import {configService} from '@/lib/services/config';

const receptionRequests=collection<{id:string;actorId:string;fingerprint:string;boxIds:string[];invoiceIds:string[]}>('receptionRequests');
function savedReception(request:typeof receptionRequests[number]){
  const results=request.boxIds.map((id,index)=>{const box=boxes.find(b=>b.id===id);if(!box)throw new Error('No se encontró una pieza de la recepción guardada.');return {ok:true as const,box,invoice:invoices.find(i=>i.id===request.invoiceIds[index])};});
  return {ok:true as const,results,total:results.reduce((sum,r)=>sum+(r.invoice?Math.round(invoiceTotal(r.invoice)*100):0),0)/100,replayed:true};
}

export async function receivePackageGroup(input:unknown,data:FormData,paymentInput?:unknown,requestId?:string,groupInput?:unknown){
  return runMutation("admin:recepcion",async()=>withConsolidatedEmail(async()=>{
    const group=groupInput===undefined?undefined:z.object({totalWeightLb:z.number().finite().positive().max(1000000).multipleOf(0.001)}).safeParse(groupInput);
    if(group&&!group.success)return {ok:false as const,error:'Revisa el peso conjunto (máximo tres decimales).'};
    let prepared=input;
    if(group?.success){
      if(!Array.isArray(input)||input.length<1||input.length>50)return {ok:false as const,error:'Revisa las piezas del grupo.'};
      try{const weights=allocateUnits(group.data.totalWeightLb,input.length,1000);prepared=input.map((p,i)=>({...p,weightLb:weights[i]}));}catch(e){return {ok:false as const,error:(e as Error).message};}
    }
    const parsed=z.array(receptionSchema).min(1).max(50).safeParse(prepared);
    if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message??"Revisa los paquetes (máximo 50)."};
    const items=parsed.data;
    const actor=await requireAdminUser(["recepcion"]);
    if(requestId&&!z.string().uuid().safeParse(requestId).success)return {ok:false as const,error:'Identificador de recepción inválido.'};
    const fingerprint=recordRevision({items,payment:paymentInput??null,...(group?.success?{group:group.data}:{})});
    const previous=requestId?receptionRequests.find(r=>r.id===requestId):undefined;
    if(previous){if(previous.actorId!==actor.id||previous.fingerprint!==fingerprint)return {ok:false as const,error:'Esta recepción ya se guardó con otros datos. Revisa la bodega antes de continuar.'};return savedReception(previous);}
    if(items.some(p=>p.customer!==items[0].customer||p.originWarehouseId!==items[0].originWarehouseId||p.recipientId!==items[0].recipientId))return {ok:false as const,error:"Un grupo debe tener el mismo cliente, origen y destinatario."};
    let groupQuote:ReturnType<typeof quoteGroupWeight>|undefined;
    if(group?.success){
      const first=items[0];
      if(items.some(p=>p.reject||p.billingMode!==first.billingMode||p.customRatePerLbUsd!==first.customRatePerLbUsd||p.customPriceUsd!==first.customPriceUsd))return {ok:false as const,error:'El peso conjunto requiere un mismo tipo de cobro y tarifa, sin rechazos parciales.'};
      try{groupQuote=quoteGroupWeight(group.data.totalWeightLb,items.length,first.billingMode??'peso-real',{...await configService.getFlowConfig(),...(first.billingMode==='peso-personalizado'?{pricePerLbUsd:first.customRatePerLbUsd!}:{})},first.customPriceUsd);}catch(e){return {ok:false as const,error:(e as Error).message};}
    }
    const prealerts=items.flatMap(p=>p.prealertId?[p.prealertId]:[]);
    if(new Set(prealerts).size!==prealerts.length)return {ok:false as const,error:"Una prealerta solo puede vincularse a una pieza."};
    const payment=paymentInput===undefined?null:receptionPaymentSchema.safeParse(paymentInput);
    if(payment&&!payment.success)return {ok:false as const,error:"Revisa el método y el monto del pago."};
    const results=[];
    const groupId=crypto.randomUUID();
    const groupCode=boxes.find(b=>b.id===items[0].prealertId)?.code??`BX-26${String(nextDocumentSequence("box")).padStart(4,"0")}` as const;
    for(const [index,item] of items.entries()){
      const result=await withReceptionPiece({id:groupId,code:groupCode,index:index+1,total:items.length,...(groupQuote?{groupWeight:{totalWeightLb:groupQuote.billing.actualWeightLb,totalAmountUsd:groupQuote.billing.amountUsd,pieces:items.length},allocatedAmountUsd:groupQuote.amounts[index]}:{})},()=>receiveBoxWithPhoto({...item,invoiceNow:!!payment||item.invoiceNow},data));
      if(!result.ok)return result;
      results.push(result);
    }
    const total=results.reduce((sum,r)=>sum+(r.invoice?Math.round(invoiceTotal(r.invoice)*100):0),0)/100;
    if(payment?.success){
      if(results.some(r=>!r.invoice||r.box.status==="rechazada"))return {ok:false as const,error:"No se puede cobrar un grupo con piezas rechazadas."};
      if(["tarjeta","transferencia","deposito","zelle"].includes(payment.data.method)&&Math.abs((payment.data.amount??0)-total)>0.001)return {ok:false as const,error:`El monto debe cubrir el total del grupo: USD ${total.toFixed(2)}.`};
      if(payment.data.method==="mixto"){const mixed=await recordMixedPayments(results.map(r=>r.invoice!),payment.data);if(!mixed.ok)return mixed;}
      else for(const result of results){const saved=await recordWarehousePayment(result.invoice!.id,{...payment.data,amount:invoiceTotal(result.invoice!)},null);if(!saved.ok)return saved;result.invoice=saved.invoice;}
    }
    if(requestId)receptionRequests.push({id:requestId,actorId:actor.id,fingerprint,boxIds:results.map(r=>r.box.id),invoiceIds:results.map(r=>r.invoice?.id??'')});
    return {ok:true as const,results,total};
  },result=>result.ok&&!('replayed' in result)?receptionEmail(result):undefined));
}

// Complete an already saved reception after a declined card. Never creates more boxes.
export async function completeReceptionPayment(requestId:string,input:unknown){
 return runMutation("admin:recepcion",async()=>withConsolidatedEmail(async()=>{
  const actor=await requireAdminUser(["recepcion"]),request=receptionRequests.find(r=>r.id===requestId&&r.actorId===actor.id);
  if(!request)return {ok:false as const,error:'No encontramos esta recepción. Revisa las facturas.'};
  const parsed=receptionPaymentSchema.safeParse(input);if(!parsed.success)return {ok:false as const,error:'Revisa el método, monto y ubicación.'};
  const result=savedReception(request),payment=parsed.data;
  if(result.results.some(r=>!r.invoice||r.box.status==='rechazada'))return {ok:false as const,error:'La recepción no admite cobros.'};
  if(['tarjeta','transferencia','deposito','zelle'].includes(payment.method)&&Math.abs((payment.amount??0)-result.total)>0.001)return {ok:false as const,error:'El monto debe cubrir el total exacto de la recepción.'};
  if(result.results.every(r=>r.invoice?.collectionMethod===payment.method&&(r.invoice.status==='pagada'||(payment.method==='destino'&&r.invoice.status==='pendiente-pago-destino'))))return result;
  if(result.results.some(r=>r.invoice?.cloverPaymentId))return {ok:false as const,error:'Clover tiene un cargo en curso o confirmado. Verifica su estado antes de usar otro método.'};
  if(payment.method==="mixto"){const mixed=await recordMixedPayments(result.results.map(r=>r.invoice!),payment);if(!mixed.ok)return mixed;}
  else for(const row of result.results){const saved=await recordWarehousePayment(row.invoice!.id,{...payment,amount:invoiceTotal(row.invoice!)},null);if(!saved.ok)return saved;row.invoice=saved.invoice;}
  return {...result,replayed:false};
 },result=>result.ok&&!result.replayed?receptionEmail(result):undefined));
}

function receptionEmail(result:{results:Array<{box:Box;invoice?:Invoice}>;total:number}):EmailInput|undefined{
    const first=result.results[0].box,customer=users.find(u=>u.id===first.userId);
    if(!customer)return;
    const code=first.receptionGroup?.code??first.code;
    const firstPhoto=result.results.find(r=>r.box.photoFileId)?.box;
    const receptionPhoto=firstPhoto?.photoFileId?{fileId:firstPhoto.photoFileId,ownerId:firstPhoto.userId}:undefined;
    const rejected=result.results.filter(r=>r.box.status==="rechazada").length;
    const invoiceList=result.results.flatMap(r=>r.invoice?[`${r.invoice.number} (${r.invoice.status})`]:[]);
    const reception={reference:code,totalWeightLb:first.billing?.groupWeight?.totalWeightLb,totalUsd:invoiceList.length?result.total:undefined,pieces:result.results.map(r=>({code:r.box.code,weightLb:r.box.weightLb,dimensions:Object.values(r.box.dimensions).every(n=>n>0)?`${r.box.dimensions.length} × ${r.box.dimensions.width} × ${r.box.dimensions.height}`:"No registradas",rejected:r.box.status==="rechazada"})),invoices:result.results.flatMap(r=>r.invoice?[{number:r.invoice.number,status:r.invoice.status}]:[])};
    return {receptionPhoto,reception,to:customer.email,subject:`Recepción ${code} · ${result.results.length} unidad(es)`,heading:rejected?"Recepción registrada con observaciones":"Tu paquete ya está en bodega",body:`Recepción ${code}: ${result.results.length} unidad(es). ${result.results.map(r=>`${r.box.code}: ${r.box.weightLb} lb${r.box.billing?.groupWeight?" prorrateadas":""}, ${r.box.dimensions.length} × ${r.box.dimensions.width} × ${r.box.dimensions.height} in`).join("; ")}. ${rejected?`${rejected} unidad(es) rechazada(s); consulta los motivos en tu panel.`:""} ${invoiceList.length?`Total facturado: USD ${result.total.toFixed(2)}. Facturas: ${invoiceList.join(", ")}.`:"El cobro se determinará según la configuración de facturación."}`,actionLabel:"Ver mis paquetes",actionUrl:`${siteUrl()}/cliente/cajas`};
}

export async function receiveBoxWithPhoto(input: unknown, data: FormData, paymentInput?: unknown) {
  return runMutation("admin:recepcion", async () => withConsolidatedEmail(async () => {
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
  },result=>result.ok?receptionEmail({results:[result],total:result.invoice?invoiceTotal(result.invoice):0}):undefined));
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

async function recordMixedPayments(list:Invoice[],payment:z.output<typeof receptionPaymentSchema>){
 const parts=payment.parts;
 if(!parts||parts.length<2||!paymentLocation(payment.warehouseId))return {ok:false as const,error:'Indica los pagos y una ubicación activa.'};
 const expected=list.reduce((s,i)=>s+Math.round(invoiceTotal(i)*100),0);
 if(parts.reduce((s,p)=>s+Math.round(p.amount*100),0)!==expected)return {ok:false as const,error:`Los pagos combinados deben sumar exactamente USD ${(expected/100).toFixed(2)}.`};
 if(list.some(i=>i.cloverPaymentId||!['emitida','pendiente-pago-destino','vencida'].includes(i.status)||i.payments?.some(p=>p.status==='confirmado')))return {ok:false as const,error:'Las facturas ya tienen un pago o un cargo en revisión. Actualiza antes de continuar.'};
 const actor=await requireAdminUser(['recepcion','facturas']),at=new Date().toISOString();
 let cursor=0,remaining=Math.round(parts[0].amount*100);
 for(const invoice of list){
  let due=Math.round(invoiceTotal(invoice)*100);
  while(due>0){
   const part=parts[cursor],cents=Math.min(remaining,due);
   const entry=appendPayment(invoice,actor,'confirmado',part.method,part.method==='efectivo'?undefined:part.reference,payment.warehouseId,cents/100);
   entry.confirmedAt=at;entry.confirmedBy=actor.id;entry.confirmedByName=entry.actorName;
   invoice.collectionReferences=[...(invoice.collectionReferences??[]),{reference:entry.externalReference??entry.folio,method:part.method,at}];
   due-=cents;remaining-=cents;if(remaining===0&&cursor<parts.length-1)remaining=Math.round(parts[++cursor].amount*100);
  }
  const reported=transitionInvoice(invoice,'pago-reportado',{actor:actor.id,at,note:'Pagos combinados recibidos y registrados por operaciones.'});
  if(!reported.ok)return reported;
  Object.assign(invoice,reported.value);
  const paid=transitionInvoice(invoice,'pagada',{actor:actor.id,at,note:'La suma de pagos combinados cubre el total exacto.'});
  if(!paid.ok)return paid;
  Object.assign(invoice,paid.value);invoice.collectionMethod='mixto';
  notifications.unshift({id:crypto.randomUUID(),userId:invoice.userId,title:'Pago confirmado',body:`${invoice.number}: pagos combinados confirmados por USD ${invoiceTotal(invoice).toFixed(2)}.`,createdAt:at,read:false});
  const customer=users.find(u=>u.id===invoice.userId);
  if(customer)await sendEmail({to:customer.email,subject:`Pago confirmado · ${invoice.number}`,heading:'Tus pagos fueron registrados',body:`${invoice.number}: el total de USD ${invoiceTotal(invoice).toFixed(2)} está liquidado mediante pagos combinados. Consulta los folios y métodos en tu factura.`,actionLabel:'Ver factura',actionUrl:`${siteUrl()}/cliente/facturas/${invoice.id}`});
 }
 return {ok:true as const};
}

async function recordWarehousePayment(invoiceId: string, payment: z.output<typeof receptionPaymentSchema>, file: Parameters<typeof savePrivateFile>[3] | null) {
  const invoice = invoices.find(item => item.id === invoiceId);
  if(payment.method==="mixto"&&invoice){const mixed=await recordMixedPayments([invoice],payment);return mixed.ok?{ok:true as const,invoice}:mixed;}
  if (!invoice || !["emitida", "pendiente-pago-destino", "vencida"].includes(invoice.status)) return {ok:false as const,error:"La factura ya cambió. Actualiza antes de registrar el cobro."};
  if (["tarjeta","transferencia","deposito","zelle"].includes(payment.method) && !matchesInvoiceTotal(invoice, payment.amount ?? 0)) return {ok:false as const,error:"El monto recibido debe coincidir con el total exacto de la factura."};
  if(!paymentLocation(payment.warehouseId))return {ok:false as const,error:"Selecciona una ubicación activa para el cobro."};
  const actor = await requireAdminUser(["recepcion","facturas"]);
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
  return runMutation("admin:facturas", async () => {
    const invoice = invoices.find(item => item.id === invoiceId);
    if (!invoice || !["emitida","pendiente-pago-destino","vencida"].includes(invoice.status)) return {ok:false as const,error:"La factura no tiene un cobro pendiente. Actualiza antes de continuar."};
    const payment = receptionPaymentSchema.safeParse(input);
    if (!payment.success || payment.data.method === "destino") return {ok:false as const,error:"Selecciona el método con el que se recibió el pago."};
    const upload = await validateUpload(data,"invoice");
    if (!upload.ok) return upload;
    if (!paymentLocation(payment.data.warehouseId)) return {ok:false as const,error:"Selecciona la ubicación del cobro."};
    return recordWarehousePayment(invoice.id,payment.data,upload.file);
  });
}
