import { deliveryPaymentError } from "@/lib/utils/delivery-payment";
import { SectionTitle } from "@/components/cliente/section-title";
import { DeliveryDesk } from "@/components/admin/delivery-desk";
import { logisticsService } from "@/lib/services/logistics";
import { invoiceTotal } from "@/lib/utils/invoices";
import { formatUsd } from "@/lib/utils/format";

export default async function DeliveriesPage() {
  const [boxes,shipments,trucks,users,recipients,invoices]=await Promise.all([logisticsService.getBoxes(),logisticsService.getShipments(),logisticsService.getTrucks(),logisticsService.getUsers(),logisticsService.getRecipients(),logisticsService.getInvoices()]);
  const rows=boxes.filter(box=>["en-destino","entregada"].includes(box.status)).map(box=>{const user=users.find(item=>item.id===box.userId);const shipment=shipments.find(item=>item.id===box.shipmentId);const recipient=shipment?.recipientSnapshot??recipients.find(item=>item.id===shipment?.recipientId);const linked=invoices.filter(invoice=>invoice.boxIds?.length ? invoice.boxIds.includes(box.id) : Boolean(box.shipmentId&&invoice.shipmentId===box.shipmentId));const outstanding=linked.filter(invoice=>invoice.status!=="pagada"&&invoice.status!=="borrador").reduce((sum,invoice)=>sum+invoiceTotal(invoice),0);return {blocked:deliveryPaymentError(box,invoices,boxes),id:box.id,code:box.code,status:box.status,deliveryReceipt:box.deliveryReceipt,customer:user?`${user.firstName} ${user.paternalLastName} · ${user.lockerCode}`:"Sin cliente",recipient:recipient?.name??"Sin destinatario asociado",shipment:shipment?.code??"Sin envío",truck:trucks.find(item=>item.id===box.truckId)?.code??"Sin camión",balance:!linked.length?"Sin factura vinculada":outstanding?`${formatUsd(outstanding)} pendiente en facturas vinculadas`:"Sin saldo pendiente"};});
  return <><SectionTitle eyebrow="Última milla" title="Entregas" description="Confirma quién recibe cada caja y mantén al cliente informado hasta el último paso." /><DeliveryDesk rows={rows} /></>;
}
