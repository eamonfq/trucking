import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";
import { resolveLocale } from "./negotiate";
import { translator, translateMessage, type Catalog } from "./translate";

/** Idioma de la petición actual (Server Components, Server Actions y Route Handlers). */
export const getLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return resolveLocale({ cookie: cookieStore.get(LOCALE_COOKIE)?.value, acceptLanguage: headerStore.get("accept-language") });
});

export async function getT<C extends Catalog>(catalog: C) {
  return translator(catalog, await getLocale());
}

export async function getMessageTranslator(catalog: Catalog) {
  const locale = await getLocale();
  return (text: string | undefined | null) => translateMessage(catalog, locale, text);
}

export async function writeLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: LOCALE_COOKIE_MAX_AGE });
}
