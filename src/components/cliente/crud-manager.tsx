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
import { formatDeliveryAddress } from "@/lib/utils/address-display";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { clientDirectory } from "@/lib/i18n/catalogs/client-directory";
import { useT } from "@/lib/i18n/provider";

type AddressInput = z.input<typeof customerAddressSchema>;
type RecipientInput = z.input<typeof customerRecipientSchema>;

export function AddressManager({ initialItems }: { initialItems: Address[] }) {
  const router=useRouter();
  const t = useT(clientDirectory);
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
    const result = await attempt(()=>upsertClientAddress(data, editing === "new" ? undefined : editing?.id), t("No se confirmó la operación. Tus datos se conservan; revisa la conexión antes de reintentar."));
    if (!result.ok) return showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" });
    setItems((current) => current.some((item) => item.id === result.address.id) ? current.map((item) => item.id === result.address.id ? result.address : item) : [...current, result.address]);
    setEditing(null);router.refresh();
    showToast({ title: t("Dirección guardada"), description: t("{label} ya está disponible para tus destinatarios.", { label: result.address.label }) });
  });
  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await attempt(()=>deleteClientAddress(removing.id), t("No se confirmó la operación. Tus datos se conservan; revisa la conexión antes de reintentar."));
    setDeleting(false);
    if (!result.ok) return showToast({ title: t("No se pudo eliminar"), description: result.error, variant: "error" });
    setItems((current) => current.filter((item) => item.id !== removing.id));
    setRemoving(null);router.refresh();
    showToast({ title: t("Dirección eliminada") });
  };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/cliente/destinatarios" className="text-sm font-bold underline">{t("Ver quién recibe en cada dirección")}</Link><Button onClick={() => begin()}><Plus className="size-4" />{t("Agregar dirección")}</Button></div>
    <div className="mt-5">{directory.controls}{items.length ? <div className="grid gap-4 md:grid-cols-2">{directory.visible.map((item) => <ManagerCard key={item.id} label={item.label} detail={formatDeliveryAddress(item)} onEdit={() => begin(item)} onDelete={() => setRemoving(item)} />)}</div> : <EmptyState title={t("Todavía no tienes direcciones")} description={t("Registra el domicilio en México donde quieres recibir tus cajas.")} action={<Button onClick={() => begin()}><Plus className="size-4" />{t("Agregar dirección")}</Button>} />}</div>
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="large" title={editing === "new" ? t("Nueva dirección") : t("Editar dirección")} description={t("Para retiro en bodega basta un nombre o referencia. Completa el domicilio si deseas entrega en casa.")}>
      <form onSubmit={save} className="grid min-w-0 gap-4">
        <Input label={t("Nombre de bodega o referencia")} placeholder={t("Ej. Bodega Valle de Juárez")} error={errors.label?.message} {...register("label")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t("Calle")} error={errors.street?.message} {...register("street")} />
          <Input label={t("Número exterior")} error={errors.exteriorNumber?.message} {...register("exteriorNumber")} />
          <Input label={t("Número interior (opcional)")} error={errors.interiorNumber?.message} {...register("interiorNumber")} />
          <Input label={t("Colonia")} error={errors.neighborhood?.message} {...register("neighborhood")} />
          <Input label={t("Código postal")} inputMode="numeric" maxLength={5} error={errors.postalCode?.message} {...postal} onChange={(event) => { postal.onChange(event); const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality, { shouldValidate: true }); setValue("state", match.state, { shouldValidate: true }); } }} />
          <Input label={t("Municipio o alcaldía")} error={errors.municipality?.message} {...register("municipality")} />
        </div>
        <Select label={t("Estado")} options={[{ value: "", label: t("Selecciona") }, ...MEXICO_STATES.map((state) => ({ value: state, label: state }))]} error={errors.state?.message} {...register("state")} />
        <Textarea label={t("Referencia adicional (opcional)")} error={errors.references?.message} {...register("references")} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("Cancelar")}</Button><Button type="submit" loading={isSubmitting}>{t("Guardar dirección")}</Button></div>
      </form>
    </Dialog>
    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title={t("Eliminar dirección")} description={t("Se quitará {name} de tu cuenta. Esta acción no se puede deshacer.", { name: removing?.label ?? "" })}>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRemoving(null)}>{t("Cancelar")}</Button><Button variant="destructive" loading={deleting} onClick={confirmDelete}>{t("Eliminar")}</Button></div>
    </Dialog>
  </>;
}

export function RecipientManager({ initialItems, addresses }: { initialItems: Recipient[]; addresses: Address[] }) {
  const router=useRouter();
  const t = useT(clientDirectory);
  const [items, setItems] = useState(initialItems);
  const directory=useDirectory(items);
  const [editing, setEditing] = useState<Recipient | "new" | null>(null);
  const [removing, setRemoving] = useState<Recipient | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RecipientInput>({ resolver: zodResolver(customerRecipientSchema) });
  const begin = (item?: Recipient) => { setEditing(item ?? "new"); reset(item ? { name: item.name, phone: item.phone, addressId: item.addressId } : { name: "", phone: "", addressId: addresses[0]?.id ?? "" }); };
  const save = handleSubmit(async (data) => {
    const result = await attempt(()=>upsertClientRecipient(data, editing === "new" ? undefined : editing?.id), t("No se confirmó la operación. Tus datos se conservan; revisa la conexión antes de reintentar."));
    if (!result.ok) return showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" });
    setItems((current) => current.some((item) => item.id === result.recipient.id) ? current.map((item) => item.id === result.recipient.id ? result.recipient : item) : [...current, result.recipient]);
    setEditing(null);router.refresh();
    showToast({ title: t("Destinatario guardado"), description: t("{name} ya puede recibir tus envíos.", { name: result.recipient.name }) });
  });
  const confirmDelete = async () => {
    if (!removing) return;
    setDeleting(true);
    const result = await attempt(()=>deleteClientRecipient(removing.id), t("No se confirmó la operación. Tus datos se conservan; revisa la conexión antes de reintentar."));
    setDeleting(false);
    if (!result.ok) return showToast({ title: t("No se pudo eliminar"), description: result.error, variant: "error" });
    setItems((current) => current.filter((item) => item.id !== removing.id));
    setRemoving(null);router.refresh();
    showToast({ title: t("Destinatario eliminado") });
  };
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3"><Link href="/cliente/direcciones" className="text-sm font-bold underline">{t("Agregar o editar direcciones de entrega")}</Link><Button onClick={() => begin()} disabled={!addresses.length}><Plus className="size-4" />{t("Agregar destinatario")}</Button></div>
    <div className="mt-5">{directory.controls}{items.length ? <div className="grid gap-4 md:grid-cols-2">{directory.visible.map((item) => <ManagerCard key={item.id} label={item.name} detail={`${item.phone} · ${addressText(addresses.find((address) => address.id === item.addressId), t("Dirección no disponible"))}`} onEdit={() => begin(item)} onDelete={() => setRemoving(item)} />)}</div> : <EmptyState title={t("Todavía no tienes destinatarios")} description={addresses.length ? t("Agrega a la persona que recibirá tus cajas en México.") : t("Primero registra una dirección en México.")} action={addresses.length ? <Button onClick={() => begin()}><Plus className="size-4" />{t("Agregar destinatario")}</Button> : undefined} />}</div>
    <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? t("Nuevo destinatario") : t("Editar destinatario")} description={t("Editar este directorio no cambia las entregas ya registradas. Para corregir un paquete recibido, contacta a operaciones.")}>
      <form onSubmit={save} className="grid gap-4">
        <Input label={t("Nombre completo")} error={errors.name?.message} {...register("name")} />
        <Input label={t("Teléfono")} inputMode="tel" placeholder="+502 5555 1234" error={errors.phone?.message} {...register("phone")} />
        <Select label={t("Dirección o bodega de retiro")} options={[{ value: "", label: t("Selecciona") }, ...addresses.map((item) => ({ value: item.id, label: formatDeliveryAddress(item) || item.label }))]} error={errors.addressId?.message} {...register("addressId")} />
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("Cancelar")}</Button><Button type="submit" loading={isSubmitting}>{t("Guardar destinatario")}</Button></div>
      </form>
    </Dialog>
    <Dialog open={Boolean(removing)} onClose={() => setRemoving(null)} title={t("Eliminar destinatario")} description={t("Se quitará {name} de tu cuenta. Esta acción no se puede deshacer.", { name: removing?.name ?? "" })}>
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setRemoving(null)}>{t("Cancelar")}</Button><Button variant="destructive" loading={deleting} onClick={confirmDelete}>{t("Eliminar")}</Button></div>
    </Dialog>
  </>;
}

function ManagerCard({ label, detail, onEdit, onDelete }: { label: string; detail: string; onEdit: () => void; onDelete: () => void }) {
  const t = useT(clientDirectory);
  return <article className="rounded-card border border-stone-200 bg-white p-5"><div className="flex justify-between gap-4"><div><h2 className="font-display text-lg font-bold text-navy-950">{label}</h2><p className="mt-2 text-sm leading-6 text-navy-500">{detail}</p></div><div className="flex shrink-0 gap-1"><button type="button" onClick={onEdit} aria-label={t("Editar {label}", { label })} className="grid size-10 place-items-center rounded-full hover:bg-cream-100"><Edit3 className="size-4" /></button><button type="button" onClick={onDelete} aria-label={t("Eliminar {label}", { label })} className="grid size-10 place-items-center rounded-full text-danger-700 hover:bg-danger-50"><Trash2 className="size-4" /></button></div></div></article>;
}
async function attempt<T>(work:()=>Promise<T>,fallback:string):Promise<T|{ok:false;error:string}>{try{return await work();}catch{return {ok:false,error:fallback};}}
function addressText(a:Address|undefined,missing:string){return a?formatDeliveryAddress(a):missing;}
function useDirectory<T extends {id:string}>(items:T[]){
 const t=useT(clientDirectory);
 const [query,setQuery]=useState(""),[page,setPage]=useState(1);
 const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const found=items.filter(i=>normalize(JSON.stringify(i)).includes(normalize(query.trim())));
 const pages=Math.max(1,Math.ceil(found.length/12)),current=Math.min(page,pages);
 return {visible:found.slice((current-1)*12,current*12),controls:<div className="mb-5 grid gap-3"><Input label={t("Buscar en el directorio")} placeholder={t("Nombre, teléfono o dirección…")} value={query} onChange={e=>{setQuery(e.target.value);setPage(1);}}/><div className="flex items-center justify-between gap-3 text-sm"><span role="status">{t("{count} resultados · página {current}/{pages}", { count: found.length, current, pages })}</span><div className="flex gap-2"><Button variant="secondary" disabled={current===1} onClick={()=>setPage(current-1)}>{t("Anterior")}</Button><Button variant="secondary" disabled={current===pages} onClick={()=>setPage(current+1)}>{t("Siguiente")}</Button></div></div>{!found.length&&items.length>0&&<p>{t("No hay coincidencias. Prueba otra búsqueda.")}</p>}</div>};
}
