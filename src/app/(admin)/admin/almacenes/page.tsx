import { requireAdminUser } from "@/lib/auth/actions";
import { WarehouseSettings } from "@/components/admin/warehouse-settings";
import { SectionTitle } from "@/components/cliente/section-title";
import { getWarehouseAdministration } from "@/lib/auth/warehouse-actions";
import { adminWarehouses } from "@/lib/i18n/catalogs/admin-warehouses";
import { getT } from "@/lib/i18n/server";

export default async function Page(){ await requireAdminUser(["almacenes"]);const [data,t]=await Promise.all([getWarehouseAdministration(),getT(adminWarehouses)]);return <><SectionTitle eyebrow={t("Red de recepción")} title={t("Almacenes y operadores")} description={t("Separa origen y destino, captura su ubicación y asigna accesos por almacén.")}/><div className="mt-7"><WarehouseSettings data={data}/></div></>;}
