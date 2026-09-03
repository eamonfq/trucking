"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { demoCredentials, users } from "@/lib/data/users";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "@/lib/auth/session";
import { simulateLatency } from "@/lib/services/delay";
import type { ClientUser } from "@/lib/types";
import { toClientUser } from "@/lib/utils/users";

export async function authenticate(identifier: string, password: string) {
  await simulateLatency();
  const credential = demoCredentials.find(
    (item) => item.identifier.toLowerCase() === identifier.trim().toLowerCase() && item.password === password,
  );
  if (!credential) return { ok: false as const, message: "No pudimos iniciar sesión con esos datos." };
  const user = users.find((item) => item.id === credential.userId);
  if (!user) return { ok: false as const, message: "No pudimos iniciar sesión con esos datos." };
  if (!user.active) return { ok: false as const, message: "Tu cuenta está inactiva. Contacta a Operaciones A&L para recuperar el acceso." };
  const token = await createSessionToken(user.id, user.role);
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  return { ok: true as const, user };
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export async function getCurrentUser() {
  const session = await getSession();
  return users.find((user) => user.id === session?.userId) ?? null;
}

export async function requireClientUser(): Promise<ClientUser> {
  const session = await getSession();
  const user = session?.role === "cliente" ? users.find((item) => item.id === session.userId && item.active) : undefined;
  if (!user) redirect("/login?siguiente=/cliente");
  return toClientUser(user);
}
