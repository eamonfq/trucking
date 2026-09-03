import { SectionTitle } from "@/components/cliente/section-title";
import { TruckManager } from "@/components/admin/truck-manager";
import { logisticsService } from "@/lib/services/logistics";
export default async function TrucksPage() { const [trucks, drivers] = await Promise.all([logisticsService.getTrucks(), logisticsService.getDrivers()]); return <><SectionTitle eyebrow="Guías máster" title="Camiones" description="Planifica salidas, controla capacidad y coordina cada etapa del recorrido a México." /><div className="mt-7"><TruckManager initial={trucks} initialDrivers={drivers} /></div></>; }
