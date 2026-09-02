"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MEXICO_STATES } from "@/lib/config/mexico";
import { mexicanAddressSchema } from "@/lib/schemas/address";
import { recipientSchema } from "@/lib/schemas/logistics";
import type { Address, Recipient } from "@/lib/types";

const addressFormSchema = mexicanAddressSchema.extend({ label: z.string().min(2, "Escribe un nombre para identificarla.") });
type AddressInput = z.input<typeof addressFormSchema>;

export function AddressManager({ initialItems }: { initialItems: Address[] }) {
  const [items, setItems] = useState(initialItems); const [open, setOpen] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const { register, handleSubmit, reset, formState: { errors } } = useForm<AddressInput>({ resolver: zodResolver(addressFormSchema) });
  const beginCreate = () => { setEditingId(null); reset({ label: "", street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "" }); setOpen(true); };
  const beginEdit = (item: Address) => { setEditingId(item.id); reset(item); setOpen(true); };
  const save = handleSubmit((data) => { if (editingId) setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...data } : item)); else setItems((current) => [...current, { id: `addr-${Date.now()}`, userId: "usr-001", ...data }]); setOpen(false); });
  return <><div className="flex justify-end"><Button onClick={beginCreate}><Plus className="size-4" />Agregar dirección</Button></div><div className="mt-5 grid gap-4 md:grid-cols-2">{items.map((item) => <ManagerCard key={item.id} label={item.label} detail={`${item.street} ${item.exteriorNumber}, ${item.neighborhood}, C.P. ${item.postalCode}, ${item.municipality}, ${item.state}`} onEdit={() => beginEdit(item)} onDelete={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))} />)}</div><Dialog open={open} onClose={() => setOpen(false)} title={editingId ? "Editar dirección" : "Nueva dirección"} description="Todos los campos usan formato mexicano."><form onSubmit={save} className="grid max-h-[65vh] gap-4 overflow-y-auto px-1"><Input label="Nombre" error={errors.label?.message} {...register("label")} /><div className="grid gap-4 sm:grid-cols-2"><Input label="Calle" error={errors.street?.message} {...register("street")} /><Input label="Número exterior" error={errors.exteriorNumber?.message} {...register("exteriorNumber")} /><Input label="Número interior" {...register("interiorNumber")} /><Input label="Colonia" error={errors.neighborhood?.message} {...register("neighborhood")} /><Input label="Código postal" error={errors.postalCode?.message} {...register("postalCode")} /><Input label="Municipio o alcaldía" error={errors.municipality?.message} {...register("municipality")} /></div><Select label="Estado" options={[{ value: "", label: "Selecciona" }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={errors.state?.message} {...register("state")} /><Textarea label="Referencias" {...register("references")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div></form></Dialog></>;
}

type RecipientInput = z.input<typeof recipientSchema>;
export function RecipientManager({ initialItems, addresses }: { initialItems: Recipient[]; addresses: Address[] }) {
  const [items, setItems] = useState(initialItems); const [open, setOpen] = useState(false); const [editingId, setEditingId] = useState<string | null>(null); const { register, handleSubmit, reset, formState: { errors } } = useForm<RecipientInput>({ resolver: zodResolver(recipientSchema) });
  const beginCreate = () => { setEditingId(null); reset({ name: "", phone: "", addressId: "" }); setOpen(true); }; const beginEdit = (item: Recipient) => { setEditingId(item.id); reset({ name: item.name, phone: item.phone.replace("+52", ""), addressId: item.addressId }); setOpen(true); };
  const save = handleSubmit((data) => { const normalized = { ...data, phone: `+52${data.phone}` }; if (editingId) setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...normalized } : item)); else setItems((current) => [...current, { id: `rec-${Date.now()}`, userId: "usr-001", ...normalized }]); setOpen(false); });
  return <><div className="flex justify-end"><Button onClick={beginCreate}><Plus className="size-4" />Agregar destinatario</Button></div><div className="mt-5 grid gap-4 md:grid-cols-2">{items.map((item) => <ManagerCard key={item.id} label={item.name} detail={`${item.phone} · ${addresses.find((address) => address.id === item.addressId)?.label ?? "Dirección"}`} onEdit={() => beginEdit(item)} onDelete={() => setItems((current) => current.filter((candidate) => candidate.id !== item.id))} />)}</div><Dialog open={open} onClose={() => setOpen(false)} title={editingId ? "Editar destinatario" : "Nuevo destinatario"}><form onSubmit={save} className="grid gap-4"><Input label="Nombre completo" error={errors.name?.message} {...register("name")} /><Input label="Teléfono +52" error={errors.phone?.message} {...register("phone")} /><Select label="Dirección" options={[{ value: "", label: "Selecciona" }, ...addresses.map((item) => ({ value: item.id, label: item.label }))]} error={errors.addressId?.message} {...register("addressId")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div></form></Dialog></>;
}

function ManagerCard({ label, detail, onEdit, onDelete }: { label: string; detail: string; onEdit: () => void; onDelete: () => void }) { return <article className="rounded-card border border-stone-200 bg-white p-5"><div className="flex justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-navy-950">{label}</h2><p className="mt-2 text-sm leading-6 text-navy-500">{detail}</p></div><div className="flex gap-1"><button onClick={onEdit} aria-label={`Editar ${label}`} className="grid size-10 place-items-center rounded-full hover:bg-cream-100"><Edit3 className="size-4" /></button><button onClick={onDelete} aria-label={`Eliminar ${label}`} className="grid size-10 place-items-center rounded-full text-danger-700 hover:bg-danger-50"><Trash2 className="size-4" /></button></div></div></article>; }
