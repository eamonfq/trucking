import type { Locale } from "./config";
import { translateMessage, type Catalog } from "./translate";

/** Campos de texto de un resultado de Server Action que ve la persona. */
const TEXT_FIELDS = ["error", "message", "detail", "warning", "notice"] as const;
const LIST_FIELDS = ["errors", "warnings"] as const;

/**
 * Traduce los mensajes de un resultado `{ ok, error | message … }` sin tocar el resto de datos.
 * En español devuelve el mismo objeto.
 */
export function localizeResult<T>(result: T, catalog: Catalog, locale: Locale): T {
  if (locale === "es" || !result || typeof result !== "object" || Array.isArray(result)) return result;
  const source = result as Record<string, unknown>;
  let copy: Record<string, unknown> | undefined;
  for (const field of TEXT_FIELDS) {
    const value = source[field];
    if (typeof value === "string") (copy ??= { ...source })[field] = translateMessage(catalog, locale, value);
  }
  for (const field of LIST_FIELDS) {
    const value = source[field];
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) (copy ??= { ...source })[field] = value.map((item) => translateMessage(catalog, locale, item));
  }
  return (copy ?? result) as T;
}
