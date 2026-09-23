import { getSession } from "@/lib/auth/actions";
import { decryptEmail, siteUrl } from "@/lib/services/email";
import { renderEmail, type EmailInput } from "@/lib/services/email-template";
import { pool } from "@/lib/db/pool";
import type { RowDataPacket } from "mysql2/promise";
export async function GET(request: Request) {
  if ((await getSession())?.role !== "admin") return new Response(null, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  let input: EmailInput;
  if (id) {
    if (process.env.NODE_ENV === "production" || process.env.EMAIL_DELIVERY !== "preview") return new Response(null, { status: 404 });
    const [rows] = await pool().execute<RowDataPacket[]>("SELECT payload FROM email_outbox WHERE id=? AND status='queued'", [id]);
    if (!rows[0]) return new Response(null, { status: 404 });
    input = decryptEmail(typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload);
  } else {
    const heading = ({verify:"Un paso más. Todo listo para comenzar.",welcome:"Tu casillero está activo.",reset:"Volvamos a conectar.",changed:"Tu acceso está protegido.",invite:"Bienvenido a tu nueva ruta.",invoice:"Tu factura está disponible.",reception:"Tu caja ya está en bodega.",payment:"Tu pago está en revisión.",delivery:"Tu caja llegó a sus manos.",support:"Estamos para ayudarte."} as Record<string,string>)[params.get("template") ?? "verify"] ?? "Tu cuenta A&L";
    input = {to:"preview@example.invalid",subject:heading,heading,body:"Hola. Esta es una vista previa de la identidad visual de nuestros correos: mensajes claros, enlaces personales y el respaldo de A&L en cada paso.",actionLabel:"Continuar a mi cuenta",actionUrl:`${siteUrl()}/login`};
  }
  const html=renderEmail(input,siteUrl()).html.replace('cid:reception-photo',input.receptionPhoto?`/api/files/${encodeURIComponent(input.receptionPhoto.fileId)}?inline=1`:'');
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'"}});
}
