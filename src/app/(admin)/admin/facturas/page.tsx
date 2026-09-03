import { SectionTitle } from "@/components/cliente/section-title";
import { PaymentApprovals } from "@/components/admin/payment-approvals";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
import { FLOW_OPTION_LABELS } from "@/lib/config/flow";
export default async function AdminInvoicesPage() { const [invoices, flow, users] = await Promise.all([logisticsService.getInvoices(), configService.getFlowConfig(), logisticsService.getUsers()]); return <><SectionTitle eyebrow="Facturación" title="Facturas y pagos" description={`Facturación ${FLOW_OPTION_LABELS[flow.billingMoment].toLowerCase()}. Revisa el desglose y resuelve comprobantes reportados.`} /><div className="mt-7"><PaymentApprovals initial={invoices} users={users} /></div></>; }
