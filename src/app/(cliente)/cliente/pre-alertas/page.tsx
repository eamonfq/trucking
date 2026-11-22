import { redirect } from "next/navigation";
import { SectionTitle } from "@/components/cliente/section-title";
import { PrealertForm } from "@/components/cliente/prealert-form";
import { configService } from "@/lib/services/config";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";

export default async function PrealertsPage() { const [flow, rates, t] = await Promise.all([configService.getFlowConfig(), configService.getRateTable(), getT(clientPages)]); if (flow.originMode !== "casillero") redirect("/cliente"); return <><SectionTitle eyebrow={t("Compras en USA")} title={t("Pre-alertas")} description={t("Registra una compra antes de que llegue a bodega para identificarla con rapidez.")} /><div className="mt-7 max-w-3xl"><PrealertForm rates={rates} /></div></>; }
