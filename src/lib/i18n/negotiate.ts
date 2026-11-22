import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";

/** Primer idioma soportado de `Accept-Language`, respetando los pesos `q` (`en-US`→`en`, `es-419`→`es`). */
export function localeFromAcceptLanguage(header: string | null | undefined): Locale | undefined {
  if (!header) return undefined;
  const ranked = header.split(",").map((part, index) => {
    const [tag = "", ...params] = part.trim().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    const weight = q ? Number(q.slice(2)) : 1;
    return { language: tag.trim().toLowerCase().split("-")[0], weight: Number.isFinite(weight) ? weight : 0, index };
  }).filter((item) => item.weight > 0).sort((a, b) => b.weight - a.weight || a.index - b.index);
  return ranked.map((item) => item.language).find(isLocale);
}

/** Prioridad: elección guardada en la cookie > idioma del navegador > español. */
export function resolveLocale({ cookie, acceptLanguage }: { cookie?: string | null; acceptLanguage?: string | null }): Locale {
  if (isLocale(cookie)) return cookie;
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}
