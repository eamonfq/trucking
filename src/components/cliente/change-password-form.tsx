"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordStrength } from "@/components/auth/password-strength";
import { recordClientAction } from "@/lib/auth/client-actions";
import { changePasswordSchema } from "@/lib/schemas/auth";

type PasswordInput = z.input<typeof changePasswordSchema>;
export function ChangePasswordForm() { const [done, setDone] = useState(false); const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<PasswordInput>({ resolver: zodResolver(changePasswordSchema) }); const password = useWatch({ control, name: "password" }) ?? ""; return <form onSubmit={handleSubmit(async () => { await recordClientAction({ kind: "password", email: "mariana@demo.test" }); setDone(true); })} className="grid max-w-xl gap-5 rounded-card border border-stone-200 bg-white p-6 shadow-soft">{done && <p className="rounded-xl bg-success-50 p-3 text-sm font-semibold text-success-700">Contraseña actualizada en el demo.</p>}<Input label="Contraseña actual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register("currentPassword")} /><Input label="Nueva contraseña" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} /><PasswordStrength value={password} /><Input label="Confirmar nueva contraseña" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} /><Button type="submit" loading={isSubmitting}>Cambiar contraseña</Button></form>; }
