import "server-only";
import { Resend } from "resend";

type EmailInput = { to: string; subject: string; heading: string; body: string; actionLabel?: string; actionUrl?: string };
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export async function sendEmail(input: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || input.to.endsWith(".test")) return { status: "simulated" as const, id: `demo-${Date.now()}` };
  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "A&L Demo <onboarding@resend.dev>",
      to: input.to,
      subject: input.subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#1C2B4B"><div style="font-weight:800;font-size:18px">A&amp;L Trucking Logistics</div><h1 style="font-size:28px;margin:32px 0 12px">${escapeHtml(input.heading)}</h1><p style="font-size:16px;line-height:1.7;color:#5A6680">${escapeHtml(input.body)}</p>${input.actionUrl ? `<a href="${escapeHtml(input.actionUrl)}" style="display:inline-block;margin-top:20px;background:#E8621C;color:white;text-decoration:none;padding:14px 22px;border-radius:999px;font-weight:700">${escapeHtml(input.actionLabel ?? "Continuar")}</a>` : ""}<p style="margin-top:32px;font-size:12px;color:#77839A">Mensaje generado por el entorno demo.</p></div>`,
    });
    if (result.error) return { status: "failed" as const, message: result.error.message };
    return { status: "sent" as const, id: result.data?.id };
  } catch (error) {
    return { status: "failed" as const, message: error instanceof Error ? error.message : "No se pudo enviar el correo." };
  }
}
