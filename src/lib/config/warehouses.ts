import type { Warehouse } from "@/lib/types";
export const WAREHOUSE_KINDS = ["origen","destino","ambos"] as const;
export type WarehouseKind = typeof WAREHOUSE_KINDS[number];
export const WAREHOUSE_KIND_LABELS = {origen:"Origen · recepción y salida",destino:"Destino · descarga y entrega",ambos:"Origen y destino"};
// Records created before this distinction were destination warehouses.
export function warehouseSupports(w:Warehouse,kind:"origen"|"destino"){return (w.kind??"destino")===kind||w.kind==="ambos";}
