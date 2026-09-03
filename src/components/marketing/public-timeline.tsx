import { getStatusLabel } from "@/lib/config/status";
import type { TimelineEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/utils/format";

/*
  Secuencia esperada por tipo de folio. Se muestran también las etapas que
  todavía no ocurren, para que el público sepa qué falta y no solo qué pasó.
*/
export const TRACKING_SEQUENCES = {
  box: ["pre-alertada", "recibida", "categorizada", "en-bodega", "cargada-en-camion", "en-transito", "en-destino", "entregada"],
  shipment: ["pendiente", "confirmado", "en-transito", "en-destino", "entregado"],
  truck: ["planificado", "cargando", "despachado", "en-frontera", "en-destino", "cerrado"],
} as const;

export type TrackingKind = keyof typeof TRACKING_SEQUENCES;

export function trackingProgress(kind: TrackingKind, status: string) {
  const sequence = TRACKING_SEQUENCES[kind];
  const index = sequence.indexOf(status as never);
  return index < 0 ? 0 : index / (sequence.length - 1);
}

export function PublicTimeline({ kind, status, events }: { kind: TrackingKind; status: string; events: TimelineEvent[] }) {
  const sequence = TRACKING_SEQUENCES[kind];
  const currentIndex = sequence.indexOf(status as never);
  const exception = currentIndex < 0;
  const steps = exception
    ? events.map((event) => ({ status: event.to, event, state: "done" as const }))
    : sequence.map((step, index) => ({
        status: step,
        event: events.findLast((item) => item.to === step),
        state: index < currentIndex ? ("done" as const) : index === currentIndex ? ("current" as const) : ("pending" as const),
      }));

  return (
    <ol className="relative flex flex-col" aria-label="Historial de la carga">
      <span aria-hidden="true" className="absolute bottom-5 left-3.5 top-3.5 w-0.5 bg-line-200" />
      {steps.map((step, index) => (
        <li key={`${step.status}-${index}`} className="relative flex gap-5.5 pb-6.5 last:pb-0">
          <span aria-hidden="true" className={`relative z-10 mt-0.5 size-7 shrink-0 rounded-full ${
            step.state === "done" ? "border-5 border-white bg-brand-600 shadow-[0_0_0_2px_#E8621C]"
              : step.state === "current" ? "border-[3px] border-brand-500 bg-white shadow-[0_0_0_6px_rgba(232,98,28,.16)]"
                : "border-2 border-line-300 bg-cream-100"
          }`} />
          <div className="flex flex-col gap-1">
            <p className={`text-base leading-tight ${step.state === "current" ? "font-bold text-brand-700" : step.state === "done" ? "font-semibold text-navy-900" : "font-medium text-ink-500"}`}>
              {getStatusLabel(step.status)}
            </p>
            <p className="text-sm text-ink-500">
              {step.event
                ? <>{formatDateTime(step.event.at)}{step.event.note ? ` · ${step.event.note}` : ""}</>
                : step.state === "pending" ? "Aún no ocurre" : step.state === "current" ? "En curso" : "Completado"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
