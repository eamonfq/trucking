import { requireAdminUser } from "@/lib/auth/actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { DeliveryDesk } from "@/components/admin/delivery-desk";
import { logisticsService } from "@/lib/services/logistics";
import { invoiceTotal } from "@/lib/utils/invoices";
import { formatUsd } from "@/lib/utils/format";
import { trucksDelivery } from "@/lib/i18n/catalogs/trucks-delivery";
import { truckMessages } from "@/lib/i18n/messages/trucks";
import { getMessageTranslator, getT } from "@/lib/i18n/server";

export default async function DeliveriesPage() { await requireAdminUser(["entregas"]);
  const [boxes,shipments,trucks,users,recipients,invoices,clearance]=await Promise.all([logisticsService.getBoxes(),logisticsService.getShipments(),logisticsService.getTrucks(),logisticsService.getUsers(),logisticsService.getRecipients(),logisticsService.getInvoices(),logisticsService.getDeliveryClearance()]);
  const [t,tm]=await Promise.all([getT(trucksDelivery),getMessageTranslator(truckMessages)]);
  const rows=boxes.filter(box=>["en-destino","entregada"].includes(box.status)).map(box=>{const user=users.find(item=>item.id===box.userId);const shipment=shipments.find(item=>item.id===box.shipmentId);const recipient=shipment?.recipientSnapshot??recipients.find(item=>item.id===shipment?.recipientId);const linked=invoices.filter(invoice=>invoice.boxIds?.length ? invoice.boxIds.includes(box.id) : Boolean(box.shipmentId&&invoice.shipmentId===box.shipmentId));const outstanding=linked.filter(invoice=>invoice.status!=="pagada"&&invoice.status!=="borrador").reduce((sum,invoice)=>sum+invoiceTotal(invoice),0);const blocked=clearance.find(c=>c.id===box.id)?.blocked;return {blocked:blocked?tm(blocked):null,id:box.id,code:box.code,status:box.status,deliveryReceipt:box.deliveryReceipt,customer:user?`${user.firstName} ${user.paternalLastName} · ${user.lockerCode}`:t("Sin cliente"),recipient:recipient?.name??t("Sin destinatario asociado"),shipment:shipment?.code??t("Sin envío"),truck:trucks.find(item=>item.id===box.truckId)?.code??t("Sin camión"),balance:!linked.length?(clearance.find(c=>c.id===box.id)?.blocked?t("Pendiente de autorización de entrega"):t("Autorizado para entrega")):outstanding?t("{amount} pendiente en facturas vinculadas",{amount:formatUsd(outstanding)}):t("Sin saldo pendiente")};});
  return <><SectionTitle eyebrow={t("Última milla")} title={t("Entregas")} description={t("Confirma quién recibe cada caja y mantén al cliente informado hasta el último paso.")} /><DeliveryDesk rows={rows} /></>;
}
