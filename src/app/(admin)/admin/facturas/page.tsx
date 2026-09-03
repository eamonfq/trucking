import { SectionTitle } from "@/components/cliente/section-title";
import { PaymentApprovals } from "@/components/admin/payment-approvals";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
export default async function AdminInvoicesPage() { const [invoices, flow] = await Promise.all([logisticsService.getInvoices(), configService.getFlowConfig()]); return <><SectionTitle eyebrow="Facturación" title="Facturas y pagos" description={`Momento activo de facturación: ${flow.billingMoment.replaceAll("-", " ")}. Aprueba reportes después de verificar el comprobante.`} /><div className="mt-7"><PaymentApprovals initial={invoices} /></div></>; }
