import { SectionTitle } from "@/components/cliente/section-title";
import { ShipmentCreator } from "@/components/cliente/shipment-creator";
import { requireClientUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function NewShipmentPage() {
  const [user, boxes, recipients, flow, rates, addresses] = await Promise.all([requireClientUser(), logisticsService.getBoxes(), logisticsService.getRecipients(), configService.getFlowConfig(), configService.getCatalog(), logisticsService.getAddresses()]);
  const t = await getT(clientPages);
  const available = boxes.filter((box) => box.userId === user.id && !box.shipmentId && !box.truckId && ["en-bodega", "excede-categoria"].includes(box.status));
  return <><SectionTitle eyebrow={t("Solicitud de envío")} title={t("Crear un envío")} description={t("Elige cajas disponibles, destinatario y forma de entrega antes de confirmar.")} /><div className="mt-7"><ShipmentCreator addresses={addresses} boxes={available} recipients={recipients.filter((item) => item.userId === user.id)} excessPolicy={flow.excessPolicy} deliveryMode={flow.deliveryMode} rates={rates} /></div></>;
}
