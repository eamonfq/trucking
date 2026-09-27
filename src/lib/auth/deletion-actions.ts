"use server";
import {z} from "zod";
import type {RowDataPacket} from "mysql2/promise";
import {requireAdminUser} from "./actions";
import {isFullAdmin} from "./admin-permissions";
import {sql,revokeSessions,audit} from "./repository";
import {runMutation} from "@/lib/db/mutation";
import {collection,withStore} from "@/lib/db/store";
import {boxes,invoices,shipments,trucks,users,addresses,recipients,notifications,supportTickets} from "@/lib/db/collections";
import {recordRevision} from "@/lib/db/revision";
import {reserveDocumentSequences} from "@/lib/db/document-sequence";
import {decryptEmail} from "@/lib/services/email";
const targetSchema=z.object({kind:z.enum(["order","user"]),id:z.string().min(1).max(80)});
type Target=z.infer<typeof targetSchema>;
const requests=collection<{id:string;boxIds:string[];invoiceIds:string[]}>("receptionRequests");
const attempts=collection<{id:string;invoiceIds:string[]}>("cloverAttempts");
const deletedFiles=collection<{id:string;at:string;deletionId:string}>("deletedFiles");
const history=collection<{id:string;actorId:string;at:string;reason:string;target:Target;reference:string;records:unknown}>("deletionHistory");
function remove<T extends {id:string}>(items:T[],ids:Set<string>){for(let i=items.length-1;i>=0;i--)if(ids.has(items[i].id))items.splice(i,1);}
function plan(target:Target,actorId:string){
 const boxIds=new Set<string>(),invoiceIds=new Set<string>(),shipmentIds=new Set<string>();
 const user=target.kind==="user"?users.find(u=>u.id===target.id):undefined;
 const root=target.kind==="order"?boxes.find(b=>b.id===target.id):undefined;
 if(target.kind==="user"&&!user||target.kind==="order"&&!root)throw new Error("El registro ya no existe.");
 if(user){
  if(user.id===actorId)throw new Error("No puedes eliminar tu propia cuenta.");
  if(isFullAdmin(user)&&users.filter(u=>isFullAdmin(u)).length<=1)throw new Error("Debe conservarse un administrador completo activo.");
  if(boxes.some(b=>b.userId===user.id)||invoices.some(i=>i.userId===user.id)||shipments.some(s=>s.userId===user.id))throw new Error("Este usuario tiene operaciones. Elimina primero sus órdenes desde esta sección.");
 }else{
  boxIds.add(root!.id);
  let previous="";
  while(previous!==[...boxIds,...invoiceIds,...shipmentIds].join("|")){
   previous=[...boxIds,...invoiceIds,...shipmentIds].join("|");
   const groups=new Set(boxes.filter(b=>boxIds.has(b.id)).map(b=>b.receptionGroup?.id).filter(Boolean));
   for(const b of boxes)if(boxIds.has(b.id)||b.receptionGroup&&groups.has(b.receptionGroup.id)||b.shipmentId&&shipmentIds.has(b.shipmentId)){boxIds.add(b.id);if(b.shipmentId)shipmentIds.add(b.shipmentId);}
   for(const s of shipments)if(shipmentIds.has(s.id)||s.boxIds.some(id=>boxIds.has(id))){shipmentIds.add(s.id);s.boxIds.forEach(id=>boxIds.add(id));}
   for(const i of invoices)if(invoiceIds.has(i.id)||i.boxIds?.some(id=>boxIds.has(id))||i.shipmentId&&shipmentIds.has(i.shipmentId)){invoiceIds.add(i.id);i.boxIds?.forEach(id=>boxIds.add(id));if(i.shipmentId)shipmentIds.add(i.shipmentId);}
  }
 }
 const selectedBoxes=boxes.filter(b=>boxIds.has(b.id)),selectedInvoices=invoices.filter(i=>invoiceIds.has(i.id)),selectedShipments=shipments.filter(s=>shipmentIds.has(s.id));
 if(selectedInvoices.some(i=>i.cloverPaymentId||i.collectionMethod==="clover"||i.payments?.some(p=>p.method==="clover"))||attempts.some(a=>a.invoiceIds.some(id=>invoiceIds.has(id))))throw new Error("Hay registros vinculados a Clover. No se pueden borrar desde la limpieza de pruebas; conserva el historial del proveedor.");
 if(new Set([...selectedBoxes,...selectedInvoices,...selectedShipments].map(r=>r.userId)).size>1)throw new Error("Las relaciones incluyen a varios clientes. Revisa los vínculos antes de eliminar.");
 const reference=user?user.email||user.lockerCode||user.id:root!.receptionGroup?.code??root!.code;
 const selectedTrucks=trucks.filter(t=>t.boxIds.some(id=>boxIds.has(id)));
 const selectedRequests=requests.filter(r=>r.boxIds.some(id=>boxIds.has(id))||r.invoiceIds.some(id=>invoiceIds.has(id)));
 const selectedAddresses=user?addresses.filter(a=>a.userId===user.id):[],selectedRecipients=user?recipients.filter(r=>r.userId===user.id):[];
 const selectedTickets=user?supportTickets.filter(t=>t.userId===user.id):[];
 const records={boxes:selectedBoxes,invoices:selectedInvoices,shipments:selectedShipments,trucks:selectedTrucks,requests:selectedRequests,user,addresses:selectedAddresses,recipients:selectedRecipients,supportTickets:selectedTickets};
 return {reference,records,boxIds,invoiceIds,shipmentIds,revision:recordRevision(records)};
}
export async function getDeletionDirectory(){
 const actor=await requireAdminUser();
 return withStore(async()=>{
  const groups=new Set<string>();
  const orders=boxes.filter(b=>{const key=b.receptionGroup?.id??b.id;if(groups.has(key))return false;groups.add(key);return true;}).map(b=>({kind:"order" as const,id:b.id,reference:b.receptionGroup?.code??b.code,name:users.find(u=>u.id===b.userId)?.firstName??"Cliente",detail:`${b.receptionGroup?.total??1} unidad(es) · ${b.status}`}));
  const people=users.filter(u=>u.id!==actor.id).map(u=>({kind:"user" as const,id:u.id,reference:u.email||u.lockerCode||u.id,name:`${u.firstName} ${u.paternalLastName}`,detail:u.role==="cliente"?"Cliente":u.role==="operador"?"Operador de almacén":"Administrativo"}));
  return {orders,people};
 });
}
export async function previewDeletion(input:unknown){
 const actor=await requireAdminUser(),parsed=targetSchema.safeParse(input);
 if(!parsed.success)return {ok:false as const,error:"Selecciona un registro."};
 return withStore(async()=>{try{const p=plan(parsed.data,actor.id);return {ok:true as const,reference:p.reference,revision:p.revision,counts:{packages:p.records.boxes.length,invoices:p.records.invoices.length,shipments:p.records.shipments.length,trucks:p.records.trucks.length,users:p.records.user?1:0},paidInvoices:p.records.invoices.filter(i=>i.status==="pagada").length};}catch(e){return {ok:false as const,error:e instanceof Error?e.message:"No se pudo preparar la eliminación."};}});
}
export async function deleteTestRecord(input:unknown){
 return runMutation("admin",async()=>{
  const actor=await requireAdminUser();
  const parsed=targetSchema.extend({revision:z.string().length(64),confirmation:z.literal("ELIMINAR"),testData:z.literal(true),reason:z.string().trim().min(5).max(500)}).safeParse(input);
  if(!parsed.success)return {ok:false as const,error:"Confirma que son pruebas, escribe ELIMINAR y explica el motivo."};
  let p:ReturnType<typeof plan>;
  try{p=plan(parsed.data,actor.id);}catch(e){return {ok:false as const,error:e instanceof Error?e.message:"No se puede eliminar."};}
  if(p.revision!==parsed.data.revision)return {ok:false as const,error:"Los registros cambiaron. Consulta nuevamente la vista previa antes de eliminar."};
  const id=crypto.randomUUID(),at=new Date().toISOString(),ownerId=p.records.user?.id??p.records.boxes[0]?.userId;
  const owner=users.find(u=>u.id===ownerId);
  reserveDocumentSequences();
  const [files]=await sql().execute<RowDataPacket[]>("SELECT id,entity_type,entity_id FROM private_files WHERE owner_id=?",[ownerId??""]);
  for(const file of files)if(p.records.user||file.entity_type==="box"&&p.boxIds.has(file.entity_id)||file.entity_type==="invoice"&&p.invoiceIds.has(file.entity_id))if(!deletedFiles.some(f=>f.id===file.id))deletedFiles.push({id:file.id,at,deletionId:id});
  // Cancel pending messages referring to removed records. Already delivered messages cannot be recalled.
  const references=[...p.records.boxes.map(b=>b.code),...p.records.invoices.map(i=>i.number),...p.records.shipments.map(s=>s.code),p.reference];
  const [queued]=await sql().query<RowDataPacket[]>("SELECT id,payload FROM email_outbox WHERE status IN ('queued','retry') FOR UPDATE");
  for(const row of queued){try{const message=decryptEmail(typeof row.payload==="string"?JSON.parse(row.payload):row.payload);if(owner?.email&&message.to===owner.email&&(p.records.user||references.some(ref=>ref.length>3&&JSON.stringify(message).includes(ref)))){await sql().execute("UPDATE email_outbox SET status='cancelled',payload=JSON_OBJECT(),last_error='Removed test record' WHERE id=?",[row.id]);await sql().execute("DELETE FROM push_outbox WHERE id=?",[row.id]);}}catch{/* Invalid legacy payloads remain for the existing worker policy. */}}
  history.push({id,actorId:actor.id,at,reason:parsed.data.reason,target:{kind:parsed.data.kind,id:parsed.data.id},reference:p.reference,records:JSON.parse(JSON.stringify(p.records))});
  for(const truck of p.records.trucks){truck.boxIds=truck.boxIds.filter(boxId=>!p.boxIds.has(boxId));truck.timeline.push({from:truck.status,to:truck.status,actor:actor.id,at,note:`Eliminación de datos de prueba ${id}. Carga y totales recalculados.`});}
  remove(boxes,p.boxIds);remove(invoices,p.invoiceIds);remove(shipments,p.shipmentIds);remove(requests,new Set(p.records.requests.map(r=>r.id)));
  if(p.records.user){
   const userId=p.records.user.id;
   await revokeSessions(userId);
   await sql().execute("DELETE FROM auth_tokens WHERE user_id=?",[userId]);
   // Keep a disabled FK anchor for retained private files; it cannot authenticate or reserve the email.
   await sql().execute("UPDATE accounts SET active=0,email=NULL,locker_code=NULL,verified_at=NULL WHERE user_id=?",[userId]);
   remove(users,new Set([userId]));remove(addresses,new Set(p.records.addresses.map(a=>a.id)));remove(recipients,new Set(p.records.recipients.map(r=>r.id)));remove(supportTickets,new Set(p.records.supportTickets.map(t=>t.id)));
   remove(notifications,new Set(notifications.filter(n=>n.userId===userId).map(n=>n.id)));
  }else remove(notifications,new Set(notifications.filter(n=>n.userId===ownerId&&references.some(ref=>ref.length>3&&(n.body.includes(ref)||n.title.includes(ref)))).map(n=>n.id)));
  await audit(actor.id,`test-data.deleted:${id}`);
  return {ok:true as const,message:"Registro retirado del sistema operativo. Se conservó un respaldo de auditoría; no se realizaron reembolsos ni borrados externos.",deletionId:id};
 });
}
