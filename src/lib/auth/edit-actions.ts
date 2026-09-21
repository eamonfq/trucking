"use server";

import { calculateBilling } from "@/lib/utils/billing";
import { CUSTOM_CARGO_ID } from "@/lib/config/custom-cargo";
import { recordRevision } from "@/lib/db/revision";
import { z } from "zod";
import { getSession } from "./actions";
import { audit } from "./repository";
import { runMutation } from "@/lib/db/mutation";
import { collection } from "@/lib/db/store";
import { boxes, shipments, invoices, trucks, drivers, recipients, addresses, supportTickets, users, notifications } from "@/lib/db/collections";
import { configService } from "@/lib/services/config";
import { categoryIdSchema } from "@/lib/config/category-schema";
import { suggestCategory } from "@/lib/utils/suggest-category";
import { invoiceTotal } from "@/lib/utils/invoices";
import { sendEmail, siteUrl } from "@/lib/services/email";

const money = z.coerce.number().min(0).max(100000).multipleOf(0.01);
const inputSchema = z.object({
  kind: z.enum(["box", "shipment", "invoice", "truck", "driver", "support", "payment"]),
  id: z.string().min(1), expected: z.string().length(64), reason: z.string().trim().min(5).max(1000),
  values: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});
const edits = collection<{id:string; kind:string; entityId:string; actorId:string; at:string; reason:string; before:unknown; after:unknown}>("operationalEdits");

export async function editOperation(input: unknown) {
  const session = await getSession();
  if (session?.role==="operador") return {ok:false as const,error:"Tu rol solo permite recepción y consulta de paquetes."};
  if (!session) return { ok:false as const, error:"Inicia sesión para editar." };
  return runMutation(session.role, async () => {
    const parsed = inputSchema.safeParse(input);
    if (!parsed.success) return {ok:false as const,error:"Revisa los campos y explica el motivo (5 a 1000 caracteres)."};
    const {kind,id,expected,reason,values} = parsed.data;
    const entity = kind === "box" ? boxes.find(x=>x.id===id) : kind === "shipment" ? shipments.find(x=>x.id===id) : (kind === "invoice" || kind === "payment") ? invoices.find(x=>x.id===id) : kind === "truck" ? trucks.find(x=>x.id===id) : kind === "driver" ? drivers.find(x=>x.id===id) : supportTickets.find(x=>x.id===id);
    if (!entity || (session.role !== "admin" && (!("userId" in entity) || entity.userId !== session.userId || !["box","shipment","payment"].includes(kind)))) return {ok:false as const,error:"No puedes editar este registro."};
    if (recordRevision(entity) !== expected) return {ok:false as const,error:"El registro cambió. Actualiza la página antes de editar."};
    const before = JSON.parse(JSON.stringify(entity));
    const at = new Date().toISOString();
    const actor = users.find(x=>x.id===session.userId)!;
    const actorName = `${actor.firstName} ${actor.paternalLastName}`;
    try {
      if (Object.keys(values).length) {
        if (kind === "box") {
          const box = boxes.find(x=>x.id===id)!;
          if (box.truckId || box.shipmentId || invoices.some(x=>x.boxIds?.includes(id)) || !["pre-alertada","en-bodega"].includes(box.status) || (session.role === "cliente" && box.status !== "pre-alertada")) throw new Error("Las medidas/categoría solo se corrigen antes de vincular o facturar la caja. Puedes agregar una aclaración sin alterar el historial.");
          const data = z.object({originTracking:z.string().trim().max(120),categoryId:categoryIdSchema,length:z.coerce.number().min(0).max(1000),width:z.coerce.number().min(0).max(1000),height:z.coerce.number().min(0).max(1000),weightLb:z.coerce.number().min(0).max(100000)}).strict().parse(values);
          if (data.originTracking && boxes.some(x=>x.id!==id && x.originTracking?.toLowerCase()===data.originTracking.toLowerCase())) throw new Error("Ese tracking ya está registrado.");
          const rates = await configService.getRateTable();
          if(!(data.categoryId===CUSTOM_CARGO_ID && box.categoryId===CUSTOM_CARGO_ID && box.status!=="pre-alertada") && !rates.some(rate=>rate.id===data.categoryId)) throw new Error("Selecciona una categoría activa.");
          const dimensions = {length:data.length,width:data.width,height:data.height};
          if(!["peso-real","manual"].includes(box.billing?.mode??"") && !Object.values(dimensions).every(n=>n>0)) throw new Error("Completa las tres medidas.");
          if (box.status !== "pre-alertada" && !["peso-real","volumen","manual"].includes(box.billing?.mode??"") && data.categoryId!==CUSTOM_CARGO_ID && (data.weightLb<=0 || !suggestCategory(dimensions,data.weightLb,rates.filter(x=>x.id===data.categoryId)).category)) throw new Error("La categoría no admite las medidas/peso indicados.");
          if(box.billing){
            const billing=calculateBilling(box.billing.mode,dimensions,data.weightLb,box.billing,box.billing.mode==="manual"?box.billing.amountUsd:rates.find(rate=>rate.id===data.categoryId)?.priceUsd);
            box.billing=billing;box.customPriceUsd=billing.amountUsd;
          }
          Object.assign(box,{originTracking:data.originTracking || undefined,categoryId:data.categoryId,categoryName:rates.find(rate=>rate.id===data.categoryId)?.name??box.categoryName,dimensions,weightLb:data.weightLb});
        } else if (kind === "shipment") {
          const shipment = shipments.find(x=>x.id===id)!;
          const shipmentBoxes=boxes.filter(b=>shipment.boxIds.includes(b.id));
          if(session.role!=="admin"&&shipmentBoxes.some(b=>b.recipientSnapshot))throw new Error("La entrega fue registrada en recepción. Solicita a operaciones corregir el destinatario o la dirección de estas piezas.");
          if (shipment.truckId || !["pendiente","confirmado"].includes(shipment.status) || boxes.some(x=>shipment.boxIds.includes(x.id) && x.truckId)) throw new Error("Retira la asignación al camión antes de cambiar la entrega. Después del despacho solo se permiten aclaraciones.");
          const data=z.object({recipientId:z.string().min(1),deliveryMethod:z.enum(["sucursal","domicilio"])}).strict().parse(values);
          const recipient=recipients.find(x=>x.id===data.recipientId && x.userId===shipment.userId);
          const address=recipient && addresses.find(x=>x.id===recipient.addressId && x.userId===shipment.userId);
          if (!recipient || !address) throw new Error("El destinatario debe pertenecer al cliente y tener dirección vigente.");
          const flow=await configService.getFlowConfig();
          if (flow.deliveryMode!=="ambas" && flow.deliveryMode!==data.deliveryMethod) throw new Error("Ese método de entrega está deshabilitado.");
          Object.assign(shipment,{...data,destinationCity:address.municipality,recipientSnapshot:{name:recipient.name,phone:recipient.phone,address:{...address}}});
          for(const box of shipmentBoxes){
            const previous=JSON.parse(JSON.stringify(box));
            box.recipientId=recipient.id;
            box.recipientSnapshot={name:recipient.name,phone:recipient.phone,address:{...address}};
            box.timeline.push({from:box.status,to:box.status,actor:actorName,at,note:`Entrega corregida junto con ${shipment.code}: ${reason}. Reimprimir etiqueta.`});
            edits.unshift({id:crypto.randomUUID(),kind:"box",entityId:box.id,actorId:session.userId,at,reason,before:previous,after:JSON.parse(JSON.stringify(box))});
          }
        } else if (kind === "payment") {
          const invoice=invoices.find(x=>x.id===id)!;
          if(invoice.status!=="pago-reportado" || !invoice.paymentReport) throw new Error("Solo se corrige un reporte pendiente de revisión.");
          const data=z.object({method:z.string().trim().min(2).max(80),reference:z.string().trim().min(3).max(160)}).strict().parse(values);
          const payment=invoice.payments?.findLast(p=>p.status==="pendiente");if(payment){payment.method=data.method;payment.externalReference=data.reference||undefined;}
          invoice.paymentReport={...invoice.paymentReport,...data,reportedAt:new Date(Math.max(Date.now(),Date.parse(invoice.paymentReport.reportedAt)+1)).toISOString()};
          invoice.paymentReviewNote=undefined;
        } else if (kind === "invoice") {
          const invoice=invoices.find(x=>x.id===id)!;
          if (["pagada","pago-reportado"].includes(invoice.status)) throw new Error("No se alteran importes durante revisión ni después del pago. Agrega una aclaración o rechaza primero el reporte pendiente.");
          const shape: Record<string,z.ZodType>={dueAt:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),insuranceUsd:money,homeDeliveryUsd:money,excessFeeUsd:money};
          invoice.lines.forEach((_,i)=>{shape[`price${i}`]=money;});
          const data=z.object(shape).strict().parse(values);
          const dueAt=`${data.dueAt}T23:59:59.000Z`;
          if (!Number.isFinite(Date.parse(dueAt)) || dueAt.slice(0,10)!==new Date(dueAt).toISOString().slice(0,10) || Date.parse(dueAt)<Date.parse(invoice.issuedAt)) throw new Error("El vencimiento debe ser válido y posterior a la emisión.");
          invoice.lines=invoice.lines.map((line,i)=>({...line,unitPriceUsd:data[`price${i}`] as number}));
          Object.assign(invoice,{dueAt,insuranceUsd:data.insuranceUsd,homeDeliveryUsd:data.homeDeliveryUsd,excessFeeUsd:data.excessFeeUsd});
          if(invoiceTotal(invoice)<=0) throw new Error("El total debe ser positivo para admitir reportes de pago.");
        } else if (kind === "truck") {
          const truck=trucks.find(x=>x.id===id)!;
          if (!["planificado","cargando"].includes(truck.status)) throw new Error("Después del despacho se conservan los datos de la salida; agrega una aclaración.");
          const data=z.object({plate:z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,4}-[A-Z0-9]{2,4}$/),driverId:z.string().min(1),notes:z.string().trim().max(500)}).strict().parse(values);
          const driver=drivers.find(x=>x.id===data.driverId && x.active);
          if (!driver) throw new Error("Selecciona un chofer activo.");
          Object.assign(truck,{...data,driverName:driver.name});
        } else if (kind === "driver") {
          const driver=drivers.find(x=>x.id===id)!;
          const data=z.object({name:z.string().trim().min(3).max(160),phone:z.string().regex(/^\+?\d{10,15}$/),license:z.string().trim().min(5).max(80),active:z.boolean()}).strict().parse(values);
          if (!data.active && trucks.some(x=>x.driverId===id && x.status!=="cerrado")) throw new Error("Reasigna o cierra sus camiones antes de desactivar al chofer.");
          Object.assign(driver,data);
          trucks.filter(x=>x.driverId===id && ["planificado","cargando"].includes(x.status)).forEach(x=>{x.driverName=data.name;});
        } else {
          const ticket=supportTickets.find(x=>x.id===id)!;
          const data=z.object({subject:z.string().trim().min(5).max(160)}).strict().parse(values);
          ticket.subject=data.subject; ticket.updatedAt=at;
        }
      }
    } catch (error) { return {ok:false as const,error:error instanceof z.ZodError ? "Revisa el formato y los límites de los campos." : error instanceof Error ? error.message : "No se pudo editar."}; }
    if ("timeline" in entity) entity.timeline.push({from:entity.status,to:entity.status,actor:actorName,at,note:`Corrección: ${reason}`});
    if (kind === "support") { const ticket=supportTickets.find(x=>x.id===id)!; ticket.updatedAt=at; ticket.messages.push({id:crypto.randomUUID(),author:"soporte",authorName:actorName,at,body:`Aclaración administrativa: ${reason}`}); }
    edits.unshift({id:crypto.randomUUID(),kind,entityId:id,actorId:session.userId,at,reason,before,after:JSON.parse(JSON.stringify(entity))});
    await audit(session.userId,`${kind}.corrected`);
    if ("userId" in entity) {
      const user=users.find(x=>x.id===entity.userId);
      const body=`Se actualizó ${"code" in entity ? entity.code : "number" in entity ? entity.number : "tu registro"}. Motivo: ${reason}`;
      notifications.unshift({id:crypto.randomUUID(),userId:entity.userId,title:"Registro actualizado",body,createdAt:at,read:false});
      if (user) await sendEmail({to:user.email,subject:"Registro actualizado · A&L",heading:"Una actualización en tu operación",body,actionLabel:"Revisar mi panel",actionUrl:`${siteUrl()}/cliente`});
    }
    return {ok:true as const};
  });
}
