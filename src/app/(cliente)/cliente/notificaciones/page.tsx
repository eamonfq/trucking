import { SectionTitle } from "@/components/cliente/section-title";
import { NotificationsList } from "@/components/cliente/notifications-list";
import { logisticsService } from "@/lib/services/logistics";
export default async function NotificationsPage() { const items = (await logisticsService.getNotifications()).filter((item) => item.userId === "usr-001"); return <><SectionTitle eyebrow="Centro de avisos" title="Notificaciones" description="Cambios operativos visibles en el panel y preparados para enviarse también por correo." /><div className="mt-7"><NotificationsList initial={items} /></div></>; }
