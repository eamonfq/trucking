import { SectionTitle } from "@/components/cliente/section-title";
import { NotificationsList } from "@/components/cliente/notifications-list";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";

export default async function NotificationsPage() {
  const [user, allItems] = await Promise.all([requireClientUser(), logisticsService.getNotifications()]);
  return <><SectionTitle eyebrow="Centro de avisos" title="Notificaciones" description="Consulta recepciones, envíos, facturas y pagos comunicados también por correo." /><div className="mt-7"><NotificationsList initial={allItems.filter((item) => item.userId === user.id)} /></div></>;
}
