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

export function CustomerQuickCreate({ onCreated }: { onCreated: (user: User, address: Address) => void }) {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<{ user: User; temporaryPassword: string } | null>(null);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<QuickInput>({ resolver: zodResolver(quickCustomerSchema), defaultValues: EMPTY });
  const postal = register("postalCode");

  const close = () => { setOpen(false); setCreated(null); reset(EMPTY); };
  const submit = handleSubmit(async (data) => {
    const result = await createCustomerAtReception(data);
    if (!result.ok) return showToast({ title: "No se pudo crear el cliente", description: result.error, variant: "error" });
    onCreated(result.user, result.address);
    setCreated({ user: result.user, temporaryPassword: result.temporaryPassword });
    showToast({ title: "Cliente creado", description: `${result.user.lockerCode} quedó seleccionado en la recepción.` });
  });

  return <>
    <Button type="button" variant="ghost" onClick={() => setOpen(true)}><UserPlus className="size-4" />Nuevo cliente</Button>

    <Dialog open={open} onClose={close} size="large" title={created ? "Cliente creado" : "Alta rápida de cliente"} description={created ? undefined : "Datos mínimos para poder recibir la caja. La contraseña se genera y se envía por correo."}>
      {created
        ? <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-cream-100 p-5">
                <p className="text-over font-semibold uppercase text-label-600">Casillero</p>
                <p className="mt-2 font-display text-2xl font-bold text-navy-900">{created.user.lockerCode}</p>
              </div>
              <div className="rounded-lg bg-cream-100 p-5">
                <p className="text-over font-semibold uppercase text-label-600">Contraseña temporal</p>
                <p className="mt-2 font-mono text-xl font-bold text-navy-900">{created.temporaryPassword}</p>
              </div>
            </div>
            <p className="text-sm leading-6 text-ink-700">Se envió a {created.user.email} junto con las instrucciones de acceso. Copia estos datos ahora: dejarán de mostrarse al cerrar.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${created.user.lockerCode} · ${created.user.email} · ${created.temporaryPassword}`); showToast({ title: "Datos copiados" }); }}><Copy className="size-4" />Copiar</Button>
              <Button type="button" onClick={close}>Continuar con la recepción</Button>
            </div>
          </div>
        : <form onSubmit={submit} className="grid max-h-[65vh] gap-4 overflow-y-auto px-1">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Nombre(s)" error={errors.firstName?.message} {...register("firstName")} />
              <Input label="Apellido paterno" error={errors.paternalLastName?.message} {...register("paternalLastName")} />
              <Input label="Apellido materno (opcional)" error={errors.maternalLastName?.message} {...register("maternalLastName")} />
              <Input label="Correo electrónico" type="email" error={errors.email?.message} {...register("email")} />
              <Input label="Teléfono +52" inputMode="numeric" placeholder="10 dígitos" error={errors.phone?.message} {...register("phone")} />
              <Input label="RFC (opcional)" className="uppercase" error={errors.rfc?.message} {...register("rfc")} />
            </div>
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
