import { SectionTitle } from "@/components/cliente/section-title";
import { RecipientManager } from "@/components/cliente/crud-manager";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function RecipientsPage() {
  const [user, items, addresses, t] = await Promise.all([requireClientUser(), logisticsService.getRecipients(), logisticsService.getAddresses(), getT(clientPages)]);
  return <><SectionTitle eyebrow={t("Personas autorizadas")} title={t("Destinatarios")} description={t("Registra a quién entregamos y en qué dirección.")} /><div className="mt-7"><RecipientManager initialItems={items.filter((item) => item.userId === user.id)} addresses={addresses.filter((item) => item.userId === user.id)} /></div></>;
}
