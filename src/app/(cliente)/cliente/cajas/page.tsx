import { ClientBoxList } from "@/components/cliente/box-list";
import { SectionTitle } from "@/components/cliente/section-title";
import { requireClientUser } from "@/lib/auth/actions";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function BoxesPage() {
  const [user, allBoxes, rates, t] = await Promise.all([requireClientUser(), logisticsService.getBoxes(), configService.getCatalog(), getT(clientPages)]);
  return <><SectionTitle eyebrow={t("Inventario")} title={t("Mis cajas")} description={t("Consulta categoría, medidas, precio e historial de cada caja.")} /><div className="mt-7"><ClientBoxList boxes={allBoxes.filter((box) => box.userId === user.id)} rates={rates} /></div></>;
}
