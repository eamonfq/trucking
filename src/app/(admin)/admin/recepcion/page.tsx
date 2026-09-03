import { SectionTitle } from "@/components/cliente/section-title";
import { ReceptionForm } from "@/components/admin/reception-form";
import { configService } from "@/lib/services/config";
import { logisticsService } from "@/lib/services/logistics";
export default async function ReceptionPage({ searchParams }: { searchParams: Promise<{ customer?: string }> }) { const [{ customer }, users, flow, rates] = await Promise.all([searchParams, logisticsService.getUsers(), configService.getFlowConfig(), configService.getRateTable()]); return <><SectionTitle eyebrow="Ingreso a bodega" title="Recepción" description="Mide, pesa y confirma la categoría antes de registrar una caja." /><div className="mt-7"><ReceptionForm users={users} excessPolicy={flow.excessPolicy} rates={rates} defaultCustomerId={customer} /></div></>; }
