"use server";

import { cookies } from "next/headers";
import { demoCredentials, users } from "@/lib/data/users";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifySessionToken } from "@/lib/auth/session";
import { simulateLatency } from "@/lib/services/delay";

export async function authenticate(identifier: string, password: string) {
  await simulateLatency();
  const credential = demoCredentials.find(
    (item) => item.identifier.toLowerCase() === identifier.trim().toLowerCase() && item.password === password,
  );
  if (!credential) return { ok: false as const, message: "No pudimos iniciar sesión con esos datos." };
  const user = users.find((item) => item.id === credential.userId);
  if (!user) return { ok: false as const, message: "No pudimos iniciar sesión con esos datos." };
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
