import { SectionTitle } from "@/components/cliente/section-title";
import { QuoteCalculator } from "@/components/marketing/quote-calculator";
export default function ClientQuotePage() { return <><SectionTitle eyebrow="Herramienta" title="Cotizador de caja" description="Ingresa medidas exteriores y el peso total. El resultado usa el tarifario activo." /><div className="mt-7 rounded-card border border-stone-200 bg-white p-5 shadow-soft sm:p-7"><QuoteCalculator /></div></>; }
