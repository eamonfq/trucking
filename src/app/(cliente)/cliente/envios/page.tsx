import Link from "next/link";
import { Plus } from "lucide-react";
import { SectionTitle } from "@/components/cliente/section-title";
import { ShipmentList } from "@/components/cliente/shipment-list";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";

export default async function ShipmentsPage() {
  const [user, allShipments] = await Promise.all([requireClientUser(), logisticsService.getShipments()]);
  return <><SectionTitle eyebrow="Despachos" title="Mis envíos" description="Consulta cajas agrupadas, destino y avance de cada envío." action={<Link href="/cliente/envios/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white"><Plus className="size-4" />Crear envío</Link>} /><div className="mt-7"><ShipmentList shipments={allShipments.filter((item) => item.userId === user.id)} /></div></>;
}
