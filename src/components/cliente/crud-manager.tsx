"use client";

import Link from "next/link";
import {useRouter} from "next/navigation";
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
  const router=useRouter();
  const [items, setItems] = useState(initialItems);
  const directory=useDirectory(items);
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [removing, setRemoving] = useState<Address | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AddressInput>({ resolver: zodResolver(customerAddressSchema) });
  const begin = (item?: Address) => { setEditing(item ?? "new"); reset(item ? { ...item, interiorNumber: item.interiorNumber ?? "", references: item.references ?? "" } : { label: "", street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "" }); };
  const postal = register("postalCode");
  const save = handleSubmit(async (data) => {
    const result = await attempt(()=>upsertClientAddress(data, editing === "new" ? undefined : editing?.id));
    if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" });
    setItems((current) => current.some((item) => item.id === result.address.id) ? current.map((item) => item.id === result.address.id ? result.address : item) : [...current, result.address]);
    setEditing(null);router.refresh();
    showToast({ title: "Dirección guardada", description: `${result.address.label} ya está disponible para tus destinatarios.` });
  });
  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await attempt(()=>deleteClientAddress(removing.id));
    setDeleting(false);
    if (!result.ok) return showToast({ title: "No se pudo eliminar", description: result.error, variant: "error" });
    setItems((current) => current.filter((item) => item.id !== removing.id));
    setRemoving(null);router.refresh();
    showToast({ title: "Dirección eliminada" });
  };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/cliente/destinatarios" className="text-sm font-bold underline">Ver quién recibe en cada dirección</Link><Button onClick={() => begin()}><Plus className="size-4" />Agregar dirección</Button></div>
    <div className="mt-5">{directory.controls}{items.length ? <div className="grid gap-4 md:grid-cols-2">{directory.visible.map((item) => <ManagerCard key={item.id} label={item.label} detail={`${item.street} ${item.exteriorNumber}${item.interiorNumber ? ` int. ${item.interiorNumber}` : ""}, ${item.neighborhood}, C.P. ${item.postalCode}, ${item.municipality}, ${item.state}`} onEdit={() => begin(item)} onDelete={() => setRemoving(item)} />)}</div> : <EmptyState title="Todavía no tienes direcciones" description="Registra el domicilio en México donde quieres recibir tus cajas." action={<Button onClick={() => begin()}><Plus className="size-4" />Agregar dirección</Button>} />}</div>
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
  const router=useRouter();
  const [items, setItems] = useState(initialItems);
  const directory=useDirectory(items);
  const [editing, setEditing] = useState<Recipient | "new" | null>(null);
  const [removing, setRemoving] = useState<Recipient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RecipientInput>({ resolver: zodResolver(customerRecipientSchema) });
  const begin = (item?: Recipient) => { setEditing(item ?? "new"); reset(item ? { name: item.name, phone: item.phone, addressId: item.addressId } : { name: "", phone: "", addressId: addresses[0]?.id ?? "" }); };
  const save = handleSubmit(async (data) => {
    const result = await attempt(()=>upsertClientRecipient(data, editing === "new" ? undefined : editing?.id));
    if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" });
    setItems((current) => current.some((item) => item.id === result.recipient.id) ? current.map((item) => item.id === result.recipient.id ? result.recipient : item) : [...current, result.recipient]);
    setEditing(null);router.refresh();
    showToast({ title: "Destinatario guardado", description: `${result.recipient.name} ya puede recibir tus envíos.` });
  });
  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await attempt(()=>deleteClientRecipient(removing.id));
    setDeleting(false);
    if (!result.ok) return showToast({ title: "No se pudo eliminar", description: result.error, variant: "error" });
    setItems((current) => current.filter((item) => item.id !== removing.id));
    setRemoving(null);router.refresh();
    showToast({ title: "Destinatario eliminado" });
  };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/cliente/direcciones" className="text-sm font-bold underline">Agregar o editar direcciones de entrega</Link><Button onClick={() => begin()} disabled={!addresses.length}><Plus className="size-4" />Agregar destinatario</Button></div>
    <div className="mt-5">{directory.controls}{items.length ? <div className="grid gap-4 md:grid-cols-2">{directory.visible.map((item) => <ManagerCard key={item.id} label={item.name} detail={`${item.phone} · ${addressText(addresses.find((address) => address.id === item.addressId))}`} onEdit={() => begin(item)} onDelete={() => setRemoving(item)} />)}</div> : <EmptyState title="Todavía no tienes destinatarios" description={addresses.length ? "Agrega a la persona que recibirá tus cajas en México." : "Primero registra una dirección en México."} action={addresses.length ? <Button onClick={() => begin()}><Plus className="size-4" />Agregar destinatario</Button> : undefined} />}</div>
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo destinatario" : "Editar destinatario"} description="Editar este directorio no cambia las entregas ya registradas. Para corregir un paquete recibido, contacta a operaciones.">
      <form onSubmit={save} className="grid gap-4">
        <Input label="Nombre completo" error={errors.name?.message} {...register("name")} />
        <Input label="Teléfono" inputMode="tel" placeholder="+502 5555 1234" error={errors.phone?.message} {...register("phone")} />
        <Select label="Dirección de entrega" options={[{ value: "", label: "Selecciona" }, ...addresses.map((item) => ({ value: item.id, label: `${item.label} · ${item.street} ${item.exteriorNumber}, ${item.municipality}` }))]} error={errors.addressId?.message} {...register("addressId")} />
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
async function attempt<T>(work:()=>Promise<T>):Promise<T|{ok:false;error:string}>{try{return await work();}catch{return {ok:false,error:"No se confirmó la operación. Tus datos se conservan; revisa la conexión antes de reintentar."};}}
function addressText(a?:Address){return a?`${a.label}: ${a.street} ${a.exteriorNumber}, ${a.municipality}, ${a.state}`:"Dirección no disponible";}
function useDirectory<T extends {id:string}>(items:T[]){
 const [query,setQuery]=useState(""),[page,setPage]=useState(1);
 const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const found=items.filter(i=>normalize(JSON.stringify(i)).includes(normalize(query.trim())));
 const pages=Math.max(1,Math.ceil(found.length/12)),current=Math.min(page,pages);
 return {visible:found.slice((current-1)*12,current*12),controls:<div className="mb-5 grid gap-3"><Input label="Buscar en el directorio" placeholder="Nombre, teléfono o dirección…" value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/><div className="flex items-center justify-between gap-3 text-sm"><span role="status">{found.length} resultados · página {current}/{pages}</span><div className="flex gap-2"><Button variant="secondary" disabled={current===1} onClick={()=>setPage(current-1)}>Anterior</Button><Button variant="secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>Siguiente</Button></div></div>{!found.length&&items.length>0&&<p>No hay coincidencias. Prueba otra búsqueda.</p>}</div>};
}
