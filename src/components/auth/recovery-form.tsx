"use client";
import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/user-actions";
export function RecoveryForm() {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [sent,setSent]=useState(false); const [error,setError]=useState("");
  if(sent) return <div role="status" className="grid gap-4 rounded-2xl border border-line-300 bg-cream-100 p-6"><MailCheck className="size-10 text-brand-700"/><h2 className="font-display text-2xl font-bold">Revisa tu correo.</h2><p className="text-sm leading-7 text-ink-700">Si existe una cuenta asociada, recibirás instrucciones. El enlace vence en 30 minutos y solo funciona una vez. Revisa también spam.</p><Link href="/login" className="rounded-xl bg-navy-900 p-4 text-center font-semibold text-white">Volver al acceso</Link></div>;
  return <form className="grid gap-5" onSubmit={async event=>{event.preventDefault();setLoading(true);setError("");try{const result=await requestPasswordReset(email);if(result.ok)setSent(true);else setError(result.message);}catch{setError("No pudimos conectar. Intenta de nuevo en un momento.");}finally{setLoading(false);}}}><Input label="Correo electrónico" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} error={error}/><Button type="submit" loading={loading}>Enviar instrucciones</Button><Link href="/login" className="text-center text-sm font-semibold text-navy-900">Volver a iniciar sesión</Link></form>;
}
