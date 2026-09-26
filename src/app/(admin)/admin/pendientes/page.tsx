import {canAdminPath} from "@/lib/auth/admin-permissions";
import { requireAdminUser } from "@/lib/auth/actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { AttentionBoard, type AttentionItem } from "@/components/admin/attention-board";
import { logisticsService } from "@/lib/services/logistics";
import { isInvoiceOverdue, invoiceTotal } from "@/lib/utils/invoices";
import { formatUsd } from "@/lib/utils/format";

export default async function AttentionPage() { const actor=await requireAdminUser(["pendientes"]);
  const [boxes,shipments,invoices,tickets,users]=await Promise.all([logisticsService.getBoxes(),logisticsService.getShipments(),logisticsService.getInvoices(),logisticsService.getSupportTickets(),logisticsService.getUsers()]);
  const customer=(id:string)=>{const user=users.find(item=>item.id===id);return user?`${user.firstName} ${user.paternalLastName} · ${user.lockerCode}`:"Cliente no disponible";};
  const items:AttentionItem[]=[];
  for(const box of boxes) {
    if(box.status==="pre-alertada")items.push({id:box.id,kind:"Recepción",title:box.code,detail:`Pendiente de recepción física · ${box.originTracking??"Sin tracking"}`,customer:customer(box.userId),at:box.timeline[0]?.at??new Date().toISOString(),href:`/admin/recepcion?customer=${encodeURIComponent(box.userId)}&prealert=${encodeURIComponent(box.id)}`,priority:false});
    if(box.status==="en-destino")items.push({id:box.id,kind:"Entregas",title:box.code,detail:"En destino, pendiente de registrar quién recibe",customer:customer(box.userId),at:box.timeline.at(-1)?.at??new Date().toISOString(),href:"/admin/entregas",priority:false});
  }
  for(const shipment of shipments.filter(item=>item.status==="confirmado")) {const loaded=boxes.filter(box=>shipment.boxIds.includes(box.id)&&box.truckId===shipment.truckId&&box.truckId).length;items.push({id:shipment.id,kind:"Carga",title:shipment.code,detail:`${loaded} de ${shipment.boxIds.length} cajas asignadas · ${shipment.destinationCity}`,customer:customer(shipment.userId),at:shipment.timeline[0]?.at??new Date().toISOString(),href:shipment.truckId?`/admin/camiones/${shipment.truckId}`:"/admin/bodega",priority:loaded>0&&loaded<shipment.boxIds.length});}
  for(const invoice of invoices) if((invoice.cloverPaymentId&&invoice.status!=="pagada")||invoice.status==="pendiente-pago-destino"||invoice.status==="pago-reportado"||isInvoiceOverdue(invoice))items.push({id:invoice.id,kind:"Pagos",title:invoice.number,detail:`${invoice.cloverPaymentId&&invoice.status!=="pagada"?"Clover: conciliar cargo antes de volver a cobrar":invoice.status==="pendiente-pago-destino"?"Pendiente de pago en destino":invoice.status==="pago-reportado"?"Reporte pendiente de validación":"Factura vencida"} · ${formatUsd(invoiceTotal(invoice))}`,customer:customer(invoice.userId),at:invoice.paymentReport?.reportedAt??invoice.dueAt,href:`/admin/facturas?invoice=${encodeURIComponent(invoice.id)}`,priority:true});
  for(const ticket of tickets.filter(item=>item.status!=="cerrado"))items.push({id:ticket.id,kind:"Soporte",title:`${ticket.code} · ${ticket.subject}`,detail:ticket.messages.at(-1)?.author==="cliente"?"El cliente espera una respuesta":"En seguimiento con soporte",customer:customer(ticket.userId),at:ticket.updatedAt,href:`/admin/soporte?ticket=${encodeURIComponent(ticket.id)}`,priority:ticket.messages.at(-1)?.author==="cliente"});
  items.sort((a,b)=>Number(b.priority)-Number(a.priority)||a.at.localeCompare(b.at));
  return <><SectionTitle eyebrow="Mesa operativa" title="Pendientes" description="Prioridades reales del sistema, ordenadas por atención y antigüedad. Cada pendiente te lleva a la herramienta para resolverlo." /><AttentionBoard items={items.filter(item=>canAdminPath(actor,item.href))} /></>;
}
