import { requireAdminUser } from "@/lib/auth/actions";
import { CustomerManager } from "@/components/admin/customer-manager";
import { SectionTitle } from "@/components/cliente/section-title";
import { CUSTOMER_COPY } from "@/lib/config/customers";
import { logisticsService } from "@/lib/services/logistics";
import { customersDirectory } from "@/lib/i18n/catalogs/customers-directory";
import { getT } from "@/lib/i18n/server";

export default async function CustomersPage() { await requireAdminUser(["clientes"]);
  const [users, addresses, boxes, shipments, invoices, t] = await Promise.all([logisticsService.getUsers(), logisticsService.getAddresses(), logisticsService.getBoxes(), logisticsService.getShipments(), logisticsService.getInvoices(), getT(customersDirectory)]);
  return <><SectionTitle eyebrow={t(CUSTOMER_COPY.directory.eyebrow)} title={t(CUSTOMER_COPY.directory.title)} description={t(CUSTOMER_COPY.directory.description)} /><div className="mt-7"><CustomerManager initialUsers={users} initialAddresses={addresses} boxes={boxes} shipments={shipments} invoices={invoices} /></div></>;
}
