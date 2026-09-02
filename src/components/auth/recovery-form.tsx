"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/user-actions";

export function RecoveryForm() {
  const [email, setEmail] = useState(""); const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  if (sent) return <div className="rounded-card bg-white p-6 shadow-soft"><h2 className="font-display text-2xl font-bold text-navy-950">Revisa tu correo</h2><p className="mt-3 text-sm leading-7 text-navy-500">Si existe una cuenta asociada, enviamos instrucciones. En este demo también puedes usar el enlace de prueba.</p><Link href="/restablecer?token=demo-token" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-navy-950 px-5 text-sm font-bold text-white">Abrir enlace de demo</Link></div>;
  return <form onSubmit={async (event) => { event.preventDefault(); setLoading(true); setError(""); const result = await requestPasswordReset(email); setLoading(false); if (result.ok) setSent(true); else setError(result.message); }} className="grid gap-5"><Input label="Correo electrónico" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} error={error} /><Button type="submit" loading={loading}>Enviar instrucciones</Button><Link href="/login" className="text-center text-sm font-semibold text-navy-600">Volver a iniciar sesión</Link></form>;
}
