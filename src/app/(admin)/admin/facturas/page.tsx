import { requireAdminUser } from "@/lib/auth/actions";
import {recordRevision} from "@/lib/db/revision";
import { getOperationalLocations } from "@/lib/auth/warehouse-actions";
import { SectionTitle } from "@/components/cliente/section-title";
import { PaymentApprovals } from "@/components/admin/payment-approvals";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { FLOW_OPTION_LABELS } from "@/lib/config/flow";
export default async function AdminInvoicesPage({searchParams}:{searchParams:Promise<{invoice?:string}>}) { await requireAdminUser(["facturas"]); const [invoices, flow, users, query, locations, shipments] = await Promise.all([logisticsService.getInvoices(), configService.getFlowConfig(), logisticsService.getUsers(), searchParams, getOperationalLocations(), logisticsService.getShipments()]); return <><SectionTitle eyebrow="Facturación" title="Facturas y pagos" description={`Facturación ${FLOW_OPTION_LABELS[flow.billingMoment].toLowerCase()}. Revisa el desglose y resuelve comprobantes reportados.`} /><div className="mt-7"><PaymentApprovals shipments={shipments} locations={locations.warehouses.filter(w=>w.active)} key={`${query.invoice??""}-${recordRevision(invoices)}`} initial={invoices} users={users} selectedId={query.invoice} /></div></>; }
