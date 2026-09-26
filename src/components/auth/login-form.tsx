"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authenticate } from "@/lib/auth/actions";
import { resolvePostLoginPath } from "@/lib/auth/redirect";
import { loginSchema } from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

type LoginInput = z.input<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({ resolver: zodResolver(loginSchema), defaultValues: { remember: false } });
  const submit = handleSubmit(async (data) => {
    setServerError("");
    try {
    const result = await authenticate(data.identifier, data.password, data.remember);
    if (!result.ok) return setServerError(result.message);
    router.push(resolvePostLoginPath(result.user.role, searchParams.get("siguiente")));
    router.refresh();
    } catch { setServerError("No pudimos conectar con el servidor. Intenta de nuevo en un momento."); }
  });
  return <form onSubmit={submit} className="grid gap-5"><Input label="Correo o número de casillero" autoComplete="username" placeholder="correo@ejemplo.com o AL-MX-0001" error={errors.identifier?.message} {...register("identifier")} /><Input label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} /><div className="flex items-center justify-between gap-4"><Checkbox label="Recordarme durante 30 días" {...register("remember")} /><Link href="/recuperar" className="text-xs font-medium text-brand-700 hover:text-brand-600">¿La olvidaste?</Link></div><p className="text-xs leading-5 text-ink-700">Actívalo solo en tu dispositivo personal. Puedes guardar tu contraseña en el gestor de contraseñas del navegador; A&L no la almacena en la app.</p>{serverError && <p role="alert" className="rounded-md border border-[#F5CFCB] bg-[#FDECEA] px-4 py-3 text-sm text-danger">{serverError}</p>}<Button type="submit" loading={isSubmitting} className="w-full">Iniciar sesión</Button><Link href="/verificar" className="text-sm font-medium text-brand-700">¿Aún no confirmaste tu correo?</Link><p className="text-sm text-ink-700">¿No tienes cuenta? <Link href="/registro" className="font-semibold text-navy-900 underline decoration-brand-500 decoration-2 underline-offset-4">Créala en dos pasos</Link></p></form>;
}
