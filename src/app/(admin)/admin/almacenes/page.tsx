import { requireAdminUser } from "@/lib/auth/actions";
import { WarehouseSettings } from "@/components/admin/warehouse-settings";
import { SectionTitle } from "@/components/cliente/section-title";
import { getWarehouseAdministration } from "@/lib/auth/warehouse-actions";

export default async function Page(){ await requireAdminUser(["almacenes"]);const data=await getWarehouseAdministration();return <><SectionTitle eyebrow="Red de recepción" title="Almacenes y operadores" description="Separa origen y destino, captura su ubicación y asigna accesos por almacén."/><div className="mt-7"><WarehouseSettings data={data}/></div></>;}
