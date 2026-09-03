import { redirect } from "next/navigation";
import { SectionTitle } from "@/components/cliente/section-title";
import { PrealertForm } from "@/components/cliente/prealert-form";
import { configService } from "@/lib/services/config";

export default async function PrealertsPage() { const [flow, rates] = await Promise.all([configService.getFlowConfig(), configService.getRateTable()]); if (flow.originMode !== "casillero") redirect("/cliente"); return <><SectionTitle eyebrow="Compras en USA" title="Pre-alertas" description="Registra una compra antes de que llegue a bodega para identificarla con rapidez." /><div className="mt-7 max-w-3xl"><PrealertForm rates={rates} /></div></>; }
