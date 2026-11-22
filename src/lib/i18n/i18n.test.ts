import { describe, expect, it } from "vitest";
import { localeFromAcceptLanguage, resolveLocale } from "./negotiate";
import { interpolate, translateMessage, translator } from "./translate";
import { authMessages } from "./catalogs/auth";
import { home } from "./catalogs/home";
import { publicPages } from "./catalogs/public-pages";
import { localizeResult } from "./localize-result";
import { getFlowGuide, type GuideTrack } from "@/lib/domain/flow-guide";
import { DEFAULT_FLOW_CONFIG, type FlowConfig } from "@/lib/config/flow";
import { STATUS_CONFIG, getStatusLabel } from "@/lib/config/status";
import { faqs } from "@/lib/data/faqs";
import { formatDate } from "@/lib/utils/format";

// Todos los catálogos (`catalogs/**`, `messages/**`): cada objeto exportado se revisa sin tener que listarlo aquí.
const modules = import.meta.glob(["./catalogs/**/*.ts", "./messages/**/*.ts", "!./messages/index.ts", "!./catalogs/fields.ts"], { eager: true }) as Record<string, Record<string, unknown>>;
const CATALOGS = Object.fromEntries(Object.entries(modules).flatMap(([path, exports]) => Object.entries(exports)
  .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
  .map(([name, value]) => [`${path.replace(/^\.\//, "")}#${name}`, value])));
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
// Nombres propios que conservan su ortografía en inglés.
const PROPER_NAMES = /Juárez|Querétaro/g;

describe("language detection", () => {
  it("reads Accept-Language with weights and regional variants", () => {
    expect(localeFromAcceptLanguage("en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(localeFromAcceptLanguage("es-419,es;q=0.9,en;q=0.8")).toBe("es");
    expect(localeFromAcceptLanguage("fr-FR,fr;q=0.9,en;q=0.5,es;q=0.7")).toBe("es");
    expect(localeFromAcceptLanguage("fr-FR,de;q=0.8")).toBeUndefined();
    expect(localeFromAcceptLanguage("en;q=0,es")).toBe("es");
    expect(localeFromAcceptLanguage("")).toBeUndefined();
    expect(localeFromAcceptLanguage(null)).toBeUndefined();
  });

  it("prefers the saved choice, then the browser, then Spanish", () => {
    expect(resolveLocale({ cookie: "en", acceptLanguage: "es-MX" })).toBe("en");
    expect(resolveLocale({ cookie: "es", acceptLanguage: "en-US" })).toBe("es");
    expect(resolveLocale({ cookie: "fr", acceptLanguage: "en-US" })).toBe("en");
    expect(resolveLocale({ cookie: undefined, acceptLanguage: "de-DE" })).toBe("es");
    expect(resolveLocale({})).toBe("es");
  });
});

describe("translator", () => {
  it("returns the Spanish key in Spanish and the catalog value in English, with variables", () => {
    const es = translator(publicPages, "es"), en = translator(publicPages, "en");
    expect(es("Destino: {destination}.", { destination: "Juárez" })).toBe("Destino: Juárez.");
    expect(en("Destino: {destination}.", { destination: "Juárez" })).toBe("Destination: Juárez.");
    expect(interpolate("{a} y {b}", { a: 1 })).toBe("1 y {b}");
  });

  it("translates runtime messages and falls back to the original text", () => {
    expect(translateMessage(authMessages, "en", "Escribe un correo válido.")).toBe("Enter a valid email.");
    expect(translateMessage(authMessages, "en", "Mensaje sin traducción")).toBe("Mensaje sin traducción");
    expect(translateMessage(authMessages, "es", "Escribe un correo válido.")).toBe("Escribe un correo válido.");
    expect(translateMessage(authMessages, "en", undefined)).toBe("");
  });

  it("matches runtime messages against {placeholder} keys", () => {
    const catalog = { "La caja {code} ya está cargada.": "Box {code} is already loaded.", "Estado: {status}.": "Status: {status}.", "En bodega": "At warehouse" };
    expect(translateMessage(catalog, "en", "La caja BX-260230 ya está cargada.")).toBe("Box BX-260230 is already loaded.");
    // Los valores capturados también se traducen si están en el catálogo.
    expect(translateMessage(catalog, "en", "Estado: En bodega.")).toBe("Status: At warehouse.");
    expect(translateMessage(catalog, "en", "La caja BX-1 ya salió.")).toBe("La caja BX-1 ya salió.");
    expect(translateMessage(catalog, "es", "La caja BX-1 ya está cargada.")).toBe("La caja BX-1 ya está cargada.");
  });

  it("translates the messages of a Server Action result and keeps the data", () => {
    const result = { ok: false, error: "Escribe un correo válido.", box: { code: "BX-1" } };
    expect(localizeResult(result, authMessages, "en")).toEqual({ ok: false, error: "Enter a valid email.", box: { code: "BX-1" } });
    expect(localizeResult(result, authMessages, "es")).toBe(result);
    expect(localizeResult({ ok: true, warnings: ["Escribe un correo válido."] }, authMessages, "en")).toEqual({ ok: true, warnings: ["Enter a valid email."] });
  });
});

describe("catalogs", () => {
  for (const [name, catalog] of Object.entries(CATALOGS)) {
    it(`${name}: every entry is translated and keeps its {placeholders}`, () => {
      for (const [spanish, english] of Object.entries(catalog as Record<string, string>)) {
        expect(english.trim(), spanish).not.toBe("");
        expect(placeholders(english), spanish).toEqual(placeholders(spanish));
        // Un valor en inglés con letras propias del español suele ser una traducción olvidada.
        expect(english.replace(PROPER_NAMES, ""), spanish).not.toMatch(/[áéíóúñ¿¡]/i);
      }
    });
  }

  it("translates every FAQ shown on the home page", () => {
    for (const faq of faqs) {
      expect(home[faq.question]).toBeTruthy();
      expect(home[faq.answer]).toBeTruthy();
    }
  });

  it("has an English label for every status", () => {
    for (const status of Object.keys(STATUS_CONFIG)) expect(getStatusLabel(status, "en")).not.toBe(getStatusLabel(status, "es"));
  });
});

describe("flow guide", () => {
  const variants: FlowConfig[] = [
    DEFAULT_FLOW_CONFIG,
    { ...DEFAULT_FLOW_CONFIG, originMode: "entrega-directa", billingMoment: "al-recibir", deliveryMode: "sucursal", excessPolicy: "rechazo" },
    { ...DEFAULT_FLOW_CONFIG, deliveryMode: "domicilio" },
  ];
  const shape = (steps: ReturnType<typeof getFlowGuide>) => steps.map(({ id, box, shipment, truck, invoice, support }) => ({ id, box, shipment, truck, invoice, support }));

  it("has the same steps and statuses in English and Spanish", () => {
    for (const flow of variants) for (const track of ["envio", "pagos", "soporte"] as GuideTrack[]) {
      const es = getFlowGuide(flow, track, "es"), en = getFlowGuide(flow, track, "en");
      expect(shape(en)).toEqual(shape(es));
      for (const step of en) for (const text of [step.title, step.summary, step.client, step.admin, step.system, step.guard, step.notification]) {
        expect(text).not.toMatch(/[áéíóúñ¿¡]/i);
      }
    }
  });
});

describe("formatting", () => {
  it("formats dates in the requested language", () => {
    expect(formatDate("2026-11-20T12:00:00Z", "es")).toMatch(/nov/);
    expect(formatDate("2026-11-20T12:00:00Z", "en")).toBe("Nov 20, 2026");
  });
});
