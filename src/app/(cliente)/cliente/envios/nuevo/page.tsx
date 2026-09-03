import { SectionTitle } from "@/components/cliente/section-title";
import { ShipmentCreator } from "@/components/cliente/shipment-creator";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";

export default async function NewShipmentPage() { const [boxes, recipients, flow, rates] = await Promise.all([logisticsService.getBoxes(), logisticsService.getRecipients(), configService.getFlowConfig(), configService.getRateTable()]); return <><SectionTitle eyebrow="Despachar" title="Crear un envío" description="Elige las cajas disponibles, un destinatario y revisa el desglose antes de confirmar." /><div className="mt-7"><ShipmentCreator boxes={boxes.filter((box) => box.userId === "usr-001" && ["en-bodega", "excede-categoria"].includes(box.status))} recipients={recipients.filter((item) => item.userId === "usr-001")} excessPolicy={flow.excessPolicy} rates={rates} /></div></>; }
