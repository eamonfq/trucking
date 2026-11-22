"use client";
/**
 * Piezas pequeñas que toman el idioma del contexto. Sirven dentro de componentes compartidos que
 * también se usan desde componentes de servidor (no pueden llamar a `useT` ni recibir `locale`).
 * En una página o componente propio, usa `getT` / `useT` directamente.
 */
import { getStatusLabel } from "@/lib/config/status";
import { history } from "@/lib/i18n/catalogs/history";
import { ui } from "@/lib/i18n/catalogs/ui";
import { useLocale, useT } from "@/lib/i18n/provider";
import { translateSegments, type Vars } from "@/lib/i18n/translate";
import { formatDate, formatDateTime } from "@/lib/utils/format";

export function UiText({ text, vars }: { text: keyof typeof ui; vars?: Vars }) {
  return useT(ui)(text, vars);
}
/** `<ol>` con la etiqueta accesible «Historial del envío» traducida. */
export function TimelineList({ children }: { children: React.ReactNode }) {
  return <ol className="grid" aria-label={useT(ui)("Historial del envío")}>{children}</ol>;
}
export function LocalDate({ value }: { value: string | Date }) {
  return formatDate(value, useLocale());
}
export function LocalDateTime({ value }: { value: string | Date }) {
  return formatDateTime(value, useLocale());
}
export function StatusLabel({ status }: { status: string }) {
  return getStatusLabel(status, useLocale());
}
/** Nota o autor guardado en español en el historial (`catalogs/history.ts`). */
export function HistoryText({ text }: { text: string }) {
  return translateSegments(history, useLocale(), text);
}
