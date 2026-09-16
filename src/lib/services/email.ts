import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import type { RowDataPacket } from "mysql2/promise";
import { sql } from "@/lib/auth/repository";
import { pool } from "@/lib/db/pool";
import { renderEmail, type EmailInput } from "./email-template";
export function siteUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("El sitio público requiere HTTPS");
  return url.origin;
}
function key() { if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) throw new Error("AUTH_SECRET debe tener al menos 32 caracteres"); return createHash("sha256").update(process.env.AUTH_SECRET).digest(); }
function encrypt(value: unknown) { const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", key(), iv); const data = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]); return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") }; }
export function decryptEmail(value: { iv: string; tag: string; data: string }): EmailInput {
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(value.iv, "base64")); decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(value.data, "base64")), decipher.final()]).toString());
}
const emailBatch = new AsyncLocalStorage<boolean>();
// Only the caller's async operation is consolidated, never concurrent requests.
export async function withConsolidatedEmail<T>(work:()=>Promise<T>, summary:(result:T)=>EmailInput|undefined){
  const result=await emailBatch.run(true,work);
  const message=summary(result);
  if(message)await sendEmail(message);
  return result;
}
export async function sendEmail(input: EmailInput) {
  const id = crypto.randomUUID();
  if(emailBatch.getStore())return {status:"consolidated" as const,id};
  await sql().execute("INSERT INTO email_outbox(id,payload) VALUES (?,?)", [id, JSON.stringify(encrypt(input))]);
  return { status: "queued" as const, id };
}
export async function deliverPendingEmails() {
  if (process.env.EMAIL_DELIVERY !== "resend" || !process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return;
  const connection = await pool().getConnection();
  try {
    const [lock] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('ayl_email_worker',0) AS acquired");
    if (!lock[0].acquired) return;
    await connection.execute("UPDATE email_outbox SET status='failed',last_error='Delivery window expired; request a new notification',payload=JSON_OBJECT() WHERE status IN ('queued','retry') AND created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 23 HOUR)");
    const [rows] = await connection.query<RowDataPacket[]>("SELECT * FROM email_outbox WHERE status IN ('queued','retry') AND available_at<=UTC_TIMESTAMP(3) AND attempts<5 ORDER BY created_at LIMIT 20");
    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const row of rows) {
      try {
        const input = decryptEmail(typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload);
        if (input.expiresAt && (!Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now())) {
          await connection.execute("UPDATE email_outbox SET status='failed',last_error='Link expired; request a new email',payload=JSON_OBJECT() WHERE id=?", [row.id]);
          continue;
        }
        const rendered = renderEmail(input, siteUrl());
        const result = await resend.emails.send({ from: process.env.RESEND_FROM_EMAIL, to: input.to, subject: input.subject, ...rendered }, { idempotencyKey: `ayl/${row.id}` });
        if (result.error) throw new Error(result.error.name);
        await connection.execute("UPDATE email_outbox SET status='sent',provider_id=?,attempts=attempts+1,last_error=NULL,payload=JSON_OBJECT() WHERE id=?", [result.data!.id, row.id]);
      } catch {
        await connection.execute("UPDATE email_outbox SET status=IF(attempts>=4,'failed','retry'),attempts=attempts+1,last_error='Delivery failed; check provider configuration',available_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND) WHERE id=?", [Math.min(3600, 60 * 2 ** row.attempts), row.id]);
      }
    }
  } finally { await connection.query("SELECT RELEASE_LOCK('ayl_email_worker')"); connection.release(); }
}
