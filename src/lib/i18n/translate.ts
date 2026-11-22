import type { Locale } from "./config";

/** Catálogo de un área: clave = texto en español, valor = texto en inglés. */
export type Catalog = Readonly<Record<string, string>>;
export type Vars = Readonly<Record<string, string | number>>;

/** Sustituye `{nombre}` por el valor de `vars`. Un marcador sin valor se deja tal cual. */
export function interpolate(text: string, vars?: Vars) {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/**
 * Traductor tipado: solo acepta textos que existen en el catálogo, así una traducción
 * faltante no compila. En español devuelve la clave tal cual.
 */
export function translator<C extends Catalog>(catalog: C, locale: Locale) {
  return (text: keyof C & string, vars?: Vars) => interpolate(locale === "en" ? (catalog[text] ?? text) : text, vars);
}
export type Translator<C extends Catalog> = ReturnType<typeof translator<C>>;

type Template = { pattern: RegExp; names: string[]; english: string };
const templateCache = new WeakMap<Catalog, Template[]>();
const escapeRegExp = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, "\\$&");

/** Las claves con `{marcadores}` se convierten en patrones, una sola vez por catálogo. */
function templatesOf(catalog: Catalog) {
  let templates = templateCache.get(catalog);
  if (!templates) {
    templates = Object.entries(catalog)
      .filter(([spanish]) => /\{\w+\}/.test(spanish))
      .map(([spanish, english]) => {
        const names: string[] = [];
        const source = spanish.split(/(\{\w+\})/).map((part) => {
          const name = /^\{(\w+)\}$/.exec(part)?.[1];
          if (!name) return escapeRegExp(part);
          names.push(name);
          return "([\\s\\S]+?)";
        }).join("");
        return { pattern: new RegExp(`^${source}$`), names, english };
      })
      // Las plantillas más largas (más texto fijo) se prueban antes que las genéricas.
      .sort((a, b) => b.pattern.source.length - a.pattern.source.length);
    templateCache.set(catalog, templates);
  }
  return templates;
}

/**
 * Para textos que llegan en tiempo de ejecución (errores de Server Actions, mensajes de Zod,
 * historial guardado en español). Busca el texto exacto y, si no está, una clave con
 * `{marcadores}` que coincida: «La caja {code} ya está cargada.» traduce «La caja BX-1 ya está cargada.».
 * Los valores capturados también se traducen si están en el catálogo (p. ej. un estado).
 * Si nada coincide, se devuelve el original en español.
 */
export function translateMessage(catalog: Catalog, locale: Locale, text: string | undefined | null): string {
  if (!text) return text ?? "";
  if (locale !== "en") return text;
  const exact = catalog[text];
  if (exact !== undefined) return exact;
  for (const template of templatesOf(catalog)) {
    const match = template.pattern.exec(text);
    if (!match) continue;
    const vars = Object.fromEntries(template.names.map((name, index) => [name, catalog[match[index + 1]!] ?? match[index + 1]!]));
    return interpolate(template.english, vars);
  }
  return text;
}

/**
 * Para notas compuestas guardadas en español (historial): si el texto completo no está en el
 * catálogo, traduce cada frase por separado («Carga personalizada. Precio acordado USD 50. Peso no
 * registrado.»), cortando en «. » y « · ». Las frases que no estén se quedan en español.
 */
export function translateSegments(catalog: Catalog, locale: Locale, text: string | undefined | null): string {
  if (!text || locale !== "en") return text ?? "";
  const whole = translateMessage(catalog, locale, text);
  if (whole !== text) return whole;
  return text.split(/(\. | · )/).map((part, index) => {
    if (index % 2 === 1 || !part) return part;
    const translated = translateMessage(catalog, locale, part);
    if (translated !== part || !part.endsWith(".")) return translated;
    return `${translateMessage(catalog, locale, part.slice(0, -1))}.`;
  }).join("");
}

/**
 * Texto en los dos idiomas, para documentos que cruzan la frontera (etiqueta, manifiesto):
 * «Envía:» → «Envía / Sender:», «Peso» → «Peso / Weight». Si el inglés es igual, va una vez.
 */
export function bilingual<C extends Catalog>(catalog: C, text: keyof C & string, vars?: Vars) {
  const es = interpolate(text, vars), en = interpolate(catalog[text] ?? text, vars);
  if (es === en) return es;
  if (es.endsWith(":") && en.endsWith(":")) return `${es.slice(0, -1)} / ${en}`;
  return `${es}${es.includes(" / ") ? " · " : " / "}${en}`;
}
