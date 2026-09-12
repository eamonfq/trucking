import { Resend } from "resend";
import { pool } from "@/lib/db/pool";
import type { ResultSetHeader } from "mysql2/promise";
export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook not configured" }, { status: 503 });
  const payload = await request.text();
  if (payload.length > 100000) return new Response(null, { status: 413 });
  let event;
  try {
    event = new Resend(process.env.RESEND_API_KEY ?? "unused").webhooks.verify({ payload, headers: { id: request.headers.get("svix-id") ?? "", timestamp: request.headers.get("svix-timestamp") ?? "", signature: request.headers.get("svix-signature") ?? "" }, webhookSecret: secret });
  } catch { return Response.json({ error: "Invalid signature" }, { status: 400 }); }
  if (!("email_id" in event.data)) return Response.json({ received: true });
  const connection = await pool().getConnection();
  try {
    await connection.beginTransaction();
    const [insert] = await connection.execute<ResultSetHeader>("INSERT IGNORE INTO email_events(event_id,provider_id,event_type,occurred_at) VALUES (?,?,?,?)", [request.headers.get("svix-id"), event.data.email_id, event.type, new Date(event.created_at)]);
    if (insert.affectedRows && ["email.delivered", "email.bounced", "email.complained", "email.failed"].includes(event.type)) {
      // Do not let a delayed delivery event erase a bounce or complaint.
      await connection.execute("UPDATE email_outbox SET status=? WHERE provider_id=? AND (status NOT IN ('bounced','complained') OR ? IN ('bounced','complained'))", [event.type.slice(6), event.data.email_id, event.type.slice(6)]);
    }
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  return Response.json({ received: true });
}
