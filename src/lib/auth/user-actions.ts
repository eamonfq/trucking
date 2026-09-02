"use server";

import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { registrationSchema, type RegistrationInput } from "@/lib/schemas/registration";
import { resetPasswordSchema, resetRequestSchema } from "@/lib/schemas/auth";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";

export async function registerAccount(input: RegistrationInput) {
  await simulateLatency();
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Revisa los datos marcados antes de continuar." };
  const lockerCode = "AL-MX-0004";
  const token = await createSessionToken("usr-004", "cliente");
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);
  const email = await sendEmail({ to: parsed.data.email, subject: "Bienvenido a A&L Trucking Logistics", heading: `Tu casillero ${lockerCode} está listo`, body: `Hola ${parsed.data.firstName}. Ya puedes comenzar a registrar tus compras y preparar tus envíos a México.`, actionLabel: "Abrir mi panel", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/cliente` });
  return { ok: true as const, lockerCode, emailStatus: email.status };
}

export async function requestPasswordReset(email: string) {
  await simulateLatency();
  const parsed = resetRequestSchema.safeParse({ email });
  if (!parsed.success) return { ok: false as const, message: "Escribe un correo válido." };
  await sendEmail({ to: parsed.data.email, subject: "Restablece tu contraseña de A&L", heading: "Solicitud de restablecimiento", body: "Recibimos una solicitud para cambiar tu contraseña. Si no fuiste tú, puedes ignorar este mensaje.", actionLabel: "Restablecer contraseña", actionUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/restablecer?token=demo-token` });
  return { ok: true as const };
}

export async function resetPassword(input: { password: string; confirmPassword: string; token?: string }) {
  await simulateLatency();
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success || input.token !== "demo-token") return { ok: false as const, message: "El enlace no es válido o los datos están incompletos." };
  return { ok: true as const };
}
