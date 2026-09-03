import { SectionTitle } from "@/components/cliente/section-title";
import { RecipientManager } from "@/components/cliente/crud-manager";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";

export default async function RecipientsPage() {
  const [user, items, addresses] = await Promise.all([requireClientUser(), logisticsService.getRecipients(), logisticsService.getAddresses()]);
  return <><SectionTitle eyebrow="Personas autorizadas" title="Destinatarios" description="Registra a quién entregamos y en qué dirección." /><div className="mt-7"><RecipientManager initialItems={items.filter((item) => item.userId === user.id)} addresses={addresses.filter((item) => item.userId === user.id)} /></div></>;
}
