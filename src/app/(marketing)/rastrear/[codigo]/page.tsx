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
import { publicPages } from "@/lib/i18n/catalogs/public-pages";
import { getLocale } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/translate";

export default async function TrackingDetailPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const [result, locale] = await Promise.all([trackByCode(codigo), getLocale()]);
  const t = translator(publicPages, locale);
  if (!result) return <NotFound code={decodeURIComponent(codigo)} t={t} />;

  const item = result.item;
  const kind: TrackingKind = result.type;
  const progress = trackingProgress(kind, item.status);
  const lastEvent = item.timeline.at(-1);
  const destination = result.type === "box" ? result.destinationCity : result.type === "shipment" ? result.item.destinationCity : result.item.destinationCity;
  const status = getStatusLabel(item.status, locale);
  // Sin ciudad de destino solo se muestra el estado (antes decía «… en bodega Miami», que no es la ruta real).
  const headline = result.type === "truck"
    ? t("Guía máster {status}.", { status: status.toLowerCase() })
    : destination
      ? t("{status} hacia {destination}.", { status, destination })
      : t("{status}.", { status });
  const summary = result.type === "shipment"
    ? (result.boxes.length === 1 ? t("Envío {code} · {count} caja", { code: item.code, count: 1 }) : t("Envío {code} · {count} cajas", { code: item.code, count: result.boxes.length }))
    : result.type === "box"
      ? t("Caja {code} · {category}", { code: item.code, category: result.item.categoryName ?? getBoxCategory(result.item.categoryId)?.name ?? result.item.categoryId })
      : t("Camión {code} · {count} cajas", { code: item.code, count: result.item.boxIds.length });

  return <>
    <MarketingHeader />
    <main>
      <section className="bg-cream-100 px-5 py-14 sm:px-8 lg:px-18">
        <div className="mx-auto grid max-w-[90rem] items-end gap-12 lg:grid-cols-[1fr_23.75rem]">
          <div className="flex flex-col gap-4">
            <p className="text-over font-semibold uppercase text-label-600">{summary}</p>
            <h1 className="font-display text-[2.5rem] font-extrabold leading-[.96] tracking-[-.04em] text-navy-900 sm:text-[4rem]">{headline}</h1>
            <div className="flex flex-wrap items-center gap-3.5">
              <span className="rounded-full bg-brand-700 px-3.5 py-2.5 text-over font-semibold uppercase tracking-[.1em] text-white">{status}</span>
              {lastEvent && <span className="text-base text-ink-700">{t("Última actualización: {date}", { date: formatDateTime(lastEvent.at, locale) })}</span>}
            </div>
          </div>
          <div className="flex flex-col gap-3.5 rounded-lg border border-line-300 bg-white p-6.5">
            <p className="text-[.6875rem] font-semibold uppercase tracking-[.14em] text-label-600">{t("Entrega estimada")}</p>
            <p className="pending-data w-fit rounded-md px-2.5 py-1.5 font-display text-3xl font-extrabold leading-none text-ink-500">{t("— de mes")}</p>
            <p className="text-sm leading-6 text-ink-500">{destination ? <>{t("Destino: {destination}.", { destination })}<br /></> : null}{t("Fecha por confirmar con operaciones.")}</p>
          </div>
        </div>
      </section>

      <section className="bg-white px-5 py-14 sm:px-8 lg:px-18">
        <div className="mx-auto grid max-w-[90rem] items-start gap-14 lg:grid-cols-[1fr_32.5rem]">
          <div className="flex flex-col gap-7">
            <h2 className="font-display text-3xl font-bold tracking-[-.02em] text-navy-900">{result.type === "truck" ? t("Historial del camión") : result.type === "shipment" ? t("Historial del envío") : t("Historial de la caja")}</h2>
            <PublicTimeline kind={kind} status={item.status} events={item.timeline} locale={locale} />
          </div>
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-xl bg-navy-900"><RouteMap progress={progress} /></div>
            {result.type === "shipment" && <div className="rounded-xl border border-line-300 bg-cream-50 p-6">
              <h3 className="font-display text-h2 font-semibold text-navy-900">{t("Cajas en este envío")}</h3>
              <ul className="mt-4 grid gap-2.5">{result.boxes.map((box) => <li key={box.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-4 py-3">
                <span className="text-sm font-semibold text-navy-900">{box.code} <span className="font-normal text-ink-500">{box.categoryName ?? getBoxCategory(box.categoryId)?.name ?? box.categoryId}</span></span>
                <span className="text-xs font-medium text-brand-700">{getStatusLabel(box.status, locale)}</span>
              </li>)}</ul>
              <p className="mt-4 text-sm leading-6 text-ink-500">{t("Recibe {name}.", { name: result.recipientFirstName })}</p>
            </div>}
            <p className="rounded-xl bg-cream-100 p-5 text-sm leading-6 text-ink-700">{t("Por privacidad mostramos únicamente la ciudad de destino y el primer nombre de quien recibe.")}</p>
          </div>
        </div>
      </section>

      <section className="border-t border-line-200 bg-cream-50 px-5 py-12 sm:px-8 lg:px-18">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-4">
          <p className="text-sm font-medium text-ink-700">{t("Rastrear otro folio")}</p>
          <div className="max-w-2xl"><TrackingSearch /></div>
        </div>
      </section>
    </main>
    <MarketingFooter />
  </>;
}

function NotFound({ code, t }: { code: string; t: ReturnType<typeof translator<typeof publicPages>> }) {
  return <>
    <MarketingHeader />
    <main className="bg-cream-50 px-5 py-20 sm:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-7 rounded-xl border border-line-300 bg-white p-8 shadow-pop sm:p-12">
        <TrackingSearch />
        <div className="flex flex-col items-center gap-5 rounded-lg bg-cream-100 px-6 py-11 text-center">
          <svg viewBox="0 0 180 120" fill="none" role="img" aria-label={t("Caja vacía")} className="w-45">
            <polygon points="90,26 150,50 90,74 30,50" fill="#fff" stroke="#C9BFAD" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="150,50 150,84 90,108 90,74" fill="#EFE7DA" stroke="#C9BFAD" strokeWidth="2.5" strokeLinejoin="round" />
            <polygon points="30,50 90,74 90,108 30,84" fill="#E7DECE" stroke="#C9BFAD" strokeWidth="2.5" strokeLinejoin="round" />
            <path d="M84 44 L96 56 M96 44 L84 56" stroke="#B3261E" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div className="flex max-w-md flex-col gap-2">
            <h1 className="font-display text-3xl font-bold leading-tight tracking-[-.02em] text-navy-900">{t("No encontramos ese folio")}</h1>
            <p className="text-base leading-relaxed text-ink-700">{t("Revisa que {code} esté completo y con el prefijo correcto: BX- para una caja, SH- para un envío y TR- para un camión.", { code })}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/rastrear" className="inline-flex h-12 items-center rounded-lg border-[1.5px] border-navy-900 px-5 text-sm font-semibold text-navy-900">{t("Intentar de nuevo")}</Link>
            <Link href="/#faq" className="inline-flex h-12 items-center px-5 text-sm font-semibold text-brand-700">{t("Ver preguntas frecuentes")}</Link>
          </div>
        </div>
      </div>
    </main>
    <MarketingFooter />
  </>;
}
