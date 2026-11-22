import "server-only";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminUser, requireClientUser, requireWarehouseUser } from "@/lib/auth/actions";
import { withStore, transactionConnection } from "./store";
import { deliverPendingEmails } from "@/lib/services/email";
import type { AdminSection } from "@/lib/auth/admin-permissions";
import { getLocale } from "@/lib/i18n/server";
import { localizeResult } from "@/lib/i18n/localize-result";
import { serverMessages } from "@/lib/i18n/messages";
export async function runMutation<T>(role: "admin" | "cliente" | "operador" | `admin:${string}`, work: () => Promise<T>): Promise<T> {
  const nested = Boolean(transactionConnection());
  class Rejected { constructor(readonly result: T) {} }
  let result: T;
  try { result = await withStore(async () => {
    if (role === "admin" || role.startsWith("admin:")) await requireAdminUser(role === "admin" ? [] : role.slice(6).split("|") as AdminSection[]); else if (role === "operador") await requireWarehouseUser(); else await requireClientUser();
    const value = await work();
    if (!nested && value && typeof value === "object" && "ok" in value && value.ok === false) throw new Rejected(value);
    return value;
  }, true); } catch (error) { if (error instanceof Rejected) return nested ? error.result : localize(error.result); throw error; }
  if (nested) return result;
  revalidatePath("/", "layout");
  after(deliverPendingEmails);
  return localize(result);
}

/** Los mensajes del resultado salen en el idioma de quien hizo la petición (docs/idiomas.md). */
async function localize<T>(result: T): Promise<T> {
  // Fuera de una petición (scripts, pruebas sin cabeceras) no hay idioma: queda en español.
  const locale = await getLocale().catch(() => "es" as const);
  return localizeResult(result, serverMessages, locale);
}
