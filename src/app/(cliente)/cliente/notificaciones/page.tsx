import { SectionTitle } from "@/components/cliente/section-title";
import { NotificationsList } from "@/components/cliente/notifications-list";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function NotificationsPage() {
  const [user, allItems, t] = await Promise.all([requireClientUser(), logisticsService.getNotifications(), getT(clientPages)]);
  return <><SectionTitle eyebrow={t("Centro de avisos")} title={t("Notificaciones")} description={t("Consulta recepciones, envíos, facturas y pagos comunicados también por correo.")} /><div className="mt-7"><NotificationsList initial={allItems.filter((item) => item.userId === user.id)} /></div></>;
}
