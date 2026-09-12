import "server-only";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { pool } from "@/lib/db/pool";
import { transactionConnection, withStore } from "@/lib/db/store";
import { users, addresses } from "@/lib/db/collections";
import { checkPassword, hashPassword, randomToken, tokenHash } from "./crypto";
import type { User, Address } from "@/lib/types";
export const sql = () => transactionConnection() ?? pool();
export type Account = RowDataPacket & { user_id: string; email: string; locker_code: string; password_hash: string; role: User["role"]; active: number; verified_at: Date | null };
export async function findAccount(identifier: string) {
  const [rows] = await sql().execute<Account[]>("SELECT * FROM accounts WHERE email=? OR locker_code=? LIMIT 1", [identifier.trim().toLowerCase(), identifier.trim().toUpperCase()]);
  return rows[0] ?? null;
}
export async function accountById(id: string) {
  const [rows] = await sql().execute<Account[]>("SELECT * FROM accounts WHERE user_id=?", [id]);
  return rows[0] ?? null;
}
export async function audit(userId: string | null, event: string) { await sql().execute("INSERT INTO security_audit(user_id,event_type) VALUES (?,?)", [userId, event]); }
export async function allowAttempt(key: string, limit = 8, seconds = 900) {
  const hash = tokenHash(key);
  await pool().execute("INSERT INTO rate_limits(bucket_hash,attempts,expires_at) VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE attempts=IF(expires_at<UTC_TIMESTAMP(3),1,attempts+1), expires_at=IF(expires_at<UTC_TIMESTAMP(3),VALUES(expires_at),expires_at)", [hash, seconds]);
  const [rows] = await pool().execute<RowDataPacket[]>("SELECT attempts FROM rate_limits WHERE bucket_hash=?", [hash]);
  return rows[0].attempts <= limit;
}
export async function revokeSessions(id: string) { await sql().execute("DELETE FROM sessions WHERE user_id=?", [id]); }
export async function setPassword(id: string, password: string) {
  await sql().execute("UPDATE accounts SET password_hash=? WHERE user_id=?", [await hashPassword(password), id]);
  await revokeSessions(id);
  await sql().execute("UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND consumed_at IS NULL AND purpose IN ('reset','invite')", [id]);
  await audit(id, "password.changed");
}
export async function validatePassword(id: string, password: string) { const account = await accountById(id); return account ? checkPassword(password, account.password_hash) : false; }
export type NewCustomer = Pick<User, "firstName" | "paternalLastName" | "maternalLastName" | "email" | "phone" | "rfc"> & Omit<Address, "id" | "userId" | "label">;
export async function createAccount(data: NewCustomer, password: string) {
  const id = `usr-${crypto.randomUUID()}`;
  const email = data.email.trim().toLowerCase();
  const [insert] = await sql().execute<ResultSetHeader>("INSERT INTO accounts(user_id,email,password_hash) VALUES (?,?,?)", [id, email, await hashPassword(password)]);
  let sequence = insert.insertId;
  let lockerCode = `AL-MX-${String(sequence).padStart(4, "0")}`;
  while (users.some(user => user.lockerCode === lockerCode)) lockerCode = `AL-MX-${String(++sequence).padStart(4, "0")}`;
  await sql().execute("UPDATE accounts SET locker_code=? WHERE user_id=?", [lockerCode, id]);
  const user: User = { id, role: "cliente", firstName: data.firstName, paternalLastName: data.paternalLastName, maternalLastName: data.maternalLastName, email, phone: data.phone, lockerCode, rfc: data.rfc, active: true, internalNotes: [], activity: [{ id: crypto.randomUUID(), type: "alta", description: "Cuenta creada. Verificación de correo pendiente.", actor: "Sistema", at: new Date().toISOString() }] };
  const address: Address = { id: `addr-${crypto.randomUUID()}`, userId: id, label: "Principal", street: data.street, exteriorNumber: data.exteriorNumber, interiorNumber: data.interiorNumber, neighborhood: data.neighborhood, postalCode: data.postalCode, municipality: data.municipality, state: data.state, references: data.references };
  users.push(user); addresses.push(address);
  await audit(id, "account.created");
  return { user, address };
}
export async function issueToken(userId: string, purpose: "verify" | "reset" | "invite") {
  const token = randomToken();
  await sql().execute("UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND purpose=? AND consumed_at IS NULL", [userId, purpose]);
  await sql().execute("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND))", [tokenHash(token), userId, purpose, purpose === "reset" ? 1800 : 86400]);
  return token;
}
export async function consumeToken(token: string, purpose: "verify" | "reset", password?: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return withStore(async () => {
    const [rows] = await sql().execute<RowDataPacket[]>("SELECT * FROM auth_tokens WHERE token_hash=? AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(3) FOR UPDATE", [tokenHash(token)]);
    const record = rows[0];
    if (!record || (record.purpose !== purpose && !(purpose === "reset" && record.purpose === "invite"))) return null;
    const account = await accountById(record.user_id);
    if (!account?.active) return null;
    if (purpose === "reset") { if (!password) return null; await setPassword(account.user_id, password); }
    if (purpose === "verify" || record.purpose === "invite") await sql().execute("UPDATE accounts SET verified_at=COALESCE(verified_at,UTC_TIMESTAMP(3)) WHERE user_id=?", [account.user_id]);
    await sql().execute("UPDATE auth_tokens SET consumed_at=UTC_TIMESTAMP(3) WHERE token_hash=?", [tokenHash(token)]);
    await audit(account.user_id, `${purpose}.completed`);
    return users.find(user => user.id === account.user_id) ?? null;
  }, true);
}
export async function synchronizeAccount(user: User) {
  const account = await accountById(user.id);
  const changedEmail = account?.email !== user.email;
  await sql().execute("UPDATE accounts SET email=?,locker_code=?,active=?,verified_at=IF(?,NULL,verified_at) WHERE user_id=?", [user.email, user.lockerCode, user.active, changedEmail, user.id]);
  if (!user.active || changedEmail) await revokeSessions(user.id);
}
