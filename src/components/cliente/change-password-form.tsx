"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { changeClientPassword } from "@/lib/auth/client-actions";
import { changePasswordSchema } from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { useToast } from "@/components/ui/toast";

type PasswordInput = z.input<typeof changePasswordSchema>;

export function ChangePasswordForm() {
  const [done, setDone] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<PasswordInput>({ resolver: zodResolver(changePasswordSchema) });
  const password = useWatch({ control, name: "password" }) ?? "";
  const submit = handleSubmit(async (data) => {
    const result = await changeClientPassword(data);
    if (!result.ok) return showToast({ title: "No se pudo cambiar", description: result.error, variant: "error" });
    reset({ currentPassword: "", password: "", confirmPassword: "" });
    setDone(true);
    showToast({ title: "Contraseña actualizada", description: "Cerramos tus sesiones anteriores. Ingresa de nuevo con tu nueva contraseña." });
  });
  if (done) return <div role="status" className="grid max-w-xl gap-4 rounded-2xl border border-line-300 bg-white p-6"><h2 className="font-display text-2xl font-bold">Contraseña actualizada</h2><p className="text-sm leading-7 text-ink-700">Cerramos todas las sesiones anteriores y guardamos un aviso de seguridad en la cola de correos.</p><Link href="/login" className="font-semibold text-brand-700">Iniciar sesión de nuevo →</Link></div>;
  return <form onSubmit={submit} className="grid max-w-xl gap-5 rounded-card border border-stone-200 bg-white p-6 shadow-soft">
    {done && <p role="status" className="rounded-xl bg-success-50 p-3 text-sm font-semibold text-success-700">Tu contraseña se actualizó y te enviamos un aviso de seguridad.</p>}
    <Input label="Contraseña actual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register("currentPassword")} />
    <Input label="Nueva contraseña" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} />
    <PasswordStrength value={password} />
    <Input label="Confirmar nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} />
    <Button type="submit" loading={isSubmitting}>Cambiar contraseña</Button>
  </form>;
}
