import { SectionTitle } from "@/components/cliente/section-title";
import { ShipmentCreator } from "@/components/cliente/shipment-creator";
import { requireClientUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";

export default async function NewShipmentPage() {
  const [user, boxes, recipients, flow, rates, addresses] = await Promise.all([requireClientUser(), logisticsService.getBoxes(), logisticsService.getRecipients(), configService.getFlowConfig(), configService.getCatalog(), logisticsService.getAddresses()]);
  const available = boxes.filter((box) => box.userId === user.id && !box.shipmentId && !box.truckId && ["en-bodega", "excede-categoria"].includes(box.status));
  return <><SectionTitle eyebrow="Solicitud de envío" title="Crear un envío" description="Elige cajas disponibles, destinatario y forma de entrega antes de confirmar." /><div className="mt-7"><ShipmentCreator addresses={addresses} boxes={available} recipients={recipients.filter((item) => item.userId === user.id)} excessPolicy={flow.excessPolicy} deliveryMode={flow.deliveryMode} rates={rates} /></div></>;
}
