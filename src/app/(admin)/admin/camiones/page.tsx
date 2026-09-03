import { SectionTitle } from "@/components/cliente/section-title";
import { TruckManager } from "@/components/admin/truck-manager";
import { logisticsService } from "@/lib/services/logistics";
export default async function TrucksPage() { const trucks = await logisticsService.getTrucks(); return <><SectionTitle eyebrow="Guías máster" title="Camiones" description="Crea salidas, revisa capacidad, descarga el manifiesto y avanza el estado en cascada." /><div className="mt-7"><TruckManager initial={trucks} /></div></>; }
