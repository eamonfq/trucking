import { SectionTitle } from "@/components/cliente/section-title";
import { QuoteCalculator } from "@/components/marketing/quote-calculator";
import { configService } from "@/lib/services/config";
import { clientPages } from "@/lib/i18n/catalogs/client-pages";
import { getT } from "@/lib/i18n/server";
export default async function ClientQuotePage() { const [rates,flow,t] = await Promise.all([configService.getRateTable(),configService.getFlowConfig(),getT(clientPages)]); return <><SectionTitle eyebrow={t("Herramienta")} title={t("Cotizador de caja")} description={t("Cotiza por volumen con tus medidas o por peso real con tus libras. Consulta también precios fijos y carga especial con el tarifario activo.")} /><div className="mt-7 rounded-card border border-stone-200 bg-white p-5 shadow-soft sm:p-7"><QuoteCalculator client rates={rates} weightPricing={{pricePerLbUsd:flow.pricePerLbUsd,dimensionalBase:flow.dimensionalBase,dimensionalFactor:flow.dimensionalFactor}} /></div></>; }
