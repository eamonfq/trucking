import { SectionTitle } from "@/components/cliente/section-title";
import { WarehouseBoard } from "@/components/admin/warehouse-board";
import { logisticsService } from "@/lib/services/logistics";
export default async function WarehousePage() { const [boxes, trucks] = await Promise.all([logisticsService.getBoxes(), logisticsService.getTrucks()]); return <><SectionTitle eyebrow="Inventario operativo" title="Bodega" description="Selecciona cajas disponibles y cárgalas en un camión de forma masiva." /><div className="mt-7"><WarehouseBoard initialBoxes={boxes.filter((box) => ["recibida", "categorizada", "en-bodega", "excede-categoria"].includes(box.status))} trucks={trucks.filter((truck) => ["planificado", "cargando"].includes(truck.status))} /></div></>; }
