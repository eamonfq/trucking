"use client";
import Link from "next/link";
import { useState } from "react";
import { MailCheck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestVerification, verifyEmail } from "@/lib/auth/user-actions";
export function VerificationForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  if (done) return <div className="grid gap-5 rounded-2xl border border-line-300 bg-cream-100 p-6"><ShieldCheck className="size-10 text-brand-700" /><h2 className="font-display text-2xl font-bold">Correo confirmado.</h2><p className="text-sm leading-7 text-ink-700">Tu cuenta está activa. Inicia sesión para conocer tu casillero y organizar tu primer envío.</p><Link href="/login" className="rounded-xl bg-navy-900 p-4 text-center font-semibold text-white">Entrar a mi cuenta</Link></div>;
  return <div className="grid gap-6">{token && <div className="grid gap-4 rounded-2xl border border-line-300 p-6"><MailCheck className="size-9 text-brand-700" /><p className="text-sm leading-7 text-ink-700">Confirma que esta dirección de correo te pertenece. El enlace solo se utilizará al pulsar el botón.</p><Button loading={busy} onClick={async () => { setBusy(true); setError(""); try { const result = await verifyEmail(token); if (result.ok) setDone(true); else setError(result.message); } catch { setError("No pudimos conectar. Intenta de nuevo."); } finally { setBusy(false); } }}>Confirmar mi correo</Button></div>}{error && <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger-700">{error}</p>}{sent ? <p role="status" className="rounded-xl bg-cream-100 p-5 text-sm leading-7">Si tu cuenta necesita verificación, recibirás un nuevo enlace. Revisa también la carpeta de spam.</p> : <form className="grid gap-4" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); try { const result = await requestVerification(email); if (result.ok) setSent(true); else setError(result.message); } catch { setError("No pudimos conectar. Intenta de nuevo."); } finally { setBusy(false); } }}><Input id="verification-email" label="¿Necesitas otro enlace?" type="email" autoComplete="email" required value={email} placeholder="Tu correo electrónico" onChange={event => setEmail(event.target.value)} /><Button variant="secondary" type="submit" loading={busy}>Reenviar verificación</Button></form>}<Link href="/login" className="text-center text-sm font-semibold text-navy-900">Volver al acceso</Link></div>;
}
