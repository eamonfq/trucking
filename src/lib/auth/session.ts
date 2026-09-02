import type { Role } from "@/lib/types";

export const SESSION_COOKIE = "ayl_demo_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  userId: string;
  role: Role;
  expiresAt: number;
};

const secret = process.env.AUTH_SECRET ?? "demo-only-change-this-secret-before-production";

const encode = (value: string) => Buffer.from(value).toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

async function signature(payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(signed).toString("base64url");
}

export async function createSessionToken(userId: string, role: Role) {
  const payload: SessionPayload = {
    userId,
    role,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encoded = encode(JSON.stringify(payload));
  return `${encoded}.${await signature(encoded)}`;
}

export async function verifySessionToken(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encoded, suppliedSignature] = token.split(".");
  if (!encoded || !suppliedSignature || (await signature(encoded)) !== suppliedSignature) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as SessionPayload;
    return payload.expiresAt > Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
