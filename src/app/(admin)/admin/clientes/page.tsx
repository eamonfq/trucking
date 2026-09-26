import { requireAdminUser } from "@/lib/auth/actions";
import { CustomerManager } from "@/components/admin/customer-manager";
import { SectionTitle } from "@/components/cliente/section-title";
import { CUSTOMER_COPY } from "@/lib/config/customers";
import { logisticsService } from "@/lib/services/logistics";

export default async function CustomersPage() { await requireAdminUser(["clientes"]);
  const [users, addresses, boxes, shipments, invoices] = await Promise.all([logisticsService.getUsers(), logisticsService.getAddresses(), logisticsService.getBoxes(), logisticsService.getShipments(), logisticsService.getInvoices()]);
  return <><SectionTitle eyebrow={CUSTOMER_COPY.directory.eyebrow} title={CUSTOMER_COPY.directory.title} description={CUSTOMER_COPY.directory.description} /><div className="mt-7"><CustomerManager initialUsers={users} initialAddresses={addresses} boxes={boxes} shipments={shipments} invoices={invoices} /></div></>;
}
