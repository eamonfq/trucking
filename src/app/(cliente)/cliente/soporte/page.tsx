import { SectionTitle } from "@/components/cliente/section-title";
import { SupportCenter } from "@/components/cliente/support-center";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";

export default async function SupportPage() {
  const [user, tickets] = await Promise.all([requireClientUser(), logisticsService.getSupportTickets()]);
  return <><SectionTitle eyebrow="Estamos para ayudarte" title="Soporte" description="Abre un ticket y conserva toda la conversación en un solo hilo." /><div className="mt-7"><SupportCenter initialTickets={tickets.filter((ticket) => ticket.userId === user.id)} /></div></>;
}
