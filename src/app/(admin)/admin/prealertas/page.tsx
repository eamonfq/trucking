import { requireAdminUser } from "@/lib/auth/actions";
import { PrealertManager } from "@/components/admin/prealert-manager";
import { logisticsService } from "@/lib/services/logistics";
import { SectionTitle } from "@/components/cliente/section-title";
import { receptionPrealerts } from "@/lib/i18n/catalogs/reception-prealerts";
import { getT } from "@/lib/i18n/server";
export default async function Page(){ await requireAdminUser(["prealertas"]);const [users,boxes]=await Promise.all([logisticsService.getUsers(),logisticsService.getBoxes()]);const t=await getT(receptionPrealerts);return <><SectionTitle eyebrow={t("Antes de recibir")} title={t("Prealertas")} description={t("Crea, edita y asigna las compras pendientes a su cliente.")}/><div className="mt-7"><PrealertManager users={users} boxes={boxes}/></div></>;}
