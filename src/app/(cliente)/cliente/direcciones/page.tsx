import { SectionTitle } from "@/components/cliente/section-title";
import { AddressManager } from "@/components/cliente/crud-manager";
import { logisticsService } from "@/lib/services/logistics";
export default async function AddressesPage() { const items = (await logisticsService.getAddresses()).filter((item) => item.userId === "usr-001"); return <><SectionTitle eyebrow="Entrega en México" title="Direcciones" description="Administra domicilios con código postal, colonia, municipio y estado." /><div className="mt-7"><AddressManager initialItems={items} /></div></>; }
