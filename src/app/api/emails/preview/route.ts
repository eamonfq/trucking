import { getCurrentUser } from "@/lib/auth/actions";
import {canAdmin,isFullAdmin} from "@/lib/auth/admin-permissions";
import { decryptEmail, siteUrl } from "@/lib/services/email";
import { renderEmail, type EmailInput } from "@/lib/services/email-template";
import { pool } from "@/lib/db/pool";
import type { RowDataPacket } from "mysql2/promise";
import { emails } from "@/lib/i18n/catalogs/emails";
import { getLocale } from "@/lib/i18n/server";
import { translator } from "@/lib/i18n/translate";
export async function GET(request: Request) {
  if (!canAdmin(await getCurrentUser(),"correos")) return new Response(null, { status: 401 });
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  let input: EmailInput;
  if (id) {
    if(!isFullAdmin(await getCurrentUser()))return new Response(null,{status:403});
    if (process.env.NODE_ENV === "production" || process.env.EMAIL_DELIVERY !== "preview") return new Response(null, { status: 404 });
    const [rows] = await pool().execute<RowDataPacket[]>("SELECT payload FROM email_outbox WHERE id=? AND status='queued'", [id]);
    if (!rows[0]) return new Response(null, { status: 404 });
    input = decryptEmail(typeof rows[0].payload === "string" ? JSON.parse(rows[0].payload) : rows[0].payload);
  } else {
    // A queued email keeps its recipient's language; a sample template follows the admin viewing it.
    const locale = await getLocale(), t = translator(emails, locale);
    const heading = ({verify:t("Un paso más. Todo listo para comenzar."),welcome:t("Tu casillero está activo."),reset:t("Volvamos a conectar."),changed:t("Tu acceso está protegido."),invite:t("Bienvenido a tu nueva ruta."),invoice:t("Tu factura está disponible."),reception:t("Tu caja ya está en bodega."),payment:t("Tu pago está en revisión."),delivery:t("Tu caja llegó a sus manos."),support:t("Estamos para ayudarte.")} as Record<string,string>)[params.get("template") ?? "verify"] ?? t("Tu cuenta A&L");
    input = {to:"preview@example.invalid",subject:heading,heading,body:t("Hola. Esta es una vista previa de la identidad visual de nuestros correos: mensajes claros, enlaces personales y el respaldo de A&L en cada paso."),actionLabel:t("Continuar a mi cuenta"),actionUrl:`${siteUrl()}/login`,locale};
  }
  const html=renderEmail(input,siteUrl()).html.replace('cid:reception-photo',input.receptionPhoto?`/api/files/${encodeURIComponent(input.receptionPhoto.fileId)}?inline=1`:'');
  return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'"}});
}
