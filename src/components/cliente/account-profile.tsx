"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { z } from "zod";
import { updateClientProfile } from "@/lib/auth/client-actions";
import { customerProfileSchema } from "@/lib/schemas/customer";
import type { ClientUser } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

type ProfileInput = z.input<typeof customerProfileSchema>;

export function AccountProfile({ user: initialUser }: { user: ClientUser }) {
  const [user, setUser] = useState(initialUser);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ProfileInput>({
    resolver: zodResolver(customerProfileSchema),
    defaultValues: { firstName: user.firstName, paternalLastName: user.paternalLastName, maternalLastName: user.maternalLastName ?? "", email: user.email, phone: user.phone, rfc: user.rfc ?? "" },
  });
  const submit = handleSubmit(async (data) => {
    const result = await updateClientProfile(data);
    if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" });
    setUser(result.user);
    reset({ firstName: result.user.firstName, paternalLastName: result.user.paternalLastName, maternalLastName: result.user.maternalLastName ?? "", email: result.user.email, phone: result.user.phone, rfc: result.user.rfc ?? "" });
    showToast({ title: "Datos actualizados", description: "Tu información de contacto quedó guardada." });
  });
  return <Card className="shadow-none">
    <h2 className="font-display text-xl font-bold text-navy-950">Datos personales</h2>
    <p className="mt-2 text-sm leading-6 text-navy-500">Usamos estos datos para identificar tus cajas y avisarte de cada movimiento. El casillero {user.lockerCode} solo puede cambiarlo Operaciones.</p>
    <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <Input label="Nombre(s)" error={errors.firstName?.message} {...register("firstName")} />
      <Input label="Apellido paterno" error={errors.paternalLastName?.message} {...register("paternalLastName")} />
      <Input label="Apellido materno (opcional)" error={errors.maternalLastName?.message} {...register("maternalLastName")} />
      <Input label="Correo electrónico" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} />
      <Input label="Teléfono +52" inputMode="numeric" error={errors.phone?.message} {...register("phone")} />
      <Input label="RFC (opcional)" className="uppercase" hint="Solo si necesitas factura fiscal." error={errors.rfc?.message} {...register("rfc")} />
      <div className="flex justify-end sm:col-span-2"><Button type="submit" loading={isSubmitting}><Save className="size-4" />Guardar cambios</Button></div>
    </form>
  </Card>;
}
