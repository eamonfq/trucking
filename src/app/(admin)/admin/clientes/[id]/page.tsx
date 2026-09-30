import { requireAdminUser } from "@/lib/auth/actions";
import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { logisticsService } from "@/lib/services/logistics";
import { isFullAdmin } from "@/lib/auth/admin-permissions";
import { getCustomerArchives } from "@/lib/auth/customer-archive-actions";
import { recordRevision } from "@/lib/db/revision";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) { const actor=await requireAdminUser(["clientes"]);
  const { id } = await params;
  const [customer, addresses, recipients, boxes, shipments, invoices] = await Promise.all([logisticsService.getUserById(id), logisticsService.getAddresses(), logisticsService.getRecipients(), logisticsService.getBoxes(), logisticsService.getShipments(), logisticsService.getInvoices()]);
  if (!customer || customer.role !== "cliente") notFound();
  const archives=isFullAdmin(actor)?await getCustomerArchives(id):[];
  return <CustomerDetail key={recordRevision({customer,boxes,archives})} canManage={isFullAdmin(actor)} archives={archives} initialUser={customer} initialAddresses={addresses.filter((item) => item.userId === id)} initialRecipients={recipients.filter((item) => item.userId === id)} boxes={boxes.filter((item) => item.userId === id)} shipments={shipments.filter((item) => item.userId === id)} invoices={invoices.filter((item) => item.userId === id)} />;
}
