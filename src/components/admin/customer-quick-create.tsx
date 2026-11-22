"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Copy, UserPlus } from "lucide-react";
import { z } from "zod";
import { createCustomerAtReception } from "@/lib/auth/admin-actions";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { quickCustomerSchema } from "@/lib/schemas/customer";
import type { Address, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { receptionCustomer, receptionInvitationStatus } from "@/lib/i18n/catalogs/reception-customer";
import { useMessageTranslator, useT } from "@/lib/i18n/provider";

type QuickInput = z.input<typeof quickCustomerSchema>;

const EMPTY: QuickInput = {
  firstName: "", paternalLastName: "", maternalLastName: "", email: "", phone: "", rfc: "", preferredLocale: "es",
  street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "",
};

export function CustomerQuickCreate({ onCreated, compact=false }: { compact?:boolean; onCreated: (user: User, address: Address) => void }) {
  const [people,setPeople]=useState<Array<{name:string;phone:string}>>([]);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ user: User; invitationStatus: string } | null>(null);
  const { showToast } = useToast();
  const t = useT(receptionCustomer), status = useMessageTranslator(receptionInvitationStatus);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<QuickInput,unknown,z.output<typeof quickCustomerSchema>>({ resolver: zodResolver(quickCustomerSchema), defaultValues: EMPTY });
  const postal = register("postalCode");

  const close = () => { setOpen(false); setCreated(null); reset(EMPTY);setPeople([]); };
  const submit = handleSubmit(async (data) => {
    let result;
    try { result = await createCustomerAtReception({...data,recipients:people}); } catch { showToast({title:t("No se confirmó el alta"),description:t("Conservamos los datos. Busca el correo en el directorio antes de reintentar."),variant:"error"}); return; }
    if (!result.ok) return showToast({ title: t("No se pudo crear el cliente"), description: result.error, variant: "error" });
    onCreated(result.user, result.address);
    setCreated({ user: result.user, invitationStatus: result.invitationStatus });
    showToast({ title: t("Cliente creado"), description: t("{locker} quedó seleccionado en la recepción.", { locker: result.user.lockerCode }) });
  });

  return <>
    {compact?<button type="button" onClick={()=>setOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-navy-600 transition hover:bg-stone-100"><UserPlus className="size-3.5"/>{t("Nuevo cliente")}</button>:<Button type="button" variant="ghost" onClick={() => setOpen(true)}><UserPlus className="size-4" />{t("Nuevo cliente")}</Button>}

    <Dialog open={open} onClose={close} size="large" title={created ? t("Cliente creado") : t("Alta rápida de cliente")} description={created ? undefined : t("Solo nombre, apellido y teléfono son obligatorios. Correo y dirección se pueden completar después.")}>
      {created
        ? <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-cream-100 p-5">
                <p className="text-over font-semibold uppercase text-label-600">{t("Casillero")}</p>
                <p className="mt-2 font-display text-2xl font-bold text-navy-900">{created.user.lockerCode}</p>
              </div>
              <div className="rounded-lg bg-cream-100 p-5">
                <p className="text-over font-semibold uppercase text-label-600">{t("Estado de la invitación")}</p>
                <p className="mt-2 font-mono text-xl font-bold text-navy-900">{status(created.invitationStatus)}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink-700">{created.user.email?t("Invitación en cola para {email}. El cliente elegirá su contraseña desde un enlace personal.",{email:created.user.email}):t("Cliente operativo creado sin correo. No se enviaron emails ni se habilitó el acceso al portal.")}</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${created.user.lockerCode} · ${created.user.email} · ${status(created.invitationStatus)}`); showToast({ title: t("Datos copiados") }); }}><Copy className="size-4" />{t("Copiar")}</Button>
              <Button type="button" onClick={close}>{t("Continuar con la recepción")}</Button>
            </div>
          </div>
        : <form onSubmit={(event) => { event.stopPropagation(); void submit(event); }} className="grid min-w-0 gap-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label={t("Nombre(s)")} error={errors.firstName?.message} {...register("firstName")} />
              <Input label={t("Apellido paterno")} error={errors.paternalLastName?.message} {...register("paternalLastName")} />
              <Input label={t("Apellido materno (opcional)")} error={errors.maternalLastName?.message} {...register("maternalLastName")} />
              <Input label={t("Correo electrónico (opcional)")} type="email" error={errors.email?.message} {...register("email")} />
              <Input label={t("Teléfono")} inputMode="tel" placeholder="+502 5555 1234" error={errors.phone?.message} {...register("phone")} />
              <Input label={t("RFC (opcional)")} className="uppercase" error={errors.rfc?.message} {...register("rfc")} />
              <Select label={t("Idioma de correos y facturas")} options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} {...register("preferredLocale")} />
            </div>
            <fieldset className="grid gap-3 rounded-xl border p-3"><legend>{t("Destinatarios en México (opcional)")}</legend><p className="text-xs">{t("Puedes agregar varios. Usarán la dirección de entrega indicada abajo; podrás agregar otras direcciones desde la ficha del cliente.")}</p>{people.map((p,i)=><div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input label={t("Nombre del destinatario {n}",{n:i+1})} required value={p.name} onChange={e=>setPeople(people.map((p,j)=>i===j?{...p,name:e.target.value}:p))}/><Input label={t("Teléfono del destinatario {n}",{n:i+1})} required type="tel" value={p.phone} onChange={e=>setPeople(people.map((p,j)=>i===j?{...p,phone:e.target.value}:p))}/><Button type="button" variant="ghost" onClick={()=>setPeople(people.filter((_,j)=>i!==j))}>{t("Quitar")}</Button></div>)}<Button type="button" variant="secondary" onClick={()=>setPeople([...people,{name:"",phone:""}])}>{t("Agregar destinatario")}</Button></fieldset>
            <p className="mt-2 text-over font-semibold uppercase text-label-600">{t("Dirección de entrega en México · opcional")}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label={t("Calle")} error={errors.street?.message} {...register("street")} />
              <Input label={t("Número exterior")} error={errors.exteriorNumber?.message} {...register("exteriorNumber")} />
              <Input label={t("Número interior (opcional)")} error={errors.interiorNumber?.message} {...register("interiorNumber")} />
              <Input label={t("Código postal")} inputMode="numeric" maxLength={5} error={errors.postalCode?.message} {...postal} onChange={(event) => { postal.onChange(event); const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality, { shouldValidate: true }); setValue("state", match.state, { shouldValidate: true }); } }} />
              <Input label={t("Colonia")} error={errors.neighborhood?.message} {...register("neighborhood")} />
              <Input label={t("Municipio o alcaldía")} error={errors.municipality?.message} {...register("municipality")} />
            </div>
            <Select label={t("Estado")} options={[{ value: "", label: t("Selecciona") }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={errors.state?.message} {...register("state")} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={close}>{t("Cancelar")}</Button>
              <Button type="submit" loading={isSubmitting}>{t("Crear y seleccionar")}</Button>
            </div>
          </form>}
    </Dialog>
  </>;
}
