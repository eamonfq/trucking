"use client";

import Link,{useAdminPermission} from "@/components/admin/admin-access";
import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArchiveRestore, Edit3, KeyRound, MapPin, PackagePlus, Plus, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { z } from "zod";
import { addCustomerNote, changeCustomerLocker, deleteCustomerAddress, deleteCustomerRecipient, resetCustomerPassword, toggleCustomerStatus, updateCustomerProfile, upsertCustomerAddress, upsertCustomerRecipient } from "@/lib/auth/admin-actions";
import { CUSTOMER_COPY, CUSTOMER_STATUS } from "@/lib/config/customers";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { administrativeAddressSchema as customerAddressSchema, customerProfileSchema, administrativeRecipientSchema as customerRecipientSchema, internalNoteSchema, lockerCodeSchema } from "@/lib/schemas/customer";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";
import {formatDeliveryAddress} from "@/lib/utils/address-display";
import type { Address, Box, Invoice, Recipient, Shipment, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {ReceptionList} from "@/components/ui/reception-list";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { CustomerArchiveDialog } from "./customer-archive-dialog";
import { restoreCustomerBoxes } from "@/lib/auth/customer-archive-actions";
import { DeleteUserLink } from "./delete-user-link";
import { useRouter } from "next/navigation";
import { customersActivity } from "@/lib/i18n/catalogs/customers-activity";
import { customersCommon } from "@/lib/i18n/catalogs/customers-common";
import { customersDetail } from "@/lib/i18n/catalogs/customers-detail";
import { customersForms } from "@/lib/i18n/catalogs/customers-forms";
import { fieldMessages } from "@/lib/i18n/catalogs/fields";
import { useLocale, useMessageTranslator, useT } from "@/lib/i18n/provider";

type CustomerTab = (typeof CUSTOMER_COPY.tabs)[number];
type ProfileInput = z.input<typeof customerProfileSchema>;
type AddressInput = z.input<typeof customerAddressSchema>;
type RecipientInput = z.input<typeof customerRecipientSchema>;
type NoteInput = z.input<typeof internalNoteSchema>;

export function CustomerDetail({ initialUser, initialAddresses, initialRecipients, boxes, shipments, invoices,canManage=false,archives=[] }: {canManage?:boolean;archives?:{id:string;reference:string;count:number;reason:string;at:string}[]; initialUser: User; initialAddresses: Address[]; initialRecipients: Recipient[]; boxes: Box[]; shipments: Shipment[]; invoices: Invoice[] }) {
  const canViewInvoices=useAdminPermission("facturas"),canViewSummary=useAdminPermission("resumen");
  const canViewBilling=canViewInvoices||canViewSummary;
  const [customer, setCustomer] = useState(initialUser);
  const [archiving,setArchiving]=useState<Box|null>(null);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [tab, setTab] = useState<CustomerTab>("Datos");
  const [confirmation, setConfirmation] = useState<"status" | "password" | "locker" | null>(null);
  const [invitationStatus, setTemporaryPassword] = useState("");
  const [lockerCode, setLockerCode] = useState(customer.lockerCode);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const t = useT(customersDetail), tc = useT(customersCommon), ta = useMessageTranslator(customersActivity), tv = useMessageTranslator(fieldMessages);
  const balance = invoices.filter((invoice) => invoice.status !== "pagada" && invoice.status !== "borrador").reduce((total, invoice) => total + invoiceTotal(invoice), 0);

  const confirmAccountAction = async () => {
    setBusy(true);
    if (confirmation === "status") {
      const result = await toggleCustomerStatus(customer.id);
      setBusy(false);
      if (!result.ok) return showToast({ title: t("No se pudo cambiar el acceso"), description: result.error, variant: "error" });
      setCustomer(result.user);
      setConfirmation(null);
      return showToast({ title: result.user.active ? t("Cuenta activada") : t("Cuenta desactivada"), description: t("El cambio quedó registrado en la actividad.") });
    }
    if (confirmation === "password") {
      const result = await resetCustomerPassword(customer.id);
      setBusy(false);
      if (!result.ok) return showToast({ title: t("No se pudo restablecer"), description: result.error, variant: "error" });
      setCustomer(result.user);
      setTemporaryPassword(result.invitationStatus);
      return;
    }
    const parsed = lockerCodeSchema.safeParse(lockerCode);
    if (!parsed.success) { setBusy(false); return showToast({ title: t("Casillero inválido"), description: tv(parsed.error.issues[0]?.message) || undefined, variant: "error" }); }
    const result = await changeCustomerLocker(customer.id, parsed.data);
    setBusy(false);
    if (!result.ok) return showToast({ title: t("No se pudo cambiar el casillero"), description: result.error, variant: "error" });
    setCustomer(result.user);
    setConfirmation(null);
    showToast({ title: t("Casillero actualizado"), description: t("{code} es el nuevo identificador de acceso.", { code: result.user.lockerCode }) });
  };

  return <div className="grid gap-6">
    <section className="overflow-hidden rounded-card bg-navy-950 text-white shadow-lift">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><div className="flex flex-wrap items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><UserRound className="size-6 text-orange-400" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">{customer.lockerCode}</p><h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{customer.firstName} {customer.paternalLastName} {customer.maternalLastName}</h1></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${CUSTOMER_STATUS[customer.active ? "active" : "inactive"].className}`}>{tc(CUSTOMER_STATUS[customer.active ? "active" : "inactive"].label)}</span></div><p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{t(CUSTOMER_COPY.detail.description)}</p></div>
<div className="flex flex-wrap gap-2"><Link href={`/admin/recepcion?customer=${customer.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600"><PackagePlus className="size-4" />{t("Crear caja")}</Link><Button variant="secondary" onClick={() => setConfirmation("status")}><ArchiveRestore className="size-4" />{customer.active ? t("Desactivar") : t("Activar")}</Button>{canManage&&<DeleteUserLink id={customer.id} name={`${customer.firstName} ${customer.paternalLastName}`}/>}</div>
      </div>
      <div className="grid border-t border-white/10 sm:grid-cols-3"><Metric label={t("Correo y teléfono")} value={customer.email || t("Sin correo")} note={customer.phone} />{canViewBilling&&<Metric label={t("Saldo pendiente")} value={formatUsd(balance)} note={t("{count} documentos", { count: invoices.length })} />}<Metric label={t("Operación")} value={t("{count} cajas", { count: boxes.length })} note={t("{count} envíos", { count: shipments.length })} /></div>
    </section>

    <div className="overflow-x-auto border-b border-stone-200" role="tablist" aria-label={t("Expediente del cliente")}><div className="flex min-w-max gap-1">{CUSTOMER_COPY.tabs.filter(item=>item!=="Facturas"||canViewBilling).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-12 border-b-2 px-4 text-sm font-bold transition ${tab === item ? "border-orange-500 text-orange-600" : "border-transparent text-navy-500 hover:text-navy-950"}`}>{t(item)}</button>)}</div></div>

    {tab === "Datos" && <ProfilePanel customer={customer} onUpdate={setCustomer} onResetPassword={() => { setTemporaryPassword(""); setConfirmation("password"); }} onChangeLocker={() => { setLockerCode(customer.lockerCode); setConfirmation("locker"); }} />}
    {tab === "Direcciones" && <AddressPanel customer={customer} items={addresses} recipients={recipients} onItems={setAddresses} onCustomer={setCustomer} />}
    {tab === "Destinatarios" && <RecipientPanel customer={customer} items={recipients} addresses={addresses} onItems={setRecipients} onCustomer={setCustomer} />}
    {tab === "Cajas" && <BoxesPanel boxes={boxes} archives={archives} onArchive={canManage?setArchiving:undefined} />}
    <CustomerArchiveDialog box={archiving} onClose={()=>setArchiving(null)}/>
    {tab === "Envíos" && <ShipmentsPanel shipments={shipments} />}
    {canViewBilling && tab === "Facturas" && <InvoicesPanel invoices={invoices} balance={balance} />}
    {tab === "Notas internas" && <NotesPanel customer={customer} onCustomer={setCustomer} />}
    {tab === "Actividad" && <ActivityPanel customer={customer} />}

    <Dialog open={confirmation === "status"} onClose={() => setConfirmation(null)} title={customer.active ? t("Desactivar cuenta") : t("Activar cuenta")} description={customer.active ? t("El cliente no podrá iniciar sesión hasta que vuelvas a activar su cuenta.") : t("El cliente recuperará el acceso a su panel.")}><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmation(null)}>{t("Cancelar")}</Button><Button variant={customer.active ? "destructive" : "primary"} loading={busy} onClick={confirmAccountAction}>{t("Confirmar")}</Button></div></Dialog>
    <Dialog open={confirmation === "password"} onClose={() => { setConfirmation(null); setTemporaryPassword(""); }} title={t("Restablecer contraseña")} description={t("Se enviará un enlace de un solo uso. El cliente elegirá su propia contraseña.")}>{invitationStatus ? <div><div className="rounded-2xl bg-cream-100 p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-navy-500">{t("Estado de la invitación")}</p><p className="mt-2 font-mono text-xl font-bold text-navy-950">{ta(invitationStatus)}</p></div><p className="mt-3 text-xs leading-5 text-navy-500">{t("El enlace queda en la cola de correos y vence a los 30 minutos.")}</p><div className="mt-5 flex justify-end"><Button onClick={() => { navigator.clipboard.writeText(ta(invitationStatus)); showToast({ title: t("Estado copiado") }); }}>{t("Copiar estado")}</Button></div></div> : <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmation(null)}>{t("Cancelar")}</Button><Button loading={busy} onClick={confirmAccountAction}>{t("Generar y enviar")}</Button></div>}</Dialog>
    <Dialog open={confirmation === "locker"} onClose={() => setConfirmation(null)} title={t("Cambiar casillero")} description={t("El nuevo número sustituirá al actual también como identificador de acceso.")}><Input label={t("Nuevo casillero")} value={lockerCode} onChange={(event) => setLockerCode(event.target.value.toUpperCase())} hint={t("Formato AL-MX-0000")} /><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmation(null)}>{t("Cancelar")}</Button><Button loading={busy} onClick={confirmAccountAction}>{t("Confirmar cambio")}</Button></div></Dialog>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="border-white/10 p-5 sm:border-r last:border-r-0"><p className="text-xs font-bold uppercase tracking-wider text-white/45">{label}</p><p className="mt-2 truncate font-display text-lg font-bold">{value}</p><p className="mt-1 text-xs text-white/55">{note}</p></div>; }

function ProfilePanel({ customer, onUpdate, onResetPassword, onChangeLocker }: { customer: User; onUpdate: (user: User) => void; onResetPassword: () => void; onChangeLocker: () => void }) {
  const { showToast } = useToast();
  const t = useT(customersDetail), tf = useT(customersForms);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileInput,unknown,z.output<typeof customerProfileSchema>>({ resolver: zodResolver(customerProfileSchema), defaultValues: { firstName: customer.firstName, paternalLastName: customer.paternalLastName, maternalLastName: customer.maternalLastName ?? "", email: customer.email, phone: customer.phone, rfc: customer.rfc ?? "", preferredLocale: customer.preferredLocale ?? "es" } });
  return <div className="grid gap-5 lg:grid-cols-[1fr_19rem]"><Card><div className="flex items-center gap-3"><Edit3 className="size-5 text-orange-500" /><div><h2 className="font-display text-xl font-bold">{t("Datos de contacto")}</h2><p className="text-sm text-navy-500">{t("Mantén actualizada la información fiscal y de contacto.")}</p></div></div><form onSubmit={handleSubmit(async (data) => { const result = await updateCustomerProfile(customer.id, data); if (!result.ok) return showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" }); onUpdate(result.user); showToast({ title: t("Datos actualizados"), description: t("El expediente ya muestra la información nueva.") }); })} className="mt-6 grid gap-4 sm:grid-cols-2"><Input label={tf("Nombre")} error={errors.firstName?.message} {...register("firstName")} /><Input label={tf("Apellido paterno")} error={errors.paternalLastName?.message} {...register("paternalLastName")} /><Input label={tf("Apellido materno")} error={errors.maternalLastName?.message} {...register("maternalLastName")} /><Input label={tf("Correo (opcional)")} type="email" error={errors.email?.message} {...register("email")} /><Input label={tf("Teléfono")} error={errors.phone?.message} {...register("phone")} /><Input label={tf("RFC opcional")} className="uppercase" error={errors.rfc?.message} {...register("rfc")} /><Select label={tf("Idioma de correos y facturas")} options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} {...register("preferredLocale")} /><div className="sm:col-span-2 flex justify-end"><Button type="submit" loading={isSubmitting}><Save className="size-4" />{t("Guardar datos")}</Button></div></form></Card><Card className="h-fit bg-cream-100 shadow-none"><ShieldCheck className="size-6 text-orange-500" /><h2 className="mt-4 font-display text-lg font-bold">{t("Acceso y seguridad")}</h2><p className="mt-2 text-sm leading-6 text-navy-500">{t("Administra el identificador de casillero o genera un acceso temporal.")}</p><div className="mt-5 grid gap-2"><Button variant="secondary" onClick={onChangeLocker}>{t("Cambiar casillero")}</Button><Button variant="secondary" onClick={onResetPassword}><KeyRound className="size-4" />{t("Restablecer contraseña")}</Button></div></Card></div>;
}

function AddressPanel({ customer, items, recipients, onItems, onCustomer }: { customer: User; items: Address[]; recipients: Recipient[]; onItems: (items: Address[]) => void; onCustomer: (user: User) => void }) {
  const [editing, setEditing] = useState<Address | null | "new">(null);
  const { showToast } = useToast();
  const t = useT(customersDetail), tf = useT(customersForms);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AddressInput, unknown, z.output<typeof customerAddressSchema>>({ resolver: zodResolver(customerAddressSchema) });
  const begin = (item?: Address) => { setEditing(item ?? "new"); reset(item ? { ...item } : { label: "", street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "" }); };
  return <><PanelHeading icon={<MapPin className="size-5" />} title={t("Direcciones en México")} description={t("Registra un domicilio completo o solo una referencia para retiro en bodega.")}><Button onClick={() => begin()}><Plus className="size-4" />{t("Agregar dirección")}</Button></PanelHeading>{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.id} className="shadow-none"><div className="flex justify-between gap-4"><div><p className="font-display text-lg font-bold">{item.label}</p><p className="mt-2 text-sm leading-6 text-navy-500">{formatDeliveryAddress(item)}</p></div><div className="flex shrink-0"><IconButton label={t("Editar {name}", { name: item.label })} onClick={() => begin(item)}><Edit3 className="size-4" /></IconButton><IconButton danger label={t("Eliminar {name}", { name: item.label })} onClick={async () => { const result = await deleteCustomerAddress(customer.id, item.id); if (!result.ok) return showToast({ title: t("No se pudo eliminar"), description: result.error, variant: "error" }); onItems(items.filter((candidate) => candidate.id !== item.id)); onCustomer(result.user); showToast({ title: t("Dirección eliminada") }); }}><Trash2 className="size-4" /></IconButton></div></div></Card>)}</div> : <EmptyState title={t("Sin direcciones")} description={t("Agrega el primer domicilio mexicano del cliente.")} />}<Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="large" title={editing === "new" ? t("Nueva dirección") : t("Editar dirección")} description={t("Para retiro en bodega basta el nombre o una referencia. El domicilio se completa si hay entrega en casa.")}><form onSubmit={handleSubmit(async (data) => { const result = await upsertCustomerAddress(customer.id, data, editing === "new" ? undefined : editing?.id); if (!result.ok) return showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" }); onItems(editing === "new" ? [...items, result.address] : items.map((item) => item.id === result.address.id ? result.address : item)); onCustomer(result.user); setEditing(null); showToast({ title: t("Dirección guardada") }); })} className="grid min-w-0 gap-4"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label={t("Nombre de bodega o referencia")} error={errors.label?.message} {...register("label")} /><Input label={tf("Calle")} error={errors.street?.message} {...register("street")} /><Input label={tf("Número exterior")} error={errors.exteriorNumber?.message} {...register("exteriorNumber")} /><Input label={tf("Número interior")} error={errors.interiorNumber?.message} {...register("interiorNumber")} /><Input label={tf("Código postal")} error={errors.postalCode?.message} {...register("postalCode", { onBlur: (event) => { const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality); setValue("state", match.state); } } })} /><Input label={tf("Colonia")} error={errors.neighborhood?.message} {...register("neighborhood")} /><Input label={tf("Municipio o alcaldía")} error={errors.municipality?.message} {...register("municipality")} /><Select label={tf("Estado")} options={[{ value: "", label: tf("Selecciona") }, ...MEXICO_STATES.map((item) => ({ value: item, label: item }))]} error={errors.state?.message} {...register("state")} /></div><Textarea label={tf("Referencias")} error={errors.references?.message} {...register("references")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("Cancelar")}</Button><Button type="submit" loading={isSubmitting}>{t("Guardar dirección")}</Button></div></form></Dialog><span className="sr-only">{t("{count} destinatarios relacionados", { count: recipients.length })}</span></>;
}

function RecipientPanel({ customer, items, addresses, onItems, onCustomer }: { customer: User; items: Recipient[]; addresses: Address[]; onItems: (items: Recipient[]) => void; onCustomer: (user: User) => void }) {
  const [editing, setEditing] = useState<Recipient | null | "new">(null);
  const { showToast } = useToast();
  const t = useT(customersDetail), tf = useT(customersForms);
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RecipientInput>({ resolver: zodResolver(customerRecipientSchema) });
  const begin = (item?: Recipient) => { setEditing(item ?? "new"); reset(item ? { name: item.name, phone: item.phone, addressId: item.addressId } : { name: "", phone: "", addressId: addresses[0]?.id ?? "" }); };
  return <><PanelHeading icon={<UserRound className="size-5" />} title={t("Destinatarios")} description={t("Asocia personas autorizadas con una dirección del cliente.")}><Button onClick={() => begin()}><Plus className="size-4" />{t("Agregar destinatario")}</Button></PanelHeading>{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.id} className="shadow-none"><div className="flex justify-between gap-4"><div><p className="font-display text-lg font-bold">{item.name}</p><p className="mt-2 text-sm text-navy-500">{item.phone} · {addresses.find((address) => address.id === item.addressId)?.label ?? t("Dirección no disponible")}</p></div><div className="flex shrink-0"><IconButton label={t("Editar {name}", { name: item.name })} onClick={() => begin(item)}><Edit3 className="size-4" /></IconButton><IconButton danger label={t("Eliminar {name}", { name: item.name })} onClick={async () => { const result = await deleteCustomerRecipient(customer.id, item.id); if (!result.ok) return showToast({ title: t("No se pudo eliminar"), description: result.error, variant: "error" }); onItems(items.filter((candidate) => candidate.id !== item.id)); onCustomer(result.user); showToast({ title: t("Destinatario eliminado") }); }}><Trash2 className="size-4" /></IconButton></div></div></Card>)}</div> : <EmptyState title={t("Sin destinatarios")} description={addresses.length ? t("Agrega a la primera persona autorizada para recibir.") : t("Agrega el contacto; puedes completar su dirección después.")} />}<Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? t("Nuevo destinatario") : t("Editar destinatario")}><form onSubmit={handleSubmit(async (data) => { const result = await upsertCustomerRecipient(customer.id, data, editing === "new" ? undefined : editing?.id); if (!result.ok) return showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" }); onItems(editing === "new" ? [...items, result.recipient] : items.map((item) => item.id === result.recipient.id ? result.recipient : item)); onCustomer(result.user); setEditing(null); showToast({ title: t("Destinatario guardado") }); })} className="grid gap-4"><Input label={t("Nombre completo")} error={errors.name?.message} {...register("name")} /><Input label={tf("Teléfono")} error={errors.phone?.message} {...register("phone")} /><Select label={t("Dirección")} options={[{value:"",label:t("Dirección pendiente (opcional)")},...addresses.map((item) => ({ value: item.id, label: item.label }))]} error={errors.addressId?.message} {...register("addressId")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>{t("Cancelar")}</Button><Button type="submit" loading={isSubmitting}>{t("Guardar destinatario")}</Button></div></form></Dialog></>;
}

function BoxesPanel({ boxes,archives,onArchive }: { boxes: Box[];archives:{id:string;reference:string;count:number;reason:string;at:string}[];onArchive?: (box:Box)=>void }) {
  const router=useRouter(),{showToast}=useToast(),[restoring,setRestoring]=useState("");
  const t = useT(customersDetail), locale = useLocale();
  return <div className="grid gap-5">{boxes.length?<ReceptionList boxes={boxes} pieceLink={box=><Link href={`/admin/cajas/${box.id}`} className="text-sm font-bold text-orange-700">{box.code} →</Link>} actions={onArchive?box=><Button variant="ghost" onClick={()=>onArchive(box)}><Trash2 className="size-4"/>{t("Retirar caja o recepción")}</Button>:undefined}/>:<EmptyState title={t("Sin cajas activas")} description={t("Las recepciones y prealertas aparecerán aquí.")}/>}{onArchive&&archives.length>0&&<section className="grid gap-3 rounded-xl border border-stone-200 bg-white p-5"><h3 className="font-display text-lg font-bold">{t("Cajas retiradas · restaurables")}</h3><p className="text-xs text-navy-500">{t("Las facturas y pagos vinculados permanecen conservados.")}</p>{archives.map(entry=><article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3"><div><strong className="text-sm">{t("{reference} · {count} caja(s)", { reference: entry.reference, count: entry.count })}</strong><p className="mt-1 text-xs text-navy-500">{entry.reason} · {formatDate(entry.at, locale)}</p></div><Button variant="secondary" loading={restoring===entry.id} disabled={!!restoring} onClick={async()=>{setRestoring(entry.id);try{const result=await restoreCustomerBoxes(entry.id);if(!result.ok){showToast({title:t("No se pudo restaurar"),description:result.error,variant:"error"});return;}router.refresh();showToast({title:t("Cajas restauradas"),description:t("Reimprime las etiquetas con la cantidad actualizada.")});}catch{showToast({title:t("No se confirmó la restauración"),variant:"error"});}finally{setRestoring("");}}}><ArchiveRestore className="size-4"/>{t("Restaurar")}</Button></article>)}</section>}</div>;
}
function ShipmentsPanel({ shipments }: { shipments: Shipment[] }) { const t = useT(customersDetail); return <DataTable rows={shipments} getRowKey={(row) => row.id} emptyTitle={t("Sin envíos")} emptyDescription={t("Los envíos creados por el cliente aparecerán aquí.")} columns={[{ key: "code", header: t("Envío"), render: (row) => <span className="font-bold text-navy-950">{row.code}</span> }, { key: "destination", header: t("Destino"), render: (row) => row.destinationCity }, { key: "boxes", header: t("Cajas"), render: (row) => row.boxIds.length }, { key: "status", header: t("Estado"), render: (row) => <StatusBadge status={row.status} /> }]} />; }
function InvoicesPanel({ invoices, balance }: { invoices: Invoice[]; balance: number }) { const t = useT(customersDetail), locale = useLocale(); return <div className="grid gap-5"><Card className="bg-navy-950 text-white"><p className="text-xs font-bold uppercase tracking-wider text-orange-400">{t("Estado de cuenta")}</p><p className="mt-2 font-display text-3xl font-bold">{formatUsd(balance)}</p><p className="mt-1 text-sm text-white/60">{t("Saldo de documentos emitidos no pagados.")}</p></Card><DataTable rows={invoices} getRowKey={(row) => row.id} emptyTitle={t("Sin facturas")} emptyDescription={t("Los documentos de cobro aparecerán aquí.")} columns={[{ key: "number", header: t("Factura"), render: (row) => <Link href={`/admin/facturas?invoice=${row.id}`} className="font-bold text-navy-950 underline decoration-stone-300 underline-offset-4 hover:text-brand-700">{row.number}</Link> }, { key: "issued", header: t("Emisión"), render: (row) => formatDate(row.issuedAt, locale) }, { key: "due", header: t("Vencimiento"), render: (row) => formatDate(row.dueAt, locale) }, { key: "total", header: t("Total"), render: (row) => <span className="font-bold">{formatUsd(invoiceTotal(row))}</span> }, { key: "status", header: t("Estado"), render: (row) => <StatusBadge status={row.status} /> }]} /></div>; }

function NotesPanel({ customer, onCustomer }: { customer: User; onCustomer: (user: User) => void }) { const { showToast } = useToast(); const t = useT(customersDetail), ta = useMessageTranslator(customersActivity), locale = useLocale(); const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<NoteInput>({ resolver: zodResolver(internalNoteSchema), defaultValues: { body: "" } }); return <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card className="h-fit bg-cream-100 shadow-none"><h2 className="font-display text-xl font-bold">{t("Agregar nota interna")}</h2><p className="mt-2 text-sm leading-6 text-navy-500">{t("Solo el equipo operativo puede ver este contenido.")}</p><form onSubmit={handleSubmit(async (data) => { const result = await addCustomerNote(customer.id, data); if (!result.ok) return showToast({ title: t("No se pudo agregar"), description: result.error, variant: "error" }); onCustomer(result.user); reset(); showToast({ title: t("Nota agregada") }); })} className="mt-5 grid gap-4"><Textarea label={t("Nota")} rows={5} error={errors.body?.message} {...register("body")} /><Button type="submit" loading={isSubmitting}>{t("Guardar nota")}</Button></form></Card><div className="grid gap-3">{customer.internalNotes.length ? customer.internalNotes.map((note) => <Card key={note.id} className="shadow-none"><p className="text-sm leading-6 text-navy-700">{note.body}</p><p className="mt-3 text-xs font-bold text-navy-400">{ta(note.actor)} · {formatDate(note.at, locale)}</p></Card>) : <EmptyState title={t("Sin notas internas")} description={t("Registra aquí acuerdos o consideraciones operativas.")} />}</div></div>; }
function ActivityPanel({ customer }: { customer: User }) { const t = useT(customersDetail), ta = useMessageTranslator(customersActivity), locale = useLocale(); return customer.activity.length ? <div className="rounded-card border border-stone-200 bg-white p-5"><ol className="relative ml-2 border-l border-stone-200">{customer.activity.map((item) => <li key={item.id} className="relative pb-7 pl-7 last:pb-0"><span className="absolute -left-1.5 top-1.5 size-3 rounded-full border-2 border-white bg-orange-500" /><p className="font-bold text-navy-950">{ta(item.description)}</p><p className="mt-1 text-xs text-navy-500">{ta(item.actor)} · {formatDate(item.at, locale)}</p></li>)}</ol></div> : <EmptyState title={t("Sin actividad")} description={t("Las acciones administrativas quedarán registradas aquí.")} />; }
function PanelHeading({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) { return <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="flex items-start gap-3"><span className="mt-0.5 text-orange-500">{icon}</span><div><h2 className="font-display text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-navy-500">{description}</p></div></div>{children}</div>; }
function IconButton({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" aria-label={label} onClick={onClick} className={`grid size-10 place-items-center rounded-full ${danger ? "text-danger-700 hover:bg-danger-50" : "text-navy-600 hover:bg-cream-100"}`}>{children}</button>; }
