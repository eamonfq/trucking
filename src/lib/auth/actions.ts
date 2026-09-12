"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { users } from "@/lib/db/collections";
import { withStore } from "@/lib/db/store";
import { createSessionToken, deleteSession, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "./session";
import { allowAttempt, findAccount, audit } from "./repository";
import { checkPassword, hashPassword } from "./crypto";
import { loginSchema } from "@/lib/schemas/auth";
import { toClientUser } from "@/lib/utils/users";
export async function requestLimit(action: string, identifier: string, limit = 8) {
  const h = await headers();
  const source = process.env.TRUST_PROXY === "true" ? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown" : "local";
  const accountAllowed = await allowAttempt(`${action}:${identifier.trim().toLowerCase()}`, limit);
  const sourceAllowed = await allowAttempt(`${action}:source:${source}`, 80);
  return accountAllowed && sourceAllowed;
}
export async function authenticate(identifier: string, password: string, remember = false) {
  const parsed = loginSchema.safeParse({ identifier, password, remember });
  const failure = { ok: false as const, message: "No pudimos iniciar sesión con esos datos. Revisa tu correo y contraseña." };
  if (!parsed.success) return failure;
  if (!await requestLimit("login", parsed.data.identifier)) return { ok: false as const, message: "Demasiados intentos. Intenta de nuevo en 15 minutos." };
  const result = await withStore(async () => {
    const account = await findAccount(parsed.data.identifier);
    const valid = account ? await checkPassword(password, account.password_hash) : (await hashPassword(password), false);
    if (!account || !valid || !account.active) { await audit(null, "login.failed"); return failure; }
    if (!account.verified_at) return { ok: false as const, message: "Confirma tu correo antes de ingresar. Puedes solicitar un nuevo enlace de verificación." };
    const user = users.find(item => item.id === account.user_id);
    if (!user) return failure;
    const token = await createSessionToken(user.id, user.role, remember);
    await audit(user.id, "login.succeeded");
    return { ok: true as const, token, user: { id: user.id, role: user.role } };
  }, true);
  if (!result.ok) return result;
  (await cookies()).set(SESSION_COOKIE, result.token, { ...sessionCookieOptions, ...(remember ? { maxAge: 30 * 86400 } : {}) });
  return { ok: true as const, user: result.user };
}
export async function signOut() {
  const cookieStore = await cookies();
  await deleteSession(cookieStore.get(SESSION_COOKIE)?.value);
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
export async function getSession() { return verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value); }
export async function getCurrentUser() {
  const session = await getSession();
  return withStore(async () => { const user = users.find(item => item.id === session?.userId && item.role === session?.role && item.active); return user ? toClientUser(user) : null; });
}
export async function requireClientUser() { const user = await getCurrentUser(); if (!user || user.role !== "cliente") redirect("/login?siguiente=/cliente"); return user; }
export async function requireAdminUser() { const user = await getCurrentUser(); if (!user || user.role !== "admin") redirect("/login?siguiente=/admin"); return user; }
export async function requireWarehouseUser() { const user = await getCurrentUser(); if (!user || !["admin","operador"].includes(user.role)) redirect("/login?siguiente=/almacen"); return user; }
