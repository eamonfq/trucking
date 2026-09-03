"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authenticate } from "@/lib/auth/actions";
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
    const result = await authenticate(data.identifier, data.password);
    if (!result.ok) return setServerError(result.message);
    const requested = searchParams.get("siguiente");
    router.push(requested && requested.startsWith("/") ? requested : result.user.role === "admin" ? "/admin" : "/cliente");
    router.refresh();
  });
  return <form onSubmit={submit} className="grid gap-5"><Input label="Correo o número de casillero" autoComplete="username" placeholder="correo@ejemplo.com o AL-MX-0001" error={errors.identifier?.message} {...register("identifier")} /><Input label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} /><div className="flex items-center justify-between gap-4"><Checkbox label="Mantener mi sesión abierta" {...register("remember")} /><Link href="/recuperar" className="text-xs font-medium text-brand-700 hover:text-brand-600">¿La olvidaste?</Link></div>{serverError && <p role="alert" className="rounded-md border border-[#F5CFCB] bg-[#FDECEA] px-4 py-3 text-sm text-danger">{serverError}</p>}<Button type="submit" loading={isSubmitting} className="w-full">Iniciar sesión</Button><div className="rounded-md bg-cream-100 p-4 text-xs leading-6 text-ink-500"><strong className="text-navy-900">Cliente demo:</strong> mariana@demo.test / Demo1234!<br /><strong className="text-navy-900">Admin demo:</strong> admin@demo.test / Admin1234!</div><p className="text-sm text-ink-700">¿No tienes cuenta? <Link href="/registro" className="font-semibold text-navy-900 underline decoration-brand-500 decoration-2 underline-offset-4">Créala en dos pasos</Link></p></form>;
}
