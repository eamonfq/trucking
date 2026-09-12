"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { deleteClientAddress, deleteClientRecipient, upsertClientAddress, upsertClientRecipient } from "@/lib/auth/client-actions";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { customerAddressSchema, customerRecipientSchema } from "@/lib/schemas/customer";
import type { Address, Recipient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type AddressInput = z.input<typeof customerAddressSchema>;
type RecipientInput = z.input<typeof customerRecipientSchema>;

export function AddressManager({ initialItems }: { initialItems: Address[] }) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AddressInput>({ resolver: zodResolver(customerAddressSchema) });
  const begin = (item?: Address) => { setEditing(item ?? "new"); reset(item ? { ...item, interiorNumber: item.interiorNumber ?? "", references: item.references ?? "" } : { label: "", street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "" }); };
  const postal = register("postalCode");
  const save = handleSubmit(async (data) => {
    const result = await upsertClientAddress(data, editing === "new" ? undefined : editing?.id);
    if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" });
    setItems((current) => current.some((item) => item.id === result.address.id) ? current.map((item) => item.id === result.address.id ? result.address : item) : [...current, result.address]);
    setEditing(null);
    showToast({ title: "Dirección guardada", description: `${result.address.label} ya está disponible para tus destinatarios.` });
  });
  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await deleteClientAddress(removing.id);
    setDeleting(false);
    if (!result.ok) return showToast({ title: "No se pudo eliminar", description: result.error, variant: "error" });
    setItems((current) => current.filter((item) => item.id !== removing.id));
    setRemoving(null);
    showToast({ title: "Dirección eliminada" });
  };
  return <>
    <div className="flex justify-end"><Button onClick={() => begin()}><Plus className="size-4" />Agregar dirección</Button></div>
    <div className="mt-5">{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <ManagerCard key={item.id} label={item.label} detail={`${item.street} ${item.exteriorNumber}${item.interiorNumber ? ` int. ${item.interiorNumber}` : ""}, ${item.neighborhood}, C.P. ${item.postalCode}, ${item.municipality}, ${item.state}`} onEdit={() => begin(item)} onDelete={() => setRemoving(item)} />)}</div> : <EmptyState title="Todavía no tienes direcciones" description="Registra el domicilio en México donde quieres recibir tus cajas." action={<Button onClick={() => begin()}><Plus className="size-4" />Agregar dirección</Button>} />}</div>
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="large" title={editing === "new" ? "Nueva dirección" : "Editar dirección"} description="Al escribir el código postal completamos municipio y estado.">
      <form onSubmit={save} className="grid max-h-[65vh] gap-4 overflow-y-auto px-1">
        <Input label="Nombre para identificarla" error={errors.label?.message} {...register("label")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Calle" error={errors.street?.message} {...register("street")} />
          <Input label="Número exterior" error={errors.exteriorNumber?.message} {...register("exteriorNumber")} />
          <Input label="Número interior (opcional)" error={errors.interiorNumber?.message} {...register("interiorNumber")} />
          <Input label="Colonia" error={errors.neighborhood?.message} {...register("neighborhood")} />
          <Input label="Código postal" inputMode="numeric" maxLength={5} error={errors.postalCode?.message} {...postal} onChange={(event) => { postal.onChange(event); const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality, { shouldValidate: true }); setValue("state", match.state, { shouldValidate: true }); } }} />
          <Input label="Municipio o alcaldía" error={errors.municipality?.message} {...register("municipality")} />
        </div>
        <Select label="Estado" options={[{ value: "", label: "Selecciona" }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={errors.state?.message} {...register("state")} />
        <Textarea label="Referencias (opcional)" error={errors.references?.message} {...register("references")} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" loading={isSubmitting}>Guardar dirección</Button></div>
      </form>
    </Dialog>
    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Eliminar dirección" description={`Se quitará ${removing?.label ?? ""} de tu cuenta. Esta acción no se puede deshacer.`}>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="destructive" loading={deleting} onClick={confirmDelete}>Eliminar</Button></div>
    </Dialog>
  </>;
}

export function RecipientManager({ initialItems, addresses }: { initialItems: Recipient[]; addresses: Address[] }) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<Recipient | "new" | null>(null);
  const [removing, setRemoving] = useState<Recipient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RecipientInput>({ resolver: zodResolver(customerRecipientSchema) });
  const begin = (item?: Recipient) => { setEditing(item ?? "new"); reset(item ? { name: item.name, phone: item.phone, addressId: item.addressId } : { name: "", phone: "", addressId: addresses[0]?.id ?? "" }); };
  const save = handleSubmit(async (data) => {
    const result = await upsertClientRecipient(data, editing === "new" ? undefined : editing?.id);
    if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" });
    setItems((current) => current.some((item) => item.id === result.recipient.id) ? current.map((item) => item.id === result.recipient.id ? result.recipient : item) : [...current, result.recipient]);
    setEditing(null);
    showToast({ title: "Destinatario guardado", description: `${result.recipient.name} ya puede recibir tus envíos.` });
  });
  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await deleteClientRecipient(removing.id);
    setDeleting(false);
    if (!result.ok) return showToast({ title: "No se pudo eliminar", description: result.error, variant: "error" });
    setItems((current) => current.filter((item) => item.id !== removing.id));
    setRemoving(null);
    showToast({ title: "Destinatario eliminado" });
  };
  return <>
    <div className="flex justify-end"><Button onClick={() => begin()} disabled={!addresses.length}><Plus className="size-4" />Agregar destinatario</Button></div>
    <div className="mt-5">{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <ManagerCard key={item.id} label={item.name} detail={`${item.phone} · ${addresses.find((address) => address.id === item.addressId)?.label ?? "Dirección no disponible"}`} onEdit={() => begin(item)} onDelete={() => setRemoving(item)} />)}</div> : <EmptyState title="Todavía no tienes destinatarios" description={addresses.length ? "Agrega a la persona que recibirá tus cajas en México." : "Primero registra una dirección en México."} action={addresses.length ? <Button onClick={() => begin()}><Plus className="size-4" />Agregar destinatario</Button> : undefined} />}</div>
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo destinatario" : "Editar destinatario"} description="La persona debe presentar identificación al recibir.">
      <form onSubmit={save} className="grid gap-4">
        <Input label="Nombre completo" error={errors.name?.message} {...register("name")} />
        <Input label="Teléfono" inputMode="tel" placeholder="+502 5555 1234" error={errors.phone?.message} {...register("phone")} />
        <Select label="Dirección de entrega" options={[{ value: "", label: "Selecciona" }, ...addresses.map((item) => ({ value: item.id, label: item.label }))]} error={errors.addressId?.message} {...register("addressId")} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" loading={isSubmitting}>Guardar destinatario</Button></div>
      </form>
    </Dialog>
    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title="Eliminar destinatario" description={`Se quitará ${removing?.name ?? ""} de tu cuenta. Esta acción no se puede deshacer.`}>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="destructive" loading={deleting} onClick={confirmDelete}>Eliminar</Button></div>
    </Dialog>
  </>;
}

function ManagerCard({ label, detail, onEdit, onDelete }: { label: string; detail: string; onEdit: () => void; onDelete: () => void }) {
  return <article className="rounded-card border border-stone-200 bg-white p-5"><div className="flex justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-navy-950">{label}</h2><p className="mt-2 text-sm leading-6 text-navy-500">{detail}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={onEdit} aria-label={`Editar ${label}`} className="grid size-10 place-items-center rounded-full hover:bg-cream-100"><Edit3 className="size-4" /></button><button type="button" onClick={onDelete} aria-label={`Eliminar ${label}`} className="grid size-10 place-items-center rounded-full text-danger-700 hover:bg-danger-50"><Trash2 className="size-4" /></button></div></div></article>;
}
