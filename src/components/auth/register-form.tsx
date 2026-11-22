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
import { auth, authMessages } from "@/lib/i18n/catalogs/auth";
import { useMessageTranslator, useT } from "@/lib/i18n/provider";

type RegistrationForm = z.input<typeof registrationSchema>;
const accountFields: Array<keyof RegistrationForm> = ["firstName", "paternalLastName", "email", "phone", "password", "confirmPassword", "acceptedTerms"];

export function RegisterForm({ originMode, warehouseAddress }: { originMode: "casillero" | "entrega-directa"; warehouseAddress: string }) {
  const t = useT(auth);
  const tm = useMessageTranslator(authMessages);
  const [step, setStep] = useState(1);
  const [result, setResult] = useState<{ lockerCode: string; emailStatus: string } | null>(null);
  const [serverError, setServerError] = useState("");
  const { register, handleSubmit, trigger, control, setValue, formState: { errors, isSubmitting } } = useForm<RegistrationForm>({ resolver: zodResolver(registrationSchema), defaultValues: { acceptedTerms: false, state: "" } });
  const password = useWatch({ control, name: "password" }) ?? "";
  const next = async () => { if (await trigger(accountFields)) setStep(2); };
  const postalRegistration = register("postalCode");
  const submit = handleSubmit(async (data) => { setServerError(""); try { const response = await registerAccount(data); if (!response.ok) return setServerError(response.message); setResult({ lockerCode: response.lockerCode, emailStatus: response.emailStatus }); } catch { setServerError(t("No pudimos completar el registro. Intenta de nuevo; si ya recibiste un correo, sigue sus instrucciones.")); } });
  if (result) return <div className="rounded-card border border-stone-200 bg-white p-6 shadow-soft sm:p-8"><span className="grid size-14 place-items-center rounded-2xl bg-success-50 text-success-700"><CheckCircle2 className="size-7" /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-orange-600">{t("Cuenta creada")}</p><h2 className="mt-2 font-display text-3xl font-bold text-navy-950">{t("Tu casillero es {code}", { code: result.lockerCode })}</h2><p className="mt-4 text-sm leading-7 text-navy-500">{originMode === "casillero" ? t("Usa este código junto a tu nombre en cada compra que envíes a nuestra bodega.") : t("Tu cuenta está lista. Coordina la entrega o recolección de tu primera caja.")}</p>{originMode === "casillero" && <div className="mt-6 rounded-2xl bg-cream-100 p-5"><p className="text-xs font-bold uppercase tracking-wider text-navy-500">{t("Bodega en Miami")}</p><p className="mt-2 font-semibold text-navy-950">{warehouseAddress === "Dirección de bodega en Miami por confirmar" ? t("Dirección de bodega en Miami por confirmar") : warehouseAddress}</p><button type="button" onClick={() => navigator.clipboard.writeText(`${result.lockerCode} · ${warehouseAddress}`)} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600"><Copy className="size-4" />{t("Copiar instrucciones")}</button></div>}<p className="mt-5 text-xs text-navy-400">{t("Revisa tu correo para confirmar la cuenta. El mensaje está en cola de envío; si no llega, solicita otro enlace.")}</p><Link href="/verificar" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-navy-950 px-6 text-sm font-bold text-white">{t("Verificar mi correo")} <PackageCheck className="size-4" /></Link></div>;
  return <form onSubmit={submit} className="grid gap-5"><div className="mb-2"><div className="flex justify-between text-xs font-bold text-navy-500"><span className={step === 1 ? "text-orange-600" : ""}>{t("1 · Cuenta")}</span><span className={step === 2 ? "text-orange-600" : ""}>{t("2 · Ubicación opcional")}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: step === 1 ? "50%" : "100%" }} /></div></div>
    {step === 1 ? <><div className="grid gap-4 sm:grid-cols-2"><Input label={t("Nombre(s)")} error={tm(errors.firstName?.message)} {...register("firstName")} /><Input label={t("Apellido paterno")} error={tm(errors.paternalLastName?.message)} {...register("paternalLastName")} /><Input label={t("Apellido materno (opcional)")} {...register("maternalLastName")} /><Input label={t("Correo electrónico")} type="email" autoComplete="email" error={tm(errors.email?.message)} {...register("email")} /><Input label={t("Teléfono")} inputMode="tel" placeholder="+502 5555 1234" error={tm(errors.phone?.message)} {...register("phone")} /><span /></div><Input label={t("Contraseña")} type="password" autoComplete="new-password" error={tm(errors.password?.message)} {...register("password")} /><PasswordStrength value={password} /><Input label={t("Confirma tu contraseña")} type="password" autoComplete="new-password" error={tm(errors.confirmPassword?.message)} {...register("confirmPassword")} /><div><Checkbox label={t("Acepto los términos y el aviso de privacidad")} {...register("acceptedTerms")} />{errors.acceptedTerms?.message && <p className="mt-2 text-xs text-danger-700">{tm(errors.acceptedTerms.message)}</p>}</div><Button type="button" onClick={next} className="w-full">{t("Continuar con ubicación")}</Button></> : <><div className="grid gap-4 sm:grid-cols-2"><Input label={t("Calle")} error={tm(errors.street?.message)} {...register("street")} /><Input label={t("Número exterior")} error={tm(errors.exteriorNumber?.message)} {...register("exteriorNumber")} /><Input label={t("Número interior (opcional)")} {...register("interiorNumber")} /><Input label={t("Colonia")} error={tm(errors.neighborhood?.message)} {...register("neighborhood")} /><Input label={t("Código postal")} inputMode="numeric" maxLength={5} error={tm(errors.postalCode?.message)} {...postalRegistration} onChange={(event) => { postalRegistration.onChange(event); const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("state", match.state, { shouldValidate: true }); setValue("municipality", match.municipality, { shouldValidate: true }); } }} /><Input label={t("Municipio o alcaldía")} error={tm(errors.municipality?.message)} {...register("municipality")} /><Select label={t("Estado")} options={[{ value: "", label: t("Selecciona") }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={tm(errors.state?.message)} {...register("state")} /><Input label={t("RFC (opcional)")} error={tm(errors.rfc?.message)} {...register("rfc")} /></div><Textarea label={t("Bodega o referencia de retiro (opcional)")} placeholder={t("Ej. Valle de Juárez")} error={tm(errors.references?.message)} {...register("references")} />{serverError && <p role="alert" className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">{tm(serverError)}</p>}<div className="flex gap-3"><Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1">{t("Atrás")}</Button><Button type="submit" loading={isSubmitting} className="flex-[2]">{t("Crear mi cuenta")}</Button></div></>}
  </form>;
}
