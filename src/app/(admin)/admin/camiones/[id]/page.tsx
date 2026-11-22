import { requireAdminUser } from "@/lib/auth/actions";
import { TruckRoute } from "@/components/admin/truck-route";
import { getOperationalLocations } from "@/lib/auth/warehouse-actions";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/admin/admin-access";
import { TruckDetailManager } from "@/components/admin/truck-detail-manager";
import { SectionTitle } from "@/components/cliente/section-title";
import { logisticsService } from "@/lib/services/logistics";
import { billOfLadingService } from "@/lib/services/bill-of-lading";
import { trucksManager } from "@/lib/i18n/catalogs/trucks-manager";
import { getLocale, getT } from "@/lib/i18n/server";
import { localizeTruckRoute } from "@/lib/utils/reception-display";

export default async function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) { await requireAdminUser(["camiones"]);
  const { id } = await params;
  const [truck, boxes, users, drivers, shipments, bills] = await Promise.all([
    logisticsService.getTruckById(id),
    logisticsService.getBoxes(),
    logisticsService.getUsers(),
    logisticsService.getDrivers(),
    logisticsService.getShipments(),
    billOfLadingService.list(),
  ]);
  if (!truck) notFound();
  const {warehouses}=await getOperationalLocations();
  const t = await getT(trucksManager);
  return <><Link href="/admin/camiones" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-orange-600"><ArrowLeft className="size-4" />{t("Volver a camiones")}</Link><SectionTitle eyebrow={t("Guía máster")} title={truck.code} description={t("{route}. Consulta capacidad, cajas e historial antes de ejecutar la siguiente acción.", { route: localizeTruckRoute(truck.route, await getLocale()) })} /><div className="mt-7"><TruckRoute boxes={boxes} truck={truck} warehouses={warehouses}/><TruckDetailManager key={JSON.stringify(truck)} initialTruck={truck} initialAssigned={boxes.filter((box) => truck.boxIds.includes(box.id))} initialAvailable={boxes.filter((box) => box.status === "en-bodega" && !box.truckId)} users={users} drivers={drivers} shipments={shipments} billOfLading={bills.find((bill) => bill.truckId === truck.id)} /></div></>;
}
