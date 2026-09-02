import { SectionTitle } from "@/components/cliente/section-title";
import { RecipientManager } from "@/components/cliente/crud-manager";
import { logisticsService } from "@/lib/services/logistics";
export default async function RecipientsPage() { const [items, addresses] = await Promise.all([logisticsService.getRecipients(), logisticsService.getAddresses()]); return <><SectionTitle eyebrow="Personas autorizadas" title="Destinatarios" description="Guarda personas y asígnalas a una dirección de entrega." /><div className="mt-7"><RecipientManager initialItems={items.filter((item) => item.userId === "usr-001")} addresses={addresses.filter((item) => item.userId === "usr-001")} /></div></>; }
