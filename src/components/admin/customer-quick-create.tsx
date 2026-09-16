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

type QuickInput = z.input<typeof quickCustomerSchema>;

const EMPTY: QuickInput = {
  firstName: "", paternalLastName: "", maternalLastName: "", email: "", phone: "", rfc: "",
  street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "",
};

export function CustomerQuickCreate({ onCreated, compact=false }: { compact?:boolean; onCreated: (user: User, address: Address) => void }) {
  const [people,setPeople]=useState<Array<{name:string;phone:string}>>([]);
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ user: User; invitationStatus: string } | null>(null);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<QuickInput>({ resolver: zodResolver(quickCustomerSchema), defaultValues: EMPTY });
  const postal = register("postalCode");

  const close = () => { setOpen(false); setCreated(null); reset(EMPTY);setPeople([]); };
  const submit = handleSubmit(async (data) => {
    let result;
    try { result = await createCustomerAtReception({...data,recipients:people}); } catch { showToast({title:"No se confirmó el alta",description:"Conservamos los datos. Busca el correo en el directorio antes de reintentar.",variant:"error"}); return; }
    if (!result.ok) return showToast({ title: "No se pudo crear el cliente", description: result.error, variant: "error" });
    onCreated(result.user, result.address);
    setCreated({ user: result.user, invitationStatus: result.invitationStatus });
    showToast({ title: "Cliente creado", description: `${result.user.lockerCode} quedó seleccionado en la recepción.` });
  });

  return <>
    {compact?<button type="button" onClick={()=>setOpen(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-navy-600 transition hover:bg-stone-100"><UserPlus className="size-3.5"/>Nuevo cliente</button>:<Button type="button" variant="ghost" onClick={() => setOpen(true)}><UserPlus className="size-4" />Nuevo cliente</Button>}

    <Dialog open={open} onClose={close} size="large" title={created ? "Cliente creado" : "Alta rápida de cliente"} description={created ? undefined : "Completa contacto y dirección. El cliente quedará seleccionado al crear la cuenta."}>
      {created
        ? <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-cream-100 p-5">
                <p className="text-over font-semibold uppercase text-label-600">Casillero</p>
                <p className="mt-2 font-display text-2xl font-bold text-navy-900">{created.user.lockerCode}</p>
              </div>
              <div className="rounded-lg bg-cream-100 p-5">
                <p className="text-over font-semibold uppercase text-label-600">Estado de la invitación</p>
                <p className="mt-2 font-mono text-xl font-bold text-navy-900">{created.invitationStatus}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink-700">Invitación en cola para {created.user.email} junto con las instrucciones de acceso. El cliente elegirá su contraseña desde un enlace personal.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${created.user.lockerCode} · ${created.user.email} · ${created.invitationStatus}`); showToast({ title: "Datos copiados" }); }}><Copy className="size-4" />Copiar</Button>
              <Button type="button" onClick={close}>Continuar con la recepción</Button>
            </div>
          </div>
        : <form onSubmit={(event) => { event.stopPropagation(); void submit(event); }} className="grid max-h-[65vh] gap-4 overflow-y-auto px-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Nombre(s)" error={errors.firstName?.message} {...register("firstName")} />
              <Input label="Apellido paterno" error={errors.paternalLastName?.message} {...register("paternalLastName")} />
              <Input label="Apellido materno (opcional)" error={errors.maternalLastName?.message} {...register("maternalLastName")} />
              <Input label="Correo electrónico" type="email" error={errors.email?.message} {...register("email")} />
              <Input label="Teléfono" inputMode="tel" placeholder="+502 5555 1234" error={errors.phone?.message} {...register("phone")} />
              <Input label="RFC (opcional)" className="uppercase" error={errors.rfc?.message} {...register("rfc")} />
            </div>
            <fieldset className="grid gap-3 rounded-xl border p-3"><legend>Destinatarios en México (opcional)</legend><p className="text-xs">Puedes agregar varios. Usarán la dirección de entrega indicada abajo; podrás agregar otras direcciones desde la ficha del cliente.</p>{people.map((p,i)=><div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><Input label={`Nombre del destinatario ${i+1}`} required value={p.name} onChange={e=>setPeople(people.map((p,j)=>i===j?{...p,name:e.target.value}:p))}/><Input label={`Teléfono del destinatario ${i+1}`} required type="tel" value={p.phone} onChange={e=>setPeople(people.map((p,j)=>i===j?{...p,phone:e.target.value}:p))}/><Button type="button" variant="ghost" onClick={()=>setPeople(people.filter((_,j)=>i!==j))}>Quitar</Button></div>)}<Button type="button" variant="secondary" onClick={()=>setPeople([...people,{name:"",phone:""}])}>Agregar destinatario</Button></fieldset>
            <p className="mt-2 text-over font-semibold uppercase text-label-600">Dirección de entrega en México</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Calle" error={errors.street?.message} {...register("street")} />
              <Input label="Número exterior" error={errors.exteriorNumber?.message} {...register("exteriorNumber")} />
              <Input label="Número interior (opcional)" error={errors.interiorNumber?.message} {...register("interiorNumber")} />
              <Input label="Código postal" inputMode="numeric" maxLength={5} error={errors.postalCode?.message} {...postal} onChange={(event) => { postal.onChange(event); const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality, { shouldValidate: true }); setValue("state", match.state, { shouldValidate: true }); } }} />
              <Input label="Colonia" error={errors.neighborhood?.message} {...register("neighborhood")} />
              <Input label="Municipio o alcaldía" error={errors.municipality?.message} {...register("municipality")} />
            </div>
            <Select label="Estado" options={[{ value: "", label: "Selecciona" }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={errors.state?.message} {...register("state")} />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
              <Button type="submit" loading={isSubmitting}>Crear y seleccionar</Button>
            </div>
          </form>}
    </Dialog>
  </>;
}
