import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { TrackingSearch } from "@/components/marketing/tracking-search";

export const metadata = { robots: { index: false, follow: false }, title: "Rastrear carga", description: "Consulta el estado de una caja, envío o camión A&L sin iniciar sesión." };

const EXAMPLES = [
  { label: "Caja", code: "BX-260002" },
  { label: "Envío", code: "SH-260003" },
  { label: "Camión", code: "TR-260102" },
];

export default function TrackingPage() {
  return <>
    <MarketingHeader />
    <main className="relative overflow-hidden bg-navy-900 px-5 py-24 sm:px-8 lg:px-24 lg:py-32">
      <div aria-hidden="true" className="absolute inset-0 opacity-50 [background-image:linear-gradient(#2C3D66_1px,transparent_1px),linear-gradient(90deg,#2C3D66_1px,transparent_1px)] [background-size:30px_30px]" />
      <div className="relative mx-auto flex max-w-[90rem] flex-col gap-9">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-over font-semibold uppercase text-brand-300">Rastreo público</p>
          <h1 className="font-display text-[2.75rem] font-extrabold leading-[.96] tracking-[-.04em] text-white sm:text-6xl lg:text-[4.5rem]">¿Dónde está tu carga?</h1>
          <p className="text-lg leading-relaxed text-[#A8B2CA] text-pretty">Escribe el folio de tu caja (BX-), tu envío (SH-) o tu camión (TR-). No necesitas cuenta y no mostramos información personal.</p>
        </div>
        <div className="max-w-3xl"><TrackingSearch dark /></div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[#A8B2CA]">Ejemplos:</span>
          {EXAMPLES.map((example) => <span key={example.code} className="rounded-full border border-navy-700 px-3.5 py-2 text-xs font-medium text-[#D6DCEA]">{example.label} {example.code}</span>)}
        </div>
      </div>
    </main>
    <MarketingFooter />
  </>;
}
