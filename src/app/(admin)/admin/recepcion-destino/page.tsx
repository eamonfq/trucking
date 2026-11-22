import { requireAdminUser } from "@/lib/auth/actions";
import { DestinationDesk } from "@/components/admin/destination-desk";
import { getDestinationDesk } from "@/lib/auth/warehouse-actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { trucksDestination } from "@/lib/i18n/catalogs/trucks-destination";
import { getT } from "@/lib/i18n/server";
export default async function Page(){ await requireAdminUser(["recepcion-destino"]);const t=await getT(trucksDestination);return <><SectionTitle eyebrow={t("Descarga")} title={t("Recepción en destino")} description={t("Selecciona almacén y viaje. Confirma la llegada física escaneando cada paquete.")}/><div className="mt-7"><DestinationDesk data={await getDestinationDesk()}/></div></>;}
