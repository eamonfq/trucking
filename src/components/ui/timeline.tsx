import { Check, Circle } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";
import { getStatusLabel } from "@/lib/config/status";
import { formatDate } from "@/lib/utils/format";

export function Timeline({ events, currentIndex = events.length - 1 }: { events: TimelineEvent[]; currentIndex?: number }) {
  if (events.length === 0) return <p className="text-sm text-navy-500">Aún no hay movimientos registrados.</p>;
  return (
    <ol className="grid" aria-label="Historial del envío">
      {events.map((event, index) => {
        const completed = index < currentIndex;
        const current = index === currentIndex;
        return (
          <li key={`${event.to}-${event.at}-${index}`} className="relative grid grid-cols-[2rem_1fr] gap-3 pb-7 last:pb-0">
            {index < events.length - 1 && <span aria-hidden="true" className="absolute left-[15px] top-8 h-[calc(100%-1rem)] w-px bg-stone-200" />}
            <span className={`relative z-10 grid size-8 place-items-center rounded-full border-2 ${completed ? "border-success-700 bg-success-700 text-white" : current ? "border-orange-500 bg-orange-50 text-orange-600" : "border-stone-200 bg-white text-navy-400"}`}>
              {completed ? <Check className="size-4" aria-hidden="true" /> : <Circle className="size-3" fill="currentColor" aria-hidden="true" />}
            </span>
            <div className="pt-1"><div className="flex flex-wrap items-baseline justify-between gap-2"><p className="text-sm font-bold text-navy-900">{getStatusLabel(event.to)}</p><time className="text-xs text-navy-500">{formatDate(event.at)}</time></div><p className="mt-1 text-sm text-navy-500">{event.actor}{event.note ? ` · ${event.note}` : ""}</p></div>
          </li>
        );
      })}
    </ol>
  );
}
