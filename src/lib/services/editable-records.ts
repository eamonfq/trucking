import "server-only";
import { CUSTOM_CAPACITY_CATEGORY } from "@/lib/config/custom-cargo";
import { recordRevision } from "@/lib/db/revision";
import type { Box, Shipment, Invoice, Truck, Driver, SupportTicket, Recipient } from "@/lib/types";
import type { EditableRecord, EditField } from "@/lib/types/editing";
import type { BoxCategory } from "@/lib/config/box-categories";

export function editableRecords(data:{boxes:Box[];shipments:Shipment[];invoices:Invoice[];trucks:Truck[];drivers:Driver[];support:SupportTicket[];recipients:Recipient[];categories?:BoxCategory[]}, client=false):EditableRecord[] {
  const field=(key:string,label:string,value:string|number|boolean,type:EditField["type"]="text",options?:EditField["options"]):EditField=>({key,label,value,type,options});
  const record=(kind:EditableRecord["kind"],entity:{id:string},label:string,fields:EditField[],locked=false):EditableRecord=>({kind,id:entity.id,label,expected:recordRevision(entity),fields:locked?[]:fields,locked});
  return [
    ...data.boxes.map(box=>record("box",box,`${box.code} · ${box.status}`,[field("originTracking","Tracking de origen",box.originTracking??""),field("categoryId","Categoría",box.categoryId,"select",[...(data.categories??[]),...(box.categoryId===CUSTOM_CAPACITY_CATEGORY.id?[CUSTOM_CAPACITY_CATEGORY]:[])].filter(rate=>rate.active!==false).map(rate=>({value:rate.id,label:rate.name}))),...Object.entries(box.dimensions).map(([key,value])=>field(key,({length:"Largo (in)",width:"Ancho (in)",height:"Alto (in)"} as Record<string,string>)[key],value,"number")),field("weightLb","Peso (lb)",box.weightLb,"number")],Boolean(box.truckId||box.shipmentId||data.invoices.some(x=>x.boxIds?.includes(box.id))||!["pre-alertada","en-bodega"].includes(box.status)||(client&&box.status!=="pre-alertada")))),
    ...data.shipments.map(shipment=>record("shipment",shipment,`${shipment.code} · ${shipment.status}`,[field("recipientId","Destinatario",shipment.recipientId,"select",data.recipients.filter(x=>x.userId===shipment.userId).map(x=>({value:x.id,label:x.name}))),field("deliveryMethod","Entrega",shipment.deliveryMethod??"sucursal","select",[{value:"sucursal",label:"Sucursal"},{value:"domicilio",label:"Domicilio"}])],Boolean(shipment.truckId||!["pendiente","confirmado"].includes(shipment.status)))),
    ...data.invoices.filter(invoice=>invoice.paymentReport).map(invoice=>record("payment",invoice,`${invoice.number} · reporte ${invoice.status}`,[field("method","Método de pago",invoice.paymentReport!.method),field("reference","Referencia de pago",invoice.paymentReport!.reference)],invoice.status!=="pago-reportado")),
    ...(!client?[
      ...data.invoices.map(invoice=>record("invoice",invoice,`${invoice.number} · ${invoice.status}`,[field("dueAt","Vencimiento",invoice.dueAt.slice(0,10),"date"),...invoice.lines.map((line,i)=>field(`price${i}`,`${line.categoryId} · precio por unidad (USD)`,line.unitPriceUsd,"number")),field("insuranceUsd","Seguro acordado (USD)",invoice.insuranceUsd,"number"),field("homeDeliveryUsd","Entrega acordada (USD)",invoice.homeDeliveryUsd,"number"),field("excessFeeUsd","Recargos (USD)",invoice.excessFeeUsd??0,"number")],["pagada","pago-reportado"].includes(invoice.status))),
      ...data.trucks.map(truck=>record("truck",truck,`${truck.code} · ${truck.status}`,[field("plate","Placa",truck.plate),field("driverId","Chofer",truck.driverId,"select",data.drivers.filter(x=>x.active).map(x=>({value:x.id,label:x.name}))),field("notes","Notas operativas",truck.notes??"")],!["planificado","cargando"].includes(truck.status))),
      ...data.drivers.map(driver=>record("driver",driver,driver.name,[field("name","Nombre",driver.name),field("phone","Teléfono",driver.phone),field("license","Licencia",driver.license),field("active","Chofer activo",driver.active,"checkbox")])),
      ...data.support.map(ticket=>record("support",ticket,`${ticket.code} · ${ticket.subject}`,[field("subject","Asunto",ticket.subject)])),
    ]:[]),
  ];
}
