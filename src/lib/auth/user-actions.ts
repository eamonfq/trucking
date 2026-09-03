"use server";

import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { registrationSchema, type RegistrationInput } from "@/lib/schemas/registration";
import { resetPasswordSchema, resetRequestSchema } from "@/lib/schemas/auth";
import { sendEmail } from "@/lib/services/email";
import { simulateLatency } from "@/lib/services/delay";
import { addresses } from "@/lib/data/addresses";
import { demoCredentials, users } from "@/lib/data/users";
import type { Address, User } from "@/lib/types";

export async function registerAccount(input: RegistrationInput) {
  await simulateLatency();
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Revisa los datos marcados antes de continuar." };
  if (users.some((user) => user.email.toLowerCase() === parsed.data.email.toLowerCase())) return { ok: false as const, message: "Ya existe una cuenta con ese correo." };
  const numericIds = users.filter((user) => user.role === "cliente").map((user) => Number(user.id.replace("usr-", ""))).filter(Number.isFinite);
  const sequence = Math.max(0, ...numericIds) + 1;
  const userId = `usr-${String(sequence).padStart(3, "0")}`;
  const lockerCode = `AL-MX-${String(sequence).padStart(4, "0")}`;
  const createdAt = new Date().toISOString();
  const user: User = { id: userId, role: "cliente", firstName: parsed.data.firstName, paternalLastName: parsed.data.paternalLastName, maternalLastName: parsed.data.maternalLastName, email: parsed.data.email.toLowerCase(), phone: `+52${parsed.data.phone}`, lockerCode, rfc: parsed.data.rfc || undefined, active: true, internalNotes: [], activity: [{ id: `act-${crypto.randomUUID()}`, type: "alta", description: "Cuenta creada y casillero asignado.", actor: "Sistema", at: createdAt }] };
  const address: Address = { id: `addr-${String(addresses.length + 1).padStart(3, "0")}`, userId, label: "Principal", street: parsed.data.street, exteriorNumber: parsed.data.exteriorNumber, interiorNumber: parsed.data.interiorNumber, neighborhood: parsed.data.neighborhood, postalCode: parsed.data.postalCode, municipality: parsed.data.municipality, state: parsed.data.state, references: parsed.data.references };
  users.push(user);
  addresses.push(address);
  demoCredentials.push({ identifier: user.email, password: parsed.data.password, userId }, { identifier: lockerCode, password: parsed.data.password, userId });
  const token = await createSessionToken(userId, "cliente");
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
