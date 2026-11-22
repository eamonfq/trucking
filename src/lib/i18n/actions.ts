"use server";
import { getSession } from "@/lib/auth/actions";
import { withStore } from "@/lib/db/store";
import { users } from "@/lib/db/collections";
import { isLocale } from "./config";
import { writeLocaleCookie } from "./server";

/** Selector ES | EN: lo recuerda en este navegador y, con sesión, como preferencia del usuario (correos y documentos). */
export async function setLocale(locale: unknown) {
  if (!isLocale(locale)) return { ok: false as const };
  await writeLocaleCookie(locale);
  const session = await getSession();
  if (session) {
    await withStore(async () => {
      const user = users.find((item) => item.id === session.userId && item.role === session.role);
      if (user && user.preferredLocale !== locale) user.preferredLocale = locale;
    }, true);
  }
  return { ok: true as const, locale };
}
