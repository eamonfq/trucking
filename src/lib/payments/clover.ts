import 'server-only';
import {createHash} from 'node:crypto';
import {collection,withStore} from '@/lib/db/store';
import {invoices,users,boxes,notifications} from '@/lib/db/collections';
import {getCurrentUser} from '@/lib/auth/actions';
import {canCollectInvoice,type AdminPrincipal} from '@/lib/auth/admin-permissions';
import {invoiceTotal} from '@/lib/utils/invoices';
import {appendPayment,paymentLocation} from '@/lib/services/payment-records';
import {sendEmail,siteUrl} from '@/lib/services/email';
import {cloverConfig,cloverRequest,isCapturedCharge,type CloverCharge} from './clover-provider';
import type {Invoice} from '@/lib/types';

type Attempt={id:string;invoiceIds:string[];customerId:string;actorId:string;warehouseId?:string;warehouseName:string;amount:number;sourceHash:string;environment:string;merchantId:string;status:'processing'|'paid'|'declined'|'review';createdAt:string;chargeId?:string};
const attempts=collection<Attempt>('cloverAttempts');
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
async function actor(){const user=await getCurrentUser();if(!user||!['admin','cliente'].includes(user.role))throw new Error('No tienes permiso para cobrar o pagar.');return user;}
function selected(ids:string[],user:AdminPrincipal & {id:string}){
  if(!Array.isArray(ids)||!ids.length||ids.length>50||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||id.length>100))throw new Error('Selecciona entre 1 y 50 facturas.');
  const list=ids.map(id=>invoices.find(i=>i.id===id));
  if(list.some(i=>!i||!canCollectInvoice(user,i))||new Set(list.map(i=>i?.userId)).size!==1)throw new Error('Las facturas deben pertenecer al mismo cliente y estar dentro de tus permisos.');
  return list as Invoice[];
}
function activeAttempt(list:Invoice[]){const ids=new Set(list.map(i=>i.cloverPaymentId).filter(Boolean));if(ids.size>1)throw new Error('Hay distintos cobros en curso. Revisa cada factura.');const attempt=ids.size?attempts.find(a=>a.id===[...ids][0]):undefined;if(ids.size&&!attempt)throw new Error('El pago requiere revisión administrativa.');if(attempt&&list.some(i=>!attempt.invoiceIds.includes(i.id)))throw new Error('No mezcles facturas nuevas con un cargo existente.');return attempt;}
function publicAttempt(a:Attempt){return {id:a.id,status:a.status,amountUsd:a.amount/100,chargeId:a.chargeId};}
export async function quoteClover(ids:string[]){return withStore(async()=>{
  const user=await actor();let list=selected(ids,user);const attempt=activeAttempt(list);
  if(attempt)return {attempt:publicAttempt(attempt),invoiceIds:attempt.invoiceIds,amountUsd:attempt.amount/100,invoiceNumbers:selected(attempt.invoiceIds,user).map(i=>i.number),canReconcile:user.role==='admin'};
  if(list.length===1&&list[0].status!=='pagada')list=selected(groupInvoiceIds(list[0]),user);
  if(activeAttempt(list))throw new Error('Otra factura de esta recepción ya tiene un cobro en curso. Abre esa factura para consultar el estado.');
  if(list.some(i=>!['emitida','pendiente-pago-destino','vencida'].includes(i.status)))throw new Error('Hay facturas pagadas o con un reporte por revisar. Actualiza antes de pagar.');
  const config=cloverConfig();
  return {invoiceIds:list.map(i=>i.id),amountUsd:list.reduce((s,i)=>s+Math.round(invoiceTotal(i)*100),0)/100,invoiceNumbers:list.map(i=>i.number),config:{publicKey:config.publicKey,merchantId:config.merchantId,sdkUrl:config.sdkUrl,environment:config.environment},canReconcile:user.role==='admin'};
});}

// Commit a durable reservation before ANY network charge. No database transaction spans the request.
export async function chargeClover(ids:string[],source:string,expectedAmount:number,ip:string,warehouseId?:string){
  const config=cloverConfig();
  if(!/^clv_[a-zA-Z0-9_-]{5,200}$/.test(source))throw new Error('La tarjeta no se pudo tokenizar.');
  const reserved=await withStore(async()=>{
    const user=await actor(),list=selected(ids,user),existing=activeAttempt(list);
    if(existing)return {attempt:{...existing},created:false,ecomind:'ecom' as const};
    if(attempts.some(a=>a.sourceHash===hash(source)))throw new Error('Esta tarjeta ya fue tokenizada para otro intento. Abre un formulario nuevo.');
    if(list.some(i=>!['emitida','pendiente-pago-destino','vencida'].includes(i.status)))throw new Error('La factura ya cambió; actualiza antes de cobrar.');
    const amount=list.reduce((s,i)=>s+Math.round(invoiceTotal(i)*100),0);
    if(!Number.isSafeInteger(amount)||amount<=0||amount!==Math.round(expectedAmount*100))throw new Error('El total cambió. Revisa el importe antes de confirmar.');
    const location=user.role==='admin'?paymentLocation(warehouseId):undefined;
    if(user.role==='admin'&&!location)throw new Error('Selecciona el almacén del cobro.');
    const attempt:Attempt={id:crypto.randomUUID(),invoiceIds:list.map(i=>i.id),customerId:list[0].userId,actorId:user.id,warehouseId:location?.id,warehouseName:location?.name??'Portal del cliente · pago en línea',amount,sourceHash:hash(source),environment:config.environment,merchantId:config.merchantId,status:'processing',createdAt:new Date().toISOString()};
    attempts.push(attempt);for(const invoice of list)invoice.cloverPaymentId=attempt.id;
    return {attempt:{...attempt},created:true,ecomind:user.role==='admin'?'moto' as const:'ecom' as const};
  },true);
  if(!reserved.created)return publicAttempt(reserved.attempt);
  let response;
  try{response=await cloverRequest('',{id:reserved.attempt.id,amount:reserved.attempt.amount,source,ip,ecomind:reserved.ecomind});}
  catch{return finish(reserved.attempt.id,undefined,false);}
  // Only an explicit card decline is a definitive no-charge. All ambiguous outcomes remain locked.
  return finish(reserved.attempt.id,response.ok?response.data:undefined,response.status===400&&response.data.error?.type==='card_error');
}
async function finish(id:string,data:CloverCharge|undefined,declined:boolean){return withStore(async()=>{
  const attempt=attempts.find(a=>a.id===id)!;
  if(attempt.status==='paid')return publicAttempt(attempt);
  if(data?.id)attempt.chargeId=data.id;
  if(data&&isCapturedCharge(data,attempt.amount)){
    const list=attempt.invoiceIds.map(id=>invoices.find(i=>i.id===id)!);
    if(list.some(i=>!i||i.cloverPaymentId!==id)||list.reduce((s,i)=>s+Math.round(invoiceTotal(i)*100),0)!==attempt.amount)throw new Error('Clover confirmó el cargo; conciliación local pendiente. No vuelvas a pagar.');
    const user=users.find(u=>u.id===attempt.actorId)!;const at=new Date().toISOString();
    for(const invoice of list){
      const payment=appendPayment(invoice,user,'pendiente','clover',data.id);
      Object.assign(payment,{status:'confirmado',confirmedAt:at,confirmedBy:attempt.actorId,confirmedByName:'Clover · confirmación del servidor',warehouseId:attempt.warehouseId,warehouseName:attempt.warehouseName});
      invoice.timeline.push({from:invoice.status,to:'pagada',actor:'Clover',at,note:`Cargo verificado ${data.id}. Folio ${payment.folio}.`});
      invoice.status='pagada';invoice.collectionMethod='clover';
      invoice.collectionReferences=[...(invoice.collectionReferences??[]),{method:'clover',reference:data.id!,at}];
      invoice.paymentReport={method:'clover',amountUsd:invoiceTotal(invoice),reference:data.id!,reportedAt:at};
    }
    attempt.status='paid';
    const message=`Pago de USD ${(attempt.amount/100).toFixed(2)} confirmado con Clover para ${list.map(i=>i.number).join(', ')}. Referencia: ${data.id}.`;
    notifications.unshift({id:crypto.randomUUID(),userId:attempt.customerId,title:'Pago confirmado con Clover',body:message,createdAt:at,read:false});
    const customer=users.find(u=>u.id===attempt.customerId);
    if(customer)await sendEmail({to:customer.email,subject:'Pago confirmado con Clover',heading:'Tu pago fue confirmado',body:message,actionLabel:'Ver facturas',actionUrl:`${siteUrl()}/cliente/facturas`});
  }else if(declined){attempt.status='declined';for(const invoice of invoices.filter(i=>i.cloverPaymentId===id))delete invoice.cloverPaymentId;}
  else attempt.status='review';
  return publicAttempt(attempt);
},true);}

// Read-only provider reconciliation, never another charge. Match the exact token and amount.
export async function reconcileClover(ids:string[],chargeId:string){
  if(!/^[a-zA-Z0-9_-]{5,100}$/.test(chargeId))throw new Error('Indica el ID del cargo de Clover.');
  const attempt=await withStore(async()=>{const user=await actor();if(user.role!=='admin')throw new Error('Solo administración puede conciliar.');const a=activeAttempt(selected(ids,user));if(!a)throw new Error('No hay un cobro pendiente de conciliación.');return {...a};});
  const config=cloverConfig();
  if(attempt.environment!==config.environment||attempt.merchantId!==config.merchantId)throw new Error('Restaura la cuenta y entorno originales para conciliar.');
  const response=await cloverRequest(`/${encodeURIComponent(chargeId)}`),data=response.data;
  if(!response.ok||data.id!==chargeId||typeof data.source?.id!=='string'||hash(data.source.id)!==attempt.sourceHash||data.amount!==attempt.amount||data.currency!=='usd')throw new Error('El cargo no coincide con este intento. No se modificó el pago.');
  return finish(attempt.id,data,data.paid===false&&data.status==='failed');
}

export function groupInvoiceIds(invoice:Invoice){
  const groupIds=new Set(boxes.filter(b=>invoice.boxIds?.includes(b.id)).map(b=>b.receptionGroup?.id).filter(Boolean));
  if(groupIds.size!==1)return [invoice.id];
  const boxIds=new Set(boxes.filter(b=>b.userId===invoice.userId&&groupIds.has(b.receptionGroup?.id)).map(b=>b.id));
  return invoices.filter(i=>i.userId===invoice.userId&&i.boxIds?.some(id=>boxIds.has(id))&&['emitida','pendiente-pago-destino','vencida'].includes(i.status)).map(i=>i.id);
}
