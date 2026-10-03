"use server";
import {z} from 'zod';
import {runMutation} from '@/lib/db/mutation';
import {requireAdminUser} from './actions';
import {boxes,trucks} from '@/lib/db/collections';
import {truckLoad} from '@/lib/utils/truck-load';

// Physical measurement only. Never reprices an agreed quote or touches invoices/payments.
export async function registerPendingCargoWeight(boxId:string,input:unknown){
 return runMutation('admin:recepcion|bodega|camiones',async()=>{
  const actor=await requireAdminUser(['recepcion','bodega','camiones']);
  const parsed=z.number().finite().positive().max(1000000).multipleOf(0.001).safeParse(input);
  if(!parsed.success)return {ok:false as const,error:'Escribe un peso real válido (hasta tres decimales).'};
  const box=boxes.find(b=>b.id===boxId);
  if(!box?.weightUnknown||box.billing?.mode!=='manual'||box.billing?.groupWeight||!['en-bodega','cargada-en-camion'].includes(box.status))return {ok:false as const,error:'Solo se completa un peso pendiente de carga cotizada antes de salir de origen. Actualiza el detalle.'};
  const truck=trucks.find(t=>t.id===box.truckId);
  if(truck&&!['planificado','cargando'].includes(truck.status))return {ok:false as const,error:'El camión ya salió; no se modifica su peso histórico.'};
  if(truck?.maxWeightLb!==undefined&&truckLoad(boxes.filter(b=>truck.boxIds.includes(b.id)).map(b=>b.id===box.id?{...b,weightUnknown:false,weightLb:parsed.data}:b)).weightLb>truck.maxWeightLb)return {ok:false as const,error:'El peso registrado superaría la capacidad del camión.'};
  box.weightLb=parsed.data;box.weightUnknown=false;
  if(box.billing)box.billing.actualWeightLb=parsed.data;
  if(box.receptionConcept){
   const siblings=boxes.filter(b=>b.receptionGroup?.id===box.receptionGroup?.id&&b.receptionConcept?.id===box.receptionConcept?.id);
   const totalWeightLb=Math.round(siblings.reduce((n,b)=>n+b.weightLb,0)*1000)/1000,weightUnknown=siblings.some(b=>b.weightUnknown);
   for(const sibling of siblings)sibling.receptionConcept={...sibling.receptionConcept!,totalWeightLb,weightUnknown};
  }
  box.timeline.push({from:box.status,to:box.status,actor:actor.id,at:new Date().toISOString(),note:`Peso pendiente completado: ${parsed.data} lb. Cotización, facturas y pagos sin cambios. Reimprimir etiqueta.`});
  return {ok:true as const};
 });
}
