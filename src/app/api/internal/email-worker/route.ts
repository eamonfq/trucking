import { createHmac, timingSafeEqual } from "node:crypto";
import { deliverPendingEmails } from "@/lib/services/email";
import {deliverPendingPush} from '@/lib/services/push';
export async function POST(request: Request) {
  if (!process.env.AUTH_SECRET) return new Response(null, { status: 503 });
  const expected = createHmac("sha256", process.env.AUTH_SECRET).update("ayl-email-worker").digest("hex");
  const supplied = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return new Response(null, { status: 401 });
  await deliverPendingEmails();
  await deliverPendingPush();
  return Response.json({ processed: true });
}
