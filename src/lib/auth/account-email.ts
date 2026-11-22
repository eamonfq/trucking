import "server-only";
import type { User } from "@/lib/types";
import { issueToken } from "./repository";
import { sendEmail, siteUrl } from "@/lib/services/email";
import { emails } from "@/lib/i18n/catalogs/emails";
import { translator } from "@/lib/i18n/translate";
import { userLocale } from "@/lib/i18n/user-locale";
export async function sendAccountLink(user: User, purpose: "verify" | "reset" | "invite") {
  if(!user.email)return {status:"skipped-no-email" as const,id:""};
  const token = await issueToken(user.id, purpose);
  // In the language the person chose (registration, switcher or login); Spanish if none is saved.
  const locale = userLocale(user), t = translator(emails, locale);
  const vars = { name: user.firstName, locker: String(user.lockerCode) };
  const copy = {
    verify: { subject: t("Confirma tu correo · A&L"), heading: t("Un paso más. Todo listo para comenzar."), body: t("Hola {name}. Reservamos tu casillero {locker}. Confirma tu correo para activar el acceso. Este enlace vence en 24 horas.", vars), actionLabel: t("Confirmar mi correo"), path: "/verificar" },
    reset: { subject: t("Recupera tu acceso · A&L"), heading: t("Volvamos a conectar."), body: t("Recibimos una solicitud para cambiar tu contraseña. El enlace es personal, funciona una sola vez y vence en 30 minutos."), actionLabel: t("Crear nueva contraseña"), path: "/restablecer" },
    invite: { subject: t("Tu casillero está listo · A&L"), heading: t("Bienvenido a tu nueva ruta."), body: t("Hola {name}. Operaciones creó tu casillero {locker}. Elige tu contraseña para confirmar tu correo y activar la cuenta. El enlace vence en 24 horas.", vars), actionLabel: t("Activar mi cuenta"), path: "/restablecer" },
  }[purpose];
  if (purpose === "invite" && user.role === "operador") { copy.subject=t("Tu acceso de almacén · A&L"); copy.heading=t("Tu acceso de almacén está listo"); copy.body=t("Hola {name}. El administrador te asignó acceso al módulo de almacén. Elige tu contraseña y confirma tu correo. Este enlace vence en 24 horas.", vars); }
  if(purpose==="invite"&&user.role==="admin"){copy.subject=t("Tu acceso al equipo · A&L");copy.heading=t("Tu espacio de trabajo está listo");copy.body=t("Hola {name}. Te asignaron acceso al panel operativo de A&L. Crea tu contraseña para confirmar tu correo. Al ingresar verás las herramientas autorizadas. El enlace es personal y vence en 24 horas.", vars);}
  return sendEmail({ to: user.email, ...copy, locale, actionUrl: `${siteUrl()}${copy.path}?token=${token}`, expiresAt: new Date(Date.now() + (purpose === "reset" ? 30 * 60_000 : 24 * 60 * 60_000)).toISOString() });
}
