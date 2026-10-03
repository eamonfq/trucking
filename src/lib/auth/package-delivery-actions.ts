"use server";

import {z} from 'zod';
import {requireAdminUser} from './actions';
import {canAnyAdmin} from './admin-permissions';
import {runMutation} from '@/lib/db/mutation';
import {withStore,collection} from '@/lib/db/store';
import {recordRevision} from '@/lib/db/revision';
import {boxes,recipients,addresses,warehouses} from '@/lib/db/collections';
import {customerAddressSchema} from '@/lib/schemas/customer';
import {mexicanPhoneSchema} from '@/lib/schemas/address';
import {formatDeliveryAddress} from '@/lib/utils/address-display';
import {packageLabelRecipient} from '@/lib/utils/package-label-recipient';

const readSections=['bodega','recepcion','clientes','camiones'] as const;
const editSections=['recepcion','clientes','camiones'] as const;
const deliveryEdits=collection<{id:string;boxId:string;actorId:string;at:string;reason:string;before:unknown;after:unknown}>('packageDeliveryEdits');
const inputSchema=z.object({
 revision:z.string().length(64),recipientId:z.string().default(''),
 name:z.string().trim().min(3,'Escribe el nombre de quien recibe.').max(180),phone:mexicanPhoneSchema,
 addressId:z.string().default(''),newAddress:customerAddressSchema.optional(),
 reason:z.string().trim().min(5,'Explica el motivo del cambio (al menos 5 caracteres).').max(500),
});

export async function getPackageDelivery(boxId:string){
 const actor=await requireAdminUser(readSections);
 return withStore(async()=>{
  const box=boxes.find(b=>b.id===boxId);if(!box)return null;
  return structuredClone({
   revision:recordRevision(box),recipientId:box.recipientId??'',recipient:packageLabelRecipient(box,recipients,addresses),
   recipients:recipients.filter(r=>r.userId===box.userId),addresses:addresses.filter(a=>a.userId===box.userId),
   warehouseName:warehouses.find(w=>w.id===box.destinationWarehouseId)?.name,
   canEdit:canAnyAdmin(actor,editSections)&&!['entregada','rechazada'].includes(box.status),
  });
 });
}

/** Explicit, package-only correction. Never mutates the customer's directory, payments or physical route. */
export async function savePackageDelivery(boxId:string,input:unknown){
 return runMutation('admin:recepcion|clientes|camiones',async()=>{
  const actor=await requireAdminUser(editSections),parsed=inputSchema.safeParse(input);
  if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message??'Revisa los datos de entrega.'};
  const box=boxes.find(b=>b.id===boxId);
  if(!box)return {ok:false as const,error:'El paquete ya no está en el inventario activo.'};
  if(['entregada','rechazada'].includes(box.status))return {ok:false as const,error:'No se modifica la entrega de un paquete entregado o rechazado.'};
  if(recordRevision(box)!==parsed.data.revision)return {ok:false as const,error:'El paquete cambió. Actualiza el detalle antes de guardar.'};
  const data=parsed.data;
  const person=data.recipientId?recipients.find(r=>r.id===data.recipientId&&r.userId===box.userId):undefined;
  if(data.recipientId&&!person)return {ok:false as const,error:'El destinatario debe pertenecer al cliente de este paquete.'};
  if(data.newAddress&&data.addressId)return {ok:false as const,error:'Selecciona una dirección guardada o captura una nueva, no ambas.'};
  const selected=data.addressId?addresses.find(a=>a.id===data.addressId&&a.userId===box.userId):undefined;
  if(data.addressId&&!selected)return {ok:false as const,error:'La dirección debe pertenecer al cliente de este paquete.'};
  const address=data.newAddress?{...data.newAddress,id:'',userId:box.userId}:selected;
  if(!address||!formatDeliveryAddress(address))return {ok:false as const,error:'Selecciona una dirección o escribe una referencia para esta entrega.'};
  const before={recipientId:box.recipientId,recipientSnapshot:structuredClone(box.recipientSnapshot)},at=new Date().toISOString();
  box.recipientId=person?.id;
  box.recipientSnapshot={name:data.name,phone:data.phone,address:{...address}};
  box.timeline.push({from:box.status,to:box.status,actor:actor.id,at,note:`Entrega actualizada para esta pieza: ${data.reason}. Recibe ${box.recipientSnapshot.name}. Dirección / referencia: ${formatDeliveryAddress(address)}. Reimprimir etiqueta. Cliente, cobros y ruta sin cambios.`});
  deliveryEdits.push({id:crypto.randomUUID(),boxId:box.id,actorId:actor.id,at,reason:data.reason,before,after:structuredClone({recipientId:box.recipientId,recipientSnapshot:box.recipientSnapshot})});
  return {ok:true as const};
 });
}
