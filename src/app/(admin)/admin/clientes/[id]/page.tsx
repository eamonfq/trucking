import { notFound } from "next/navigation";
import { CustomerDetail } from "@/components/admin/customer-detail";
import { logisticsService } from "@/lib/services/logistics";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, addresses, recipients, boxes, shipments, invoices] = await Promise.all([logisticsService.getUserById(id), logisticsService.getAddresses(), logisticsService.getRecipients(), logisticsService.getBoxes(), logisticsService.getShipments(), logisticsService.getInvoices()]);
  if (!customer || customer.role !== "cliente") notFound();
  return <CustomerDetail initialUser={customer} initialAddresses={addresses.filter((item) => item.userId === id)} initialRecipients={recipients.filter((item) => item.userId === id)} boxes={boxes.filter((item) => item.userId === id)} shipments={shipments.filter((item) => item.userId === id)} invoices={invoices.filter((item) => item.userId === id)} />;
}
