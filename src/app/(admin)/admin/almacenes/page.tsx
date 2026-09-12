import { WarehouseSettings } from "@/components/admin/warehouse-settings";
import { SectionTitle } from "@/components/cliente/section-title";
import { getWarehouseAdministration } from "@/lib/auth/warehouse-actions";
import { configService } from "@/lib/services/config";
export default async function Page(){const [data,flow]=await Promise.all([getWarehouseAdministration(),configService.getFlowConfig()]);return <><SectionTitle eyebrow="Red de recepción" title="Almacenes y operadores" description="Define destinos, mensajes y accesos limitados por almacén."/><div className="mt-7"><WarehouseSettings data={data} cities={flow.destinationCities}/></div></>;}
