import type { Metadata } from "next";
import Link from "next/link";
import { BoxIso, BoxIsoDefs } from "@/components/marketing/box-iso";
import { FaqList } from "@/components/marketing/faq-list";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { PackingGuide } from "@/components/marketing/packing-guide";
import { ProcessSteps, type ProcessStep } from "@/components/marketing/process-steps";
import { QuoteCalculator } from "@/components/marketing/quote-calculator";
import { RouteMap } from "@/components/marketing/route-map";
import { TrackingSearch } from "@/components/marketing/tracking-search";
import type { BoxCategory } from "@/lib/config/box-categories";
import { DESTINATION_COVERAGE } from "@/lib/config/company";
import { configService } from "@/lib/services/config";

export const metadata: Metadata = {
  title: "Envíos terrestres USA a México",
  description: "Envía desde USA a México con precio fijo por categoría de caja. Cotiza y rastrea sin sorpresas.",
  openGraph: { title: "Envía más, paga menos | A&L Trucking Logistics", description: "Precio fijo por categoría de caja para envíos terrestres USA → México.", type: "website" },
};

const LOCKER_STEPS: ProcessStep[] = [
  { title: "Compra en línea", body: "Usa tu casillero A&L en Miami como dirección de envío en las tiendas de Estados Unidos. Tu número llega al crear la cuenta." },
  { title: "Pre-alerta tu caja", body: "Registra en tu cuenta la guía de la tienda y la categoría de caja. Así identificamos tu paquete el día que llega a bodega." },
  { title: "Agrupa y envía", body: "Junta varias cajas en un mismo envío, confirma el destino en México y paga el total: la suma del precio fijo de cada categoría." },
  { title: "Recibe en México", body: "Sigue el camión etapa por etapa: bodega, carga, tránsito, frontera y entrega en la dirección que registraste." },
];

const DIRECT_STEPS: ProcessStep[] = [
  { title: "Prepara tu caja", body: "Empaca una caja firme, sellada en todas sus uniones y con forma cuadrada. El límite de peso incluye la caja y su contenido." },
  { title: "Entrega o pide recolección", body: "Lleva la caja a nuestro punto de recepción o coordina que pasemos por ella. La medimos y categorizamos al ingresar." },
  { title: "Agrupa y envía", body: "Junta varias cajas en un mismo envío, confirma el destino en México y paga el total: la suma del precio fijo de cada categoría." },
  { title: "Recibe en México", body: "Sigue el camión etapa por etapa: bodega, carga, tránsito, frontera y entrega en la dirección que registraste." },
];

export default async function LandingPage() {
  const [flow, categories] = await Promise.all([configService.getFlowConfig(), configService.getRateTable()]);
  const locker = flow.originMode === "casillero";
  const cheapest = categories[0];
  const featured = categories[1]?.id;
  const MOBILE_LAYOUT: Record<string, { position: string; chip: "light" | "brand"; chipClass: string }> = {
    cubo: { position: "bottom-1.5 left-6.5", chip: "brand", chipClass: "-left-3.5 bottom-10.5" },
    medium: { position: "bottom-8.5 right-3.5", chip: "light", chipClass: "-right-3 top-1" },
    small: { position: "right-8.5 top-0", chip: "light", chipClass: "-right-3 -top-2" },
  };
  const mobileBoxes = ["cubo", "medium", "small"]
    .map((id) => ({ category: categories.find((item) => item.id === id), ...MOBILE_LAYOUT[id]! }))
    .filter((item): item is { category: BoxCategory; position: string; chip: "light" | "brand"; chipClass: string } => item.category !== undefined);

  return <>
    <BoxIsoDefs />
    <MarketingHeader />
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy-950">
        <div aria-hidden="true" className="absolute inset-0 opacity-55 [background-image:linear-gradient(#243456_1px,transparent_1px),linear-gradient(90deg,#243456_1px,transparent_1px)] [background-size:44px_44px]" />
        <div aria-hidden="true" className="absolute -right-65 -top-55 size-250 rounded-full bg-[radial-gradient(circle,rgba(232,98,28,.30)_0%,rgba(232,98,28,.08)_42%,transparent_66%)]" />
        <svg aria-hidden="true" viewBox="0 0 900 380" fill="none" preserveAspectRatio="none" className="absolute bottom-36 right-0 hidden h-95 w-3/5 lg:block">
          <path d="M-20 360 C 200 330, 380 200, 620 150 C 760 120, 860 96, 980 40" stroke="#E8621C" strokeWidth="2.5" strokeDasharray="16 14" opacity=".45" className="motion-safe:[animation:dash-move_6s_linear_infinite]" />
          <path d="M-20 392 C 240 362, 420 262, 700 212 C 820 190, 900 168, 1000 120" stroke="#33436B" strokeWidth="2" strokeDasharray="10 12" opacity=".75" className="motion-safe:[animation:dash-move_9s_linear_infinite]" />
        </svg>

        <div className="relative mx-auto grid max-w-[90rem] items-center gap-14 px-5 pt-16 sm:px-8 lg:px-18 lg:pt-24 xl:grid-cols-[38.75rem_1fr]">
          <div className="flex min-w-0 flex-col gap-7">
            <p className="inline-flex w-fit items-center gap-3 rounded-full border border-navy-700 bg-white/6 px-4.5 py-2.5 text-over font-semibold uppercase text-[#F2E9DC]">
              <span aria-hidden="true" className="size-2 rounded-full bg-brand-600" />
              <span className="hidden sm:inline">Carga terrestre · </span>Miami → México
            </p>
            <h1 className="font-display text-[3.25rem] font-extrabold leading-[.86] tracking-[-.05em] text-white sm:text-7xl lg:text-[6.75rem]">
              Envía más,<br /><span className="text-brand-300">paga menos.</span>
            </h1>
            <p className="max-w-[32.5rem] text-lg leading-relaxed text-[#B9C4DC] text-pretty">Precio fijo por categoría de caja. El peso es un límite de seguridad, no la unidad de cobro: sabes el total antes de empacar.</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Link href="/registro" className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-lg bg-brand-600 px-7 text-base font-semibold text-white shadow-[0_14px_34px_rgba(232,98,28,.32)] transition hover:-translate-y-0.5 hover:bg-brand-700">Crear mi cuenta <span aria-hidden="true">→</span></Link>
              <Link href="/login" className="inline-flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-[#44567F] px-6 text-base font-semibold text-white transition hover:border-white">Ingresar a mi cuenta</Link>
              <Link href="#tarifas" className="inline-flex min-h-14 items-center justify-center rounded-lg border-[1.5px] border-[#44567F] px-6 text-base font-semibold text-white transition hover:border-white">Ver las 5 tarifas</Link>
            </div>
            <dl className="hidden flex-wrap gap-10 border-t border-[#2A3A5E] pt-7 lg:flex">
              <HeroStat value="5" detail={<>categorías, sin escalas<br />de peso ocultas</>} />
              <HeroStat value={cheapest ? `$${cheapest.priceUsd}` : "—"} detail={<>desde, por caja<br />hasta {cheapest?.maxWeightLb ?? "—"} lb</>} />
              <HeroStat value="— días" pending detail={<>tránsito estimado<br />dato pendiente</>} />
            </dl>
          </div>

          {/* Composición de cajas a escala real entre sí */}
          <div className="relative hidden h-140 min-w-0 xl:block" aria-hidden="true">
            <div className="absolute bottom-14 left-10 right-5 h-30 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.45)_0%,transparent_70%)]" />
            <ScaledBox categories={categories} id="x-large" className="absolute bottom-11 left-1.5" price="$230" chip="light" chipClass="-left-3.5 top-5.5" />
            <ScaledBox categories={categories} id="cubo" className="absolute bottom-0 left-37.5" price="$260" chip="brand" chipClass="-right-5 bottom-14" />
            <ScaledBox categories={categories} id="large" className="absolute bottom-8.5 right-0" price="$180" chip="light" chipClass="-right-4 top-3.5" />
            <ScaledBox categories={categories} id="medium" className="absolute left-18.5 top-24" price="$110" chip="light" chipClass="-left-5.5 top-2" />
            <ScaledBox categories={categories} id="small" className="absolute right-14 top-10" price="$80" chip="light" chipClass="-right-4.5 -top-1.5" />
            <p className="absolute -bottom-1.5 right-2 flex items-center gap-2.5 rounded-full border border-navy-700 bg-white/6 px-4 py-2.5">
              <span className="text-[.6875rem] font-semibold uppercase tracking-[.14em] text-brand-300">A escala real</span>
              <span className="text-xs text-[#B9C4DC]">Small a Cubo</span>
            </p>
          </div>

          {/* Móvil: misma composición isométrica del artboard, anclada a los bordes para
              que no dependa de un ancho fijo. Escala uniforme, así siguen a escala real. */}
          <div className="relative mx-auto h-58 w-full min-w-0 max-w-100 xl:hidden" aria-hidden="true">
            <div className="absolute inset-x-2.5 bottom-5.5 h-17.5 rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.5)_0%,transparent_70%)]" />
            {mobileBoxes.map(({ category, position, chip, chipClass }) => (
              <div key={category.id} className={`absolute ${position}`}>
                <div className="relative motion-safe:[animation:float-y_8s_ease-in-out_infinite]">
                  <BoxIso category={category} scale={1.05} detailed className="drop-shadow-[0_16px_22px_rgba(0,0,0,.45)]" />
                  <span className={`absolute rounded-md px-2 py-1 font-display text-base font-extrabold ${chip === "brand" ? "bg-brand-700 text-white" : "bg-cream-100 text-navy-950"} ${chipClass}`}>${category.priceUsd}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rastreo integrado al hero */}
        <div className="relative mt-16 border-t border-[#2A3A5E] bg-navy-975">
          <div className="mx-auto grid max-w-[90rem] items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_38.75rem] lg:px-18">
            <div className="flex flex-col gap-1.5">
              <p className="text-over font-semibold uppercase text-brand-300">Rastreo público</p>
              <h2 className="font-display text-3xl font-bold leading-tight tracking-[-.02em] text-white">¿Dónde está tu carga?</h2>
              <p className="text-sm text-[#A8B2CA]">Consulta con tu folio sin iniciar sesión.</p>
            </div>
            <TrackingSearch dark />
          </div>
        </div>
      </section>

      {/* Tarifas */}
      <section id="tarifas" className="bg-navy-900 px-5 py-24 sm:px-8 lg:px-18 lg:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="grid items-end gap-10 pb-16 lg:grid-cols-[1fr_30rem]">
            <div className="flex flex-col gap-5">
              <p className="text-over font-semibold uppercase text-brand-300">Tarifas transparentes</p>
              <h2 className="font-display text-[2.75rem] font-extrabold leading-[.94] tracking-[-.04em] text-white sm:text-6xl lg:text-d2">Una caja.<br />Un precio fijo.</h2>
            </div>
            <p className="text-lg leading-relaxed text-[#A8B2CA] text-pretty">Las cajas están dibujadas a escala entre sí. Elige la más pequeña que admita todas tus medidas exteriores y el peso total; el límite incluye caja y contenido.</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-5 xl:gap-5">
            {categories.map((category) => {
              const highlight = category.id === featured;
              return (
                <article key={category.id} className={`relative flex items-center gap-4 rounded-xl border p-5 transition hover:-translate-y-0.5 xl:min-h-105 xl:flex-col xl:items-stretch xl:justify-between xl:p-7 ${highlight ? "border-brand-500 bg-cream-100 shadow-[0_0_0_3px_rgba(232,98,28,.35)]" : "border-navy-700 bg-navy-800"}`}>
                  {highlight && <span className="absolute -top-3 left-5 rounded-full bg-brand-700 px-3 py-1.5 text-[.6875rem] font-bold uppercase tracking-[.14em] text-white xl:left-6">La más pedida</span>}
                  <div className="flex w-20 shrink-0 justify-center xl:hidden"><BoxIso category={category} scale={0.6} /></div>
                  <div className="hidden h-42 items-end justify-center xl:flex"><BoxIso category={category} scale={1} /></div>

                  {/* Móvil: medidas y límite en líneas propias, así ninguna parte con el separador colgando */}
                  <div className="flex min-w-0 flex-1 flex-col gap-1 xl:hidden">
                    <p className={`text-base font-semibold ${highlight ? "text-navy-900" : "text-white"}`}>{category.name}</p>
                    <p className={`text-sm ${highlight ? "text-ink-700" : "text-[#A8B2CA]"}`}>{category.dimensions.length} × {category.dimensions.width} × {category.dimensions.height} in · hasta {category.maxWeightLb} lb</p>
                  </div>
                  <p className={`shrink-0 font-display text-[1.875rem] font-extrabold leading-none tracking-[-.03em] xl:hidden ${highlight ? "text-navy-900" : "text-white"}`}>${category.priceUsd}</p>

                  {/* Escritorio: precio como elemento dominante de la tarjeta */}
                  <div className="hidden flex-col gap-3.5 xl:flex">
                    <p className={`text-sm font-semibold ${highlight ? "text-navy-900" : "text-white"}`}>{category.name}</p>
                    <p className="flex items-baseline gap-1.5">
                      <span className={`font-display text-[3.25rem] font-extrabold leading-[.9] tracking-[-.04em] ${highlight ? "text-navy-900" : "text-white"}`}>${category.priceUsd}</span>
                      <span className={`text-xs font-medium ${highlight ? "text-ink-500" : "text-[#A8B2CA]"}`}>USD</span>
                    </p>
                    <div className={`flex flex-col gap-1.5 border-t pt-3.5 ${highlight ? "border-line-300" : "border-navy-700"}`}>
                      <span className={`text-sm ${highlight ? "text-ink-700" : "text-[#A8B2CA]"}`}>{category.dimensions.length} × {category.dimensions.width} × {category.dimensions.height} in</span>
                      <span className={`text-sm font-medium ${highlight ? "text-brand-700" : "text-brand-300"}`}>Hasta {category.maxWeightLb} lb</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Cotizador */}
      <section className="bg-white px-5 py-24 sm:px-8 lg:px-18 lg:py-28">
        <div className="mx-auto grid max-w-[90rem] items-start gap-14 lg:grid-cols-[27.5rem_minmax(0,1fr)] lg:gap-20">
          <div className="flex flex-col gap-5">
            <p className="text-over font-semibold uppercase text-brand-700">Cotizador en vivo</p>
            <h2 className="font-display text-[2.75rem] font-extrabold leading-[.96] tracking-[-.04em] text-navy-900 sm:text-[3.75rem]">Mide, pesa y<br />ve tu precio.</h2>
            <p className="text-lg leading-relaxed text-ink-700 text-pretty">Escribe las medidas exteriores en pulgadas y el peso total en libras. Te asignamos la categoría más pequeña que las admita. Si ninguna aplica, te lo decimos antes de cualquier cobro.</p>
          </div>
          <QuoteCalculator rates={categories} />
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="proceso" className="bg-cream-100 px-5 py-24 sm:px-8 lg:px-18 lg:py-28">
        <div className="mx-auto max-w-[90rem]">
          <div className="flex max-w-3xl flex-col gap-5 pb-6">
            <p className="text-over font-semibold uppercase text-brand-700">Cómo funciona</p>
            <h2 className="font-display text-[2.75rem] font-extrabold leading-[.96] tracking-[-.04em] text-navy-900 sm:text-[4.25rem]">
              {locker ? <>De la tienda en USA<br />a tu puerta en México.</> : <>De tu caja a<br />tu puerta en México.</>}
            </h2>
          </div>
          <ProcessSteps steps={locker ? LOCKER_STEPS : DIRECT_STEPS} lockerCode="AL-MX-0001" />
        </div>
      </section>

      {/* Cómo enviar tu caja */}
      <section className="bg-white px-5 py-24 sm:px-8 lg:px-18 lg:py-28">
        <div className="mx-auto grid max-w-[90rem] gap-14 lg:grid-cols-[1fr_1.15fr] lg:items-center">
          <div className="flex flex-col gap-5">
            <p className="text-over font-semibold uppercase text-brand-700">Cómo enviar tu caja</p>
            <h2 className="font-display text-[2.5rem] font-extrabold leading-[.98] tracking-[-.04em] text-navy-900 sm:text-d3">La forma importa tanto como el contenido.</h2>
            <p className="max-w-lg text-lg leading-relaxed text-ink-700 text-pretty">Una caja que conserva su forma cuadrada se estiba mejor, viaja protegida y no retrasa el envío completo.</p>
          </div>
          <PackingGuide />
        </div>
      </section>

      {/* Cobertura */}
      <section id="cobertura" className="bg-cream-100 px-5 py-24 sm:px-8 lg:px-18 lg:py-28">
        <div className="mx-auto grid max-w-[90rem] gap-14 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="flex flex-col gap-5">
            <p className="text-over font-semibold uppercase text-brand-700">Cobertura</p>
            <h2 className="font-display text-[2.5rem] font-extrabold leading-[.98] tracking-[-.04em] text-navy-900 sm:text-d3">Miami, frontera y el centro de México.</h2>
            <p className="max-w-lg text-lg leading-relaxed text-ink-700 text-pretty">Una sola ruta terrestre: salida de bodega en Miami, cruce por Nuevo Laredo y distribución a los estados de destino.</p>
            <ul className="mt-2 grid gap-2">
              {DESTINATION_COVERAGE.map((item) => (
                <li key={item.region} className="flex items-center justify-between gap-4 rounded-md bg-white px-5 py-3.5">
                  <span className="text-sm font-medium text-navy-900">{item.region}</span>
                  <span className="pending-data rounded-sm px-2 text-sm text-ink-500">— días</span>
                </li>
              ))}
              <li className="flex flex-col gap-1 rounded-md border border-line-300 px-5 py-3.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-label-600">Dato pendiente</span>
                <span className="text-sm text-ink-700">Tiempos y estados definitivos por confirmar.</span>
              </li>
            </ul>
          </div>
          <div className="overflow-hidden rounded-xl bg-navy-900"><RouteMap /></div>
        </div>
      </section>

      {/* Preguntas */}
      <section id="faq" className="bg-white px-5 py-24 sm:px-8 lg:px-18 lg:py-28">
        <div className="mx-auto grid max-w-[90rem] gap-14 lg:grid-cols-[1fr_1.4fr] lg:items-start">
          <div className="flex flex-col gap-5">
            <p className="text-over font-semibold uppercase text-brand-700">Preguntas frecuentes</p>
            <h2 className="font-display text-[2.5rem] font-extrabold leading-[.98] tracking-[-.04em] text-navy-900 sm:text-d3">Antes de enviar, todo claro.</h2>
            <p className="max-w-md text-lg leading-relaxed text-ink-700 text-pretty">Si tu duda no está aquí, escríbenos desde el centro de soporte dentro de tu cuenta.</p>
          </div>
          <FaqList />
        </div>
      </section>

      {/* Cierre */}
      <section className="bg-brand-600 px-5 py-24 sm:px-8 lg:px-18">
        <div className="mx-auto flex max-w-[90rem] flex-col items-start justify-between gap-10 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-[2.5rem] font-extrabold leading-[.98] tracking-[-.04em] text-white sm:text-d3">Tu casillero en Miami, listo hoy.</h2>
            <p className="max-w-xl text-lg leading-relaxed text-white/85 text-pretty">Crea tu cuenta, recibe tu número de casillero y empieza a comprar en tiendas de Estados Unidos.</p>
          </div>
          <Link href="/registro" className="inline-flex min-h-14 shrink-0 items-center gap-2.5 rounded-lg bg-white px-8 text-base font-semibold text-navy-900 transition hover:-translate-y-0.5">Crear mi cuenta <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    </main>
    <MarketingFooter />
  </>;
}

function HeroStat({ value, detail, pending = false }: { value: string; detail: React.ReactNode; pending?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="sr-only">{typeof detail === "string" ? detail : value}</dt>
      <dd className={`w-fit font-display text-3xl font-bold leading-none tracking-[-.02em] ${pending ? "pending-data rounded-sm px-1.5 text-[#A8B2CA]" : "text-white"}`}>{value}</dd>
      <p className="text-sm leading-snug text-[#A8B2CA]">{detail}</p>
    </div>
  );
}

function ScaledBox({ categories, id, className, price, chip, chipClass }: { categories: BoxCategory[]; id: string; className: string; price: string; chip: "light" | "brand"; chipClass: string }) {
  const category = categories.find((item) => item.id === id);
  if (!category) return null;
  return (
    <div className={className}>
      <div className="relative motion-safe:[animation:float-y_8s_ease-in-out_infinite]">
        <BoxIso category={category} scale={1.6} detailed className="drop-shadow-[0_20px_26px_rgba(0,0,0,.45)]" />
        <span className={`absolute rounded-md px-2.5 py-1.5 font-display text-lg font-extrabold tracking-[-.02em] ${chip === "brand" ? "bg-brand-700 text-white" : "bg-cream-100 text-navy-950"} ${chipClass}`}>{price}</span>
      </div>
    </div>
  );
}
