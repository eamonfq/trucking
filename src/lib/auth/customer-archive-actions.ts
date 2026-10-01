"use server";
import { z } from "zod";
import { requireAdminUser } from "./actions";
import { audit } from "./repository";
import { runMutation } from "@/lib/db/mutation";
import { withStore,collection } from "@/lib/db/store";
import { boxes,invoices,shipments,trucks,users } from "@/lib/db/collections";
import { recordRevision } from "@/lib/db/revision";
import { reserveDocumentSequences } from "@/lib/db/document-sequence";
import type { Box } from "@/lib/types";

type Archive={id:string;userId:string;reference:string;at:string;actorId:string;reason:string;boxes:Box[];restoredAt?:string;restoredBy?:string};
const archives=collection<Archive>("customerArchivedBoxes");
const targetSchema=z.object({id:z.string().min(1),scope:z.enum(["piece","reception"])});
function selection(id:string,scope:"piece"|"reception"){
 const root=boxes.find(b=>b.id===id);if(!root)throw new Error("La caja ya no está en el inventario activo.");
 const selected=scope==="reception"&&root.receptionGroup?boxes.filter(b=>b.receptionGroup?.id===root.receptionGroup!.id):[root];
 if(selected.some(b=>b.userId!==root.userId))throw new Error("El grupo incluye a otro cliente. Revisa sus vínculos.");
 if(selected.some(b=>b.truckId||b.shipmentId||shipments.some(s=>s.boxIds.includes(b.id))||trucks.some(t=>t.boxIds.includes(b.id))))throw new Error("Primero retira la asignación al envío o camión. El retiro no modifica movimientos logísticos.");
 if(selected.some(b=>!["pre-alertada","en-bodega","rechazada","excede-categoria"].includes(b.status)))throw new Error("Solo se pueden retirar cajas o recepciones antes de su despacho.");
 if(scope==="piece"&&root.receptionGroup?.total!==1&&(root.billing?.groupWeight||root.receptionGroup?.groupWeight))throw new Error("Esta caja usa un peso conjunto. Retira la recepción completa, no una pieza con peso desconocido.");
 const ids=new Set(selected.map(b=>b.id)),linked=invoices.filter(i=>i.boxIds?.some(boxId=>ids.has(boxId))),peers=root.receptionGroup?boxes.filter(b=>b.receptionGroup?.id===root.receptionGroup!.id):selected;
 if(linked.some(i=>i.cloverPaymentId&&i.status!=="pagada"))throw new Error("Hay un cobro Clover en curso o por conciliar. Verifica su resultado antes de retirar estas cajas.");
 return {selected,linked,peers,revision:recordRevision({selected,linked,peers}),reference:scope==="piece"?root.code:root.receptionGroup?.code??root.code};
}
export async function previewCustomerArchive(input:unknown){
 await requireAdminUser();
 const parsed=targetSchema.safeParse(input);if(!parsed.success)return {ok:false as const,error:"Selecciona una caja o recepción."};
 return withStore(async()=>{try{const plan=selection(parsed.data.id,parsed.data.scope);return {ok:true as const,reference:plan.reference,revision:plan.revision,count:plan.selected.length,invoicesKept:plan.linked.length,paidInvoicesKept:plan.linked.filter(i=>i.status==="pagada").length};}catch(error){return {ok:false as const,error:error instanceof Error?error.message:"No se pudo preparar el retiro."};}});
}
export async function archiveCustomerBoxes(input:unknown){
 return runMutation("admin",async()=>{
  const actor=await requireAdminUser(),parsed=targetSchema.extend({revision:z.string().length(64),reason:z.string().trim().min(5).max(500),confirmation:z.literal("RETIRAR")}).safeParse(input);
  if(!parsed.success)return {ok:false as const,error:"Escribe RETIRAR y explica el motivo."};
  let plan:ReturnType<typeof selection>;
  try{plan=selection(parsed.data.id,parsed.data.scope);}catch(error){return {ok:false as const,error:error instanceof Error?error.message:"No se puede retirar."};}
  if(plan.revision!==parsed.data.revision)return {ok:false as const,error:"La operación cambió. Revisa nuevamente la vista previa."};
  reserveDocumentSequences();
  const entry:Archive={id:crypto.randomUUID(),userId:plan.selected[0].userId,reference:plan.reference,boxes:structuredClone(plan.selected),actorId:actor.id,at:new Date().toISOString(),reason:parsed.data.reason};
  archives.push(entry);
  const ids=new Set(plan.selected.map(b=>b.id));
  // Reversible removal of packages only. Financial records, photos and external payments remain intact.
  for(let index=boxes.length-1;index>=0;index--)if(ids.has(boxes[index].id))boxes.splice(index,1);
  const remaining=plan.peers.filter(b=>!ids.has(b.id)).sort((a,b)=>(a.receptionGroup?.index??0)-(b.receptionGroup?.index??0));
  for(const [index,box] of remaining.entries())if(box.receptionGroup){box.receptionGroup.index=index+1;box.receptionGroup.total=remaining.length;box.timeline.push({from:box.status,to:box.status,actor:actor.id,at:entry.at,note:`Retiro del inventario ${entry.reference}: ${entry.reason}. Reimprimir etiquetas.`});}
  users.find(u=>u.id===entry.userId)?.activity.unshift({id:crypto.randomUUID(),type:"correccion",description:`${entry.boxes.length} caja(s) retirada(s) del inventario; restaurables. Facturas y pagos conservados. ${entry.reason}`,actor:`${actor.firstName} ${actor.paternalLastName}`,at:entry.at});
  await audit(actor.id,`customer-boxes.archived:${entry.id}`);
  return {ok:true as const,archiveId:entry.id};
 });
}
export async function restoreCustomerBoxes(id:string){
 return runMutation("admin",async()=>{
  const actor=await requireAdminUser(),entry=archives.find(a=>a.id===id);
  if(!entry||entry.restoredAt)return {ok:false as const,error:"El registro ya fue restaurado o no existe."};
  if(!users.some(u=>u.id===entry.userId))return {ok:false as const,error:"El cliente ya no existe. No se restauraron cajas."};
  if(entry.boxes.some(saved=>boxes.some(b=>b.id===saved.id||b.code===saved.code)))return {ok:false as const,error:"Hay una caja con el mismo código. Revisa el inventario antes de restaurar."};
  const at=new Date().toISOString();
  for(const saved of entry.boxes){const restored=structuredClone(saved);restored.timeline.push({from:restored.status,to:restored.status,actor:actor.id,at,note:`Retiro revertido por administración. Archivo ${entry.id}. Reimprimir etiquetas.`});boxes.push(restored);}
  const groupIds=new Set(entry.boxes.map(b=>b.receptionGroup?.id).filter(Boolean));
  for(const groupId of groupIds){const group=boxes.filter(b=>b.receptionGroup?.id===groupId).sort((a,b)=>a.code.localeCompare(b.code));group.forEach((b,index)=>{b.receptionGroup!.index=index+1;b.receptionGroup!.total=group.length;});}
  entry.restoredAt=at;entry.restoredBy=actor.id;
  users.find(u=>u.id===entry.userId)?.activity.unshift({id:crypto.randomUUID(),type:"correccion",description:`${entry.boxes.length} caja(s) restaurada(s) al inventario. ${entry.reference}`,actor:`${actor.firstName} ${actor.paternalLastName}`,at});
  await audit(actor.id,`customer-boxes.restored:${entry.id}`);
  return {ok:true as const};
 });
}
export async function getCustomerArchives(userId:string){
 await requireAdminUser();
 return withStore(async()=>archives.filter(a=>a.userId===userId&&!a.restoredAt).map(a=>({id:a.id,reference:a.reference,count:a.boxes.length,reason:a.reason,at:a.at})));
}
