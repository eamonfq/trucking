import { SectionTitle } from "@/components/cliente/section-title";
import { SupportCenter } from "@/components/cliente/support-center";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function SupportPage() {
  const [user, tickets, t] = await Promise.all([requireClientUser(), logisticsService.getSupportTickets(), getT(clientPages)]);
  return <><SectionTitle eyebrow={t("Estamos para ayudarte")} title={t("Soporte")} description={t("Abre un ticket y conserva toda la conversación en un solo hilo.")} /><div className="mt-7"><SupportCenter key={tickets.map(ticket=>`${ticket.id}:${ticket.updatedAt}`).join("|")} initialTickets={tickets.filter((ticket) => ticket.userId === user.id)} /></div></>;
}
