"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Copy, PackageCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PasswordStrength } from "@/components/auth/password-strength";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { registrationSchema } from "@/lib/schemas/registration";
import { registerAccount } from "@/lib/auth/user-actions";

type RegistrationForm = z.input<typeof registrationSchema>;
const accountFields: Array<keyof RegistrationForm> = ["firstName", "paternalLastName", "email", "phone", "password", "confirmPassword", "acceptedTerms"];

export function RegisterForm({ originMode, warehouseAddress }: { originMode: "casillero" | "entrega-directa"; warehouseAddress: string }) {
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<{ lockerCode: string; emailStatus: string } | null>(null);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, trigger, control, setValue, formState: { errors, isSubmitting } } = useForm<RegistrationForm>({ resolver: zodResolver(registrationSchema), defaultValues: { acceptedTerms: false, state: "" } });
  const password = useWatch({ control, name: "password" }) ?? "";
  const next = async () => { if (await trigger(accountFields)) setStep(2); };
  const postalRegistration = register("postalCode");
  const submit = handleSubmit(async (data) => { setServerError(""); const response = await registerAccount(data); if (!response.ok) return setServerError(response.message); setResult({ lockerCode: response.lockerCode, emailStatus: response.emailStatus }); });
  if (result) return <div className="rounded-card border border-stone-200 bg-white p-6 shadow-soft sm:p-8"><span className="grid size-14 place-items-center rounded-2xl bg-success-50 text-success-700"><CheckCircle2 className="size-7" /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-orange-600">Cuenta creada</p><h2 className="mt-2 font-display text-3xl font-bold text-navy-950">Tu casillero es {result.lockerCode}</h2><p className="mt-4 text-sm leading-7 text-navy-500">{originMode === "casillero" ? "Usa este código junto a tu nombre en cada compra que envíes a nuestra bodega." : "Tu cuenta está lista. Coordina la entrega o recolección de tu primera caja."}</p>{originMode === "casillero" && <div className="mt-6 rounded-2xl bg-cream-100 p-5"><p className="text-xs font-bold uppercase tracking-wider text-navy-500">Bodega en Miami</p><p className="mt-2 font-semibold text-navy-950">{warehouseAddress}</p><button type="button" onClick={() => navigator.clipboard.writeText(`${result.lockerCode} · ${warehouseAddress}`)} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600"><Copy className="size-4" />Copiar instrucciones</button></div>}<p className="mt-5 text-xs text-navy-400">Correo de bienvenida: {result.emailStatus === "sent" ? "enviado" : "simulado en este entorno"}.</p><Link href="/cliente" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-navy-950 px-6 text-sm font-bold text-white">Abrir mi panel <PackageCheck className="size-4" /></Link></div>;
  return <form onSubmit={submit} className="grid gap-5"><div className="mb-2"><div className="flex justify-between text-xs font-bold text-navy-500"><span className={step === 1 ? "text-orange-600" : ""}>1 · Cuenta</span><span className={step === 2 ? "text-orange-600" : ""}>2 · Dirección</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>
    {step === 1 ? <><div className="grid gap-4 sm:grid-cols-2"><Input label="Nombre(s)" error={errors.firstName?.message} {...register("firstName")} /><Input label="Apellido paterno" error={errors.paternalLastName?.message} {...register("paternalLastName")} /><Input label="Apellido materno (opcional)" {...register("maternalLastName")} /><Input label="Correo electrónico" type="email" autoComplete="email" error={errors.email?.message} {...register("email")} /><Input label="Teléfono +52" inputMode="numeric" placeholder="10 dígitos" error={errors.phone?.message} {...register("phone")} /><span /></div><Input label="Contraseña" type="password" autoComplete="new-password" error={errors.password?.message} {...register("password")} /><PasswordStrength value={password} /><Input label="Confirma tu contraseña" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register("confirmPassword")} /><div><Checkbox label="Acepto los términos y el aviso de privacidad del demo" {...register("acceptedTerms")} />{errors.acceptedTerms?.message && <p className="mt-2 text-xs text-danger-700">{errors.acceptedTerms.message}</p>}</div><Button type="button" onClick={next} className="w-full">Continuar con mi dirección</Button></> : <><div className="grid gap-4 sm:grid-cols-2"><Input label="Calle" error={errors.street?.message} {...register("street")} /><Input label="Número exterior" error={errors.exteriorNumber?.message} {...register("exteriorNumber")} /><Input label="Número interior (opcional)" {...register("interiorNumber")} /><Input label="Colonia" error={errors.neighborhood?.message} {...register("neighborhood")} /><Input label="Código postal" inputMode="numeric" maxLength={5} error={errors.postalCode?.message} {...postalRegistration} onChange={(event) => { postalRegistration.onChange(event); const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("state", match.state, { shouldValidate: true }); setValue("municipality", match.municipality, { shouldValidate: true }); } }} /><Input label="Municipio o alcaldía" error={errors.municipality?.message} {...register("municipality")} /><Select label="Estado" options={[{ value: "", label: "Selecciona" }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={errors.state?.message} {...register("state")} /><Input label="RFC (opcional)" error={errors.rfc?.message} {...register("rfc")} /></div><Textarea label="Referencias" error={errors.references?.message} {...register("references")} />{serverError && <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">{serverError}</p>}<div className="flex gap-3"><Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">Atrás</Button><Button type="submit" loading={isSubmitting} className="flex-[2]">Crear mi cuenta</Button></div></>}
  </form>;
}
