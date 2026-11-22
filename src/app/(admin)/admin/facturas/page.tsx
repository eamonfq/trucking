import { requireAdminUser } from "@/lib/auth/actions";
import { isFullAdmin } from "@/lib/auth/admin-permissions";
import {recordRevision} from "@/lib/db/revision";
import { getOperationalLocations } from "@/lib/auth/warehouse-actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { PaymentApprovals } from "@/components/admin/payment-approvals";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { flowOptionLabel } from "@/lib/config/flow";
import { customersInvoices } from "@/lib/i18n/catalogs/customers-invoices";
import { getLocale, getT } from "@/lib/i18n/server";
export default async function AdminInvoicesPage({searchParams}:{searchParams:Promise<{invoice?:string}>}) { const actor=await requireAdminUser(["facturas"]); const [invoices, flow, users, query, locations, shipments, t, locale] = await Promise.all([logisticsService.getInvoices(), configService.getFlowConfig(), logisticsService.getUsers(), searchParams, getOperationalLocations(), logisticsService.getShipments(), getT(customersInvoices), getLocale()]); return <><SectionTitle eyebrow={t("Facturación")} title={t("Facturas y pagos")} description={t("Facturación {moment}. Revisa el desglose y resuelve comprobantes reportados.", { moment: flowOptionLabel(flow.billingMoment, locale).toLowerCase() })} /><div className="mt-7"><PaymentApprovals canEdit={isFullAdmin(actor)} revisions={Object.fromEntries(invoices.map(invoice=>[invoice.id,recordRevision(invoice)]))} shipments={shipments} locations={locations.warehouses.filter(w=>w.active)} key={`${query.invoice??""}-${recordRevision(invoices)}`} initial={invoices} users={users} selectedId={query.invoice} /></div></>; }
