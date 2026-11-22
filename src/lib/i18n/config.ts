/** Idiomas del sitio. El español es la fuente de verdad: los textos en español son las claves de los catálogos. */
export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "es";
/** Elección explícita del usuario en este navegador (selector ES | EN). */
export const LOCALE_COOKIE = "ayl_lang";
export const LOCALE_COOKIE_MAX_AGE = 365 * 86400;
export const isLocale = (value: unknown): value is Locale => value === "es" || value === "en";
/** Etiqueta BCP 47 para `<html lang>` e `Intl`. */
export const LANGUAGE_TAG: Record<Locale, string> = { es: "es-MX", en: "en-US" };
export const LOCALE_NAMES: Record<Locale, string> = { es: "Español", en: "English" };
