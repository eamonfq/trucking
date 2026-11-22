import { DEFAULT_LOCALE, type Locale } from "./config";

/**
 * Idioma en que se escribe a una persona (correos, push, avisos, factura y recibo):
 * su preferencia guardada o, si no tiene, español.
 */
export function userLocale(user?: { preferredLocale?: Locale } | null): Locale {
  return user?.preferredLocale ?? DEFAULT_LOCALE;
}
