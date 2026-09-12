import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import type { Role } from "@/lib/types";
import { randomToken, tokenHash } from "./crypto";
import { sql } from "./repository";
export const SESSION_COOKIE = "ayl_session";
export type SessionPayload = { userId: string; role: Role; expiresAt: number };
export const sessionCookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };
export async function createSessionToken(userId: string, role: Role, remember = false) {
  const token = randomToken();
  const duration = remember ? 30 * 86400 : 8 * 3600;
  await sql().execute("INSERT INTO sessions(token_hash,user_id,expires_at) SELECT ?,user_id,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND) FROM accounts WHERE user_id=? AND role=? AND active=1 AND verified_at IS NOT NULL", [tokenHash(token), duration, userId, role]);
  return token;
}
export async function verifySessionToken(token?: string): Promise<SessionPayload | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [rows] = await sql().execute<RowDataPacket[]>("SELECT s.user_id,a.role,s.expires_at FROM sessions s JOIN accounts a ON a.user_id=s.user_id WHERE s.token_hash=? AND s.expires_at>UTC_TIMESTAMP(3) AND a.active=1 AND a.verified_at IS NOT NULL", [tokenHash(token)]);
  const row = rows[0];
  return row ? { userId: row.user_id, role: row.role, expiresAt: Math.floor(new Date(row.expires_at).getTime()/1000) } : null;
}
export async function deleteSession(token?: string) { if (token) await sql().execute("DELETE FROM sessions WHERE token_hash=?", [tokenHash(token)]); }
