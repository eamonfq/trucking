import { SectionTitle } from "@/components/cliente/section-title";
import { AddressManager } from "@/components/cliente/crud-manager";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function AddressesPage() {
  const [user, allItems, t] = await Promise.all([requireClientUser(), logisticsService.getAddresses(), getT(clientPages)]);
  return <><SectionTitle eyebrow={t("Entrega en México")} title={t("Direcciones")} description={t("Administra los domicilios donde podemos entregar tus cajas.")} /><div className="mt-7"><AddressManager initialItems={allItems.filter((item) => item.userId === user.id)} /></div></>;
}
