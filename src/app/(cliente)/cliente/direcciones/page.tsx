import { SectionTitle } from "@/components/cliente/section-title";
import { AddressManager } from "@/components/cliente/crud-manager";
import { requireClientUser } from "@/lib/auth/actions";
import { logisticsService } from "@/lib/services/logistics";

export default async function AddressesPage() {
  const [user, allItems] = await Promise.all([requireClientUser(), logisticsService.getAddresses()]);
  return <><SectionTitle eyebrow="Entrega en México" title="Direcciones" description="Administra los domicilios donde podemos entregar tus cajas." /><div className="mt-7"><AddressManager initialItems={allItems.filter((item) => item.userId === user.id)} /></div></>;
}
