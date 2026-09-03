import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TruckDetailManager } from "@/components/admin/truck-detail-manager";
import { SectionTitle } from "@/components/cliente/section-title";
import { logisticsService } from "@/lib/services/logistics";

export default async function TruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [truck, boxes, users, drivers, shipments] = await Promise.all([
    logisticsService.getTruckById(id),
    logisticsService.getBoxes(),
    logisticsService.getUsers(),
    logisticsService.getDrivers(),
    logisticsService.getShipments(),
  ]);
  if (!truck) notFound();
  return <><Link href="/admin/camiones" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-navy-500 hover:text-orange-600"><ArrowLeft className="size-4" />Volver a camiones</Link><SectionTitle eyebrow="Guía máster" title={truck.code} description={`${truck.route}. Consulta capacidad, cajas e historial antes de ejecutar la siguiente acción.`} /><div className="mt-7"><TruckDetailManager initialTruck={truck} initialAssigned={boxes.filter((box) => truck.boxIds.includes(box.id))} initialAvailable={boxes.filter((box) => box.status === "en-bodega" && !box.truckId)} users={users} drivers={drivers} shipments={shipments} /></div></>;
}
