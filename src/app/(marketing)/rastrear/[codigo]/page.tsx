import Link from "next/link";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { PublicTimeline, trackingProgress, type TrackingKind } from "@/components/marketing/public-timeline";
import { RouteMap } from "@/components/marketing/route-map";
import { TrackingSearch } from "@/components/marketing/tracking-search";
import { getBoxCategory } from "@/lib/config/box-categories";
import { getStatusLabel } from "@/lib/config/status";
import { trackByCode } from "@/lib/services/tracking";
import { formatDateTime } from "@/lib/utils/format";

export default async function TrackingDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const result = await trackByCode(codigo);
  if (!result) return <NotFound code={decodeURIComponent(codigo)} />;

  const item = result.item;
  const kind: TrackingKind = result.type;
  const progress = trackingProgress(kind, item.status);
  const lastEvent = item.timeline.at(-1);
  const destination = result.type === "box" ? result.destinationCity : result.type === "shipment" ? result.item.destinationCity : result.item.destinationCity;
  const headline = result.type === "truck"
    ? `Guía máster ${getStatusLabel(item.status).toLowerCase()}.`
    : destination
      ? `${getStatusLabel(item.status)} hacia ${destination}.`
      : `${getStatusLabel(item.status)} en bodega Miami.`;
  const summary = result.type === "shipment"
    ? `Envío ${item.code} · ${result.boxes.length} ${result.boxes.length === 1 ? "caja" : "cajas"}`
    : result.type === "box"
      ? `Caja ${item.code} · ${getBoxCategory(result.item.categoryId)?.name ?? "Sin categoría"}`
      : `Camión ${item.code} · ${result.item.boxIds.length} cajas`;

  return <>
    <MarketingHeader />
    <main>
      <section className="bg-cream-100 px-5 py-14 sm:px-8 lg:px-18">
        <div className="mx-auto grid max-w-[90rem] items-end gap-12 lg:grid-cols-[1fr_23.75rem]">
          <div className="flex flex-col gap-4">
            <p className="text-over font-semibold uppercase text-label-600">{summary}</p>
            <h1 className="font-display text-[2.5rem] font-extrabold leading-[.96] tracking-[-.04em] text-navy-900 sm:text-[4rem]">{headline}</h1>
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="rounded-full bg-brand-700 px-3.5 py-2.5 text-over font-semibold uppercase tracking-[.1em] text-white">{getStatusLabel(item.status)}</span>
              {lastEvent && <span className="text-base text-ink-700">Última actualización: {formatDateTime(lastEvent.at)}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3.5 rounded-lg border border-line-300 bg-white p-6.5">
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.14em] text-label-600">Entrega estimada</p>
            <p className="pending-data w-fit rounded-md px-2.5 py-1.5 font-display text-3xl font-extrabold leading-none text-ink-500">— de mes</p>
            <p className="text-sm leading-6 text-ink-500">{destination ? <>Destino: {destination}.<br /></> : null}Fecha por confirmar con operaciones.</p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-8 lg:px-18">
        <div className="mx-auto grid max-w-[90rem] items-start gap-14 lg:grid-cols-[1fr_32.5rem]">
          <div className="flex flex-col gap-7">
            <h2 className="font-display text-3xl font-bold tracking-[-.02em] text-navy-900">Historial {result.type === "truck" ? "del camión" : result.type === "shipment" ? "del envío" : "de la caja"}</h2>
            <PublicTimeline kind={kind} status={item.status} events={item.timeline} />
          </div>
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-xl bg-navy-900"><RouteMap progress={progress} /></div>
            {result.type === "shipment" && <div className="rounded-xl border border-line-300 bg-cream-50 p-6">
              <h3 className="font-display text-h2 font-semibold text-navy-900">Cajas en este envío</h3>
              <ul className="mt-4 grid gap-2.5">{result.boxes.map((box) => <li key={box.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3">
                <span className="text-sm font-semibold text-navy-900">{box.code} <span className="font-normal text-ink-500">{getBoxCategory(box.categoryId)?.name}</span></span>
                <span className="text-xs font-medium text-brand-700">{getStatusLabel(box.status)}</span>
              </li>)}</ul>
              <p className="mt-4 text-sm leading-6 text-ink-500">Recibe {result.recipientFirstName}.</p>
            </div>}
            <p className="rounded-xl bg-cream-100 p-5 text-sm leading-6 text-ink-700">Por privacidad mostramos únicamente la ciudad de destino y el primer nombre de quien recibe.</p>
          </div>
        </div>
      </section>

      <section className="border-t border-line-200 bg-cream-50 px-5 py-12 sm:px-8 lg:px-18">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-4">
          <p className="text-sm font-medium text-ink-700">Rastrear otro folio</p>
          <div className="max-w-2xl"><TrackingSearch /></div>
        </div>
      </section>
    </main>
    <MarketingFooter />
  </>;
}

function NotFound({ code }: { code: string }) {
  return <>
    <MarketingHeader />
    <main className="bg-cream-50 px-5 py-20 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-7 rounded-xl border border-line-300 bg-white p-8 shadow-pop sm:p-12">
        <TrackingSearch />
        <div className="flex flex-col items-center gap-5 rounded-lg bg-cream-100 px-6 py-11 text-center">
          <svg viewBox="0 0 180 120" fill="none" role="img" aria-label="Caja vacía" className="w-45">
            <polygon points="90,26 150,50 90,74 30,50" fill="#fff" stroke="#C9BFAD" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="150,50 150,84 90,108 90,74" fill="#EFE7DA" stroke="#C9BFAD" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="30,50 90,74 90,108 30,84" fill="#E7DECE" stroke="#C9BFAD" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M84 44 L96 56 M96 44 L84 56" stroke="#B3261E" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="flex max-w-md flex-col gap-2">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-[-.02em] text-navy-900">No encontramos ese folio</h1>
            <p className="text-base leading-relaxed text-ink-700">Revisa que <span className="font-semibold text-navy-900">{code}</span> esté completo y con el prefijo correcto: BX- para una caja, SH- para un envío y TR- para un camión.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/rastrear" className="inline-flex h-12 items-center rounded-lg border-[1.5px] border-navy-900 px-5 text-sm font-semibold text-navy-900">Intentar de nuevo</Link>
            <Link href="/#faq" className="inline-flex h-12 items-center px-5 text-sm font-semibold text-brand-700">Ver preguntas frecuentes</Link>
          </div>
        </div>
      </div>
    </main>
    <MarketingFooter />
  </>;
}
