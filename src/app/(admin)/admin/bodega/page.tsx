import { requireAdminUser } from "@/lib/auth/actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { WarehouseBoard } from "@/components/admin/warehouse-board";
import { logisticsService } from "@/lib/services/logistics";
import { canAdmin } from "@/lib/auth/admin-permissions";
import { getOperationalLocations } from "@/lib/auth/warehouse-actions";

export default async function WarehousePage() {
  const actor = await requireAdminUser(["bodega"]);
  const [boxes, trucks, users, { warehouses }] = await Promise.all([
    logisticsService.getBoxes(), logisticsService.getTrucks(), logisticsService.getUsers(),
    canAdmin(actor, "camiones") ? getOperationalLocations() : Promise.resolve({ warehouses: [] }),
  ]);
  return <><SectionTitle eyebrow="Inventario operativo" title="Bodega" description="Consulta el inventario y carga paquetes al camión desde aquí, verificando su origen, destino y capacidad." /><div className="mt-7"><WarehouseBoard
    initialBoxes={boxes.filter((box) => ["recibida", "categorizada", "en-bodega", "excede-categoria"].includes(box.status) && !box.truckId)}
    initialLoadedBoxes={boxes.filter((box) => !!box.truckId)}
    initialTrucks={trucks.filter((truck) => ["planificado", "cargando"].includes(truck.status))}
    users={users} warehouses={warehouses}
  /></div></>;
}
