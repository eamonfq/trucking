"use server";
import { after } from "next/server";
import { registrationSchema, type RegistrationInput } from "@/lib/schemas/registration";
import { resetPasswordSchema, resetRequestSchema } from "@/lib/schemas/auth";
import { withStore } from "@/lib/db/store";
import { users } from "@/lib/db/collections";
import { createAccount, consumeToken, findAccount } from "./repository";
import { requestLimit } from "./actions";
import { sendAccountLink } from "./account-email";
import { sendEmail, deliverPendingEmails, siteUrl } from "@/lib/services/email";
export async function registerAccount(input: RegistrationInput) {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Revisa los datos marcados antes de continuar." };
  if (!await requestLimit("register", parsed.data.email, 4)) return { ok: false as const, message: "Espera 15 minutos antes de intentar otra vez." };
  const result = await withStore(async () => {
    if (await findAccount(parsed.data.email)) return { ok: false as const, message: "No pudimos crear esta cuenta. Si ya te registraste, recupera tu acceso." };
    const { user } = await createAccount(parsed.data, parsed.data.password);
    const email = await sendAccountLink(user, "verify");
    return { ok: true as const, lockerCode: user.lockerCode, emailStatus: email.status };
  }, true);
  after(deliverPendingEmails);
  return result;
}
async function requestLink(email: string, purpose: "reset" | "verify") {
  const parsed = resetRequestSchema.safeParse({ email });
  if (!parsed.success) return { ok: false as const, message: "Escribe un correo válido." };
  if (await requestLimit(purpose, parsed.data.email, 3)) await withStore(async () => {
    const account = await findAccount(parsed.data.email);
    const user = account?.active && users.find(item => item.id === account.user_id);
    if (user && (purpose !== "verify" || !account!.verified_at)) await sendAccountLink(user, purpose);
  }, true);
  after(deliverPendingEmails);
  return { ok: true as const };
}
export async function requestPasswordReset(email: string) { return requestLink(email, "reset"); }
export async function requestVerification(email: string) { return requestLink(email, "verify"); }
export async function verifyEmail(token: string) {
  if (typeof token !== "string" || !await requestLimit("verify-consume", "global", 40)) return { ok: false as const, message: "El enlace no es válido o debes esperar unos minutos." };
  const result = await withStore(async () => {
    const user = await consumeToken(token, "verify");
    if (!user) return { ok: false as const, message: "El enlace venció o ya fue utilizado. Solicita uno nuevo." };
    await sendEmail({ to: user.email, subject: "Bienvenido a A&L", heading: `Tu casillero ${user.lockerCode} está activo.`, body: "Tu correo ha sido confirmado. Ya puedes organizar tus compras y seguir cada envío desde tu cuenta.", actionLabel: "Entrar a mi cuenta", actionUrl: `${siteUrl()}/login` });
    return { ok: true as const };
  }, true);
  after(deliverPendingEmails); return result;
}
export async function resetPassword(input: { password: string; confirmPassword: string; token?: string }) {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success || typeof input.token !== "string") return { ok: false as const, message: "Revisa la contraseña y el enlace recibido." };
  if (!await requestLimit("reset-consume", "global", 40)) return { ok: false as const, message: "Espera unos minutos antes de intentar de nuevo." };
  const result = await withStore(async () => {
    const user = await consumeToken(input.token!, "reset", parsed.data.password);
    if (!user) return { ok: false as const, message: "El enlace venció o ya fue utilizado. Solicita uno nuevo." };
    await sendEmail({ to: user.email, subject: "Contraseña actualizada · A&L", heading: "Tu acceso está protegido.", body: "Tu contraseña cambió y cerramos todas las sesiones anteriores. Si no reconoces este cambio, contacta a soporte y solicita recuperar tu acceso.", actionLabel: "Iniciar sesión", actionUrl: `${siteUrl()}/login` });
    return { ok: true as const };
  }, true);
  after(deliverPendingEmails); return result;
}
