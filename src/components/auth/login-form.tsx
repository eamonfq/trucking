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
  return <form onSubmit={submit} className="grid gap-5"><Input label="Correo o número de casillero" autoComplete="username" placeholder="correo@ejemplo.com o AL-MX-0001" error={errors.identifier?.message} {...register("identifier")} /><Input label="Contraseña" type="password" autoComplete="current-password" error={errors.password?.message} {...register("password")} /><div className="flex items-center justify-between gap-4"><Checkbox label="Recordarme" {...register("remember")} /><Link href="/recuperar" className="text-sm font-semibold text-orange-600 hover:text-orange-500">¿Olvidaste tu contraseña?</Link></div>{serverError && <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">{serverError}</p>}<Button type="submit" loading={isSubmitting} className="w-full">Iniciar sesión</Button><div className="rounded-2xl bg-cream-100 p-4 text-xs leading-6 text-navy-500"><strong className="text-navy-800">Cliente demo:</strong> mariana@demo.test / Demo1234!<br /><strong className="text-navy-800">Admin demo:</strong> admin@demo.test / Admin1234!</div><p className="text-center text-sm text-navy-500">¿Primera vez? <Link href="/registro" className="font-bold text-navy-900 underline decoration-orange-500 decoration-2 underline-offset-4">Crea tu cuenta</Link></p></form>;
}
