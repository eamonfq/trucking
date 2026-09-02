"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { resetPassword } from "@/lib/auth/user-actions";

export function ResetForm({ token }: { token?: string }) {
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [loading, setLoading] = useState(false); const [done, setDone] = useState(false); const [error, setError] = useState("");
  if (done) return <div className="rounded-card bg-success-50 p-6"><h2 className="font-display text-2xl font-bold text-success-700">Contraseña actualizada</h2><p className="mt-3 text-sm text-navy-600">Ya puedes iniciar sesión con tu nueva contraseña.</p><Link href="/login" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-navy-950 px-5 text-sm font-bold text-white">Iniciar sesión</Link></div>;
  return <form onSubmit={async (event) => { event.preventDefault(); setLoading(true); setError(""); const result = await resetPassword({ password, confirmPassword: confirm, token }); setLoading(false); if (result.ok) setDone(true); else setError(result.message); }} className="grid gap-5"><Input label="Nueva contraseña" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><PasswordStrength value={password} /><Input label="Confirma la contraseña" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />{error && <p role="alert" className="rounded-xl bg-danger-50 p-3 text-sm text-danger-700">{error}</p>}<Button type="submit" loading={loading}>Guardar nueva contraseña</Button></form>;
}
