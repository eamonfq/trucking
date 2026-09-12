"use client";
import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "./password-strength";
import { resetPassword } from "@/lib/auth/user-actions";
export function ResetForm({ token }: { token?: string }) {
  const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [loading,setLoading]=useState(false); const [done,setDone]=useState(false); const [error,setError]=useState("");
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return <div className="grid gap-4 rounded-2xl border border-line-300 bg-cream-100 p-6"><h2 className="font-display text-2xl font-bold">Necesitas un enlace válido.</h2><p className="text-sm leading-7 text-ink-700">Solicita un enlace personal para recuperar tu acceso. Por seguridad, no podemos cambiar tu contraseña desde esta dirección.</p><Link href="/recuperar" className="font-semibold text-brand-700">Solicitar otro enlace →</Link></div>;
  if (done) return <div className="grid gap-4 rounded-2xl border border-line-300 bg-cream-100 p-6"><ShieldCheck className="size-10 text-brand-700" /><h2 className="font-display text-2xl font-bold">Contraseña actualizada.</h2><p className="text-sm leading-7 text-ink-700">Cerramos las sesiones anteriores. Ya puedes entrar con tu nueva contraseña.</p><Link href="/login" className="rounded-xl bg-navy-900 p-4 text-center font-semibold text-white">Iniciar sesión</Link></div>;
  return <form className="grid gap-5" onSubmit={async event=>{event.preventDefault();setLoading(true);setError("");try {const result=await resetPassword({password,confirmPassword:confirm,token});if(result.ok)setDone(true);else setError(result.message);}catch {setError("No pudimos conectar. Intenta de nuevo en un momento.");}finally{setLoading(false);}}}><Input label="Nueva contraseña" type="password" autoComplete="new-password" required maxLength={128} value={password} onChange={event=>setPassword(event.target.value)} /><PasswordStrength value={password}/><Input label="Confirma la contraseña" type="password" autoComplete="new-password" required maxLength={128} value={confirm} onChange={event=>setConfirm(event.target.value)}/>{error && <p role="alert" className="rounded-xl bg-danger-50 p-4 text-sm text-danger-700">{error}</p>}<Button type="submit" loading={loading}>Guardar nueva contraseña</Button><Link href="/recuperar" className="text-center text-sm font-medium text-brand-700">¿Venció tu enlace? Solicita otro</Link></form>;
}
