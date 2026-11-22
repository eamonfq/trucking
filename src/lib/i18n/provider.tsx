"use client";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import { translator, translateMessage, type Catalog } from "./translate";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Traductor de un catálogo para componentes de cliente. */
export function useT<C extends Catalog>(catalog: C) {
  const locale = useLocale();
  return useMemo(() => translator(catalog, locale), [catalog, locale]);
}

/** Traduce mensajes que llegan en tiempo de ejecución (errores del servidor, Zod). */
export function useMessageTranslator(catalog: Catalog) {
  const locale = useLocale();
  return useMemo(() => (text: string | undefined | null) => translateMessage(catalog, locale, text), [catalog, locale]);
}
