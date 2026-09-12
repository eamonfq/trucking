import "server-only";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminUser, requireClientUser, requireWarehouseUser } from "@/lib/auth/actions";
import { withStore, transactionConnection } from "./store";
import { deliverPendingEmails } from "@/lib/services/email";
export async function runMutation<T>(role: "admin" | "cliente" | "operador", work: () => Promise<T>): Promise<T> {
  const nested = Boolean(transactionConnection());
  class Rejected { constructor(readonly result: T) {} }
  let result: T;
  try { result = await withStore(async () => {
    if (role === "admin") await requireAdminUser(); else if (role === "operador") await requireWarehouseUser(); else await requireClientUser();
    const value = await work();
    if (!nested && value && typeof value === "object" && "ok" in value && value.ok === false) throw new Rejected(value);
    return value;
  }, true); } catch (error) { if (error instanceof Rejected) return error.result; throw error; }
  if (nested) return result;
  revalidatePath("/", "layout");
  after(deliverPendingEmails);
  return result;
}
