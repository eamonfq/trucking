import "server-only";
import type { User } from "@/lib/types";
import { issueToken } from "./repository";
import { sendEmail, siteUrl } from "@/lib/services/email";
export async function sendAccountLink(user: User, purpose: "verify" | "reset" | "invite") {
  const token = await issueToken(user.id, purpose);
  const copy = {
    verify: { subject: "Confirma tu correo · A&L", heading: "Un paso más. Todo listo para comenzar.", body: `Hola ${user.firstName}. Reservamos tu casillero ${user.lockerCode}. Confirma tu correo para activar el acceso. Este enlace vence en 24 horas.`, actionLabel: "Confirmar mi correo", path: "/verificar" },
    reset: { subject: "Recupera tu acceso · A&L", heading: "Volvamos a conectar.", body: "Recibimos una solicitud para cambiar tu contraseña. El enlace es personal, funciona una sola vez y vence en 30 minutos.", actionLabel: "Crear nueva contraseña", path: "/restablecer" },
    invite: { subject: "Tu casillero está listo · A&L", heading: "Bienvenido a tu nueva ruta.", body: `Hola ${user.firstName}. Operaciones creó tu casillero ${user.lockerCode}. Elige tu contraseña para confirmar tu correo y activar la cuenta. El enlace vence en 24 horas.`, actionLabel: "Activar mi cuenta", path: "/restablecer" },
  }[purpose];
  if (purpose === "invite" && user.role === "operador") { copy.subject="Tu acceso de almacén · A&L"; copy.heading="Tu acceso de almacén está listo"; copy.body=`Hola ${user.firstName}. El administrador te asignó acceso al módulo de almacén. Elige tu contraseña y confirma tu correo. Este enlace vence en 24 horas.`; }
  return sendEmail({ to: user.email, ...copy, actionUrl: `${siteUrl()}${copy.path}?token=${token}`, expiresAt: new Date(Date.now() + (purpose === "reset" ? 30 * 60_000 : 24 * 60 * 60_000)).toISOString() });
}
