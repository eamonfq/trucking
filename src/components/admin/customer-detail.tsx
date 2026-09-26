"use client";

import Link,{useAdminPermission} from "@/components/admin/admin-access";
import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArchiveRestore, Edit3, KeyRound, MapPin, PackagePlus, Plus, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { z } from "zod";
import { addCustomerNote, changeCustomerLocker, deleteCustomerAddress, deleteCustomerRecipient, resetCustomerPassword, toggleCustomerStatus, updateCustomerProfile, upsertCustomerAddress, upsertCustomerRecipient } from "@/lib/auth/admin-actions";
import { useCatalog } from "@/components/ui/catalog-provider";
import { CUSTOMER_COPY, CUSTOMER_STATUS } from "@/lib/config/customers";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { getStatusLabel } from "@/lib/config/status";
import { customerAddressSchema, customerProfileSchema, customerRecipientSchema, internalNoteSchema, lockerCodeSchema } from "@/lib/schemas/customer";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";
import type { Address, Box, Invoice, Recipient, Shipment, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type CustomerTab = (typeof CUSTOMER_COPY.tabs)[number];
type ProfileInput = z.input<typeof customerProfileSchema>;
type AddressInput = z.input<typeof customerAddressSchema>;
type RecipientInput = z.input<typeof customerRecipientSchema>;
type NoteInput = z.input<typeof internalNoteSchema>;

export function CustomerDetail({ initialUser, initialAddresses, initialRecipients, boxes, shipments, invoices }: { initialUser: User; initialAddresses: Address[]; initialRecipients: Recipient[]; boxes: Box[]; shipments: Shipment[]; invoices: Invoice[] }) {
  const canViewInvoices=useAdminPermission("facturas"),canViewSummary=useAdminPermission("resumen");
  const canViewBilling=canViewInvoices||canViewSummary;
  const [customer, setCustomer] = useState(initialUser);
  const [addresses, setAddresses] = useState(initialAddresses);
  const [recipients, setRecipients] = useState(initialRecipients);
  const [tab, setTab] = useState<CustomerTab>("Datos");
  const [confirmation, setConfirmation] = useState<"status" | "password" | "locker" | null>(null);
  const [invitationStatus, setTemporaryPassword] = useState("");
  const [lockerCode, setLockerCode] = useState(customer.lockerCode);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();
  const balance = invoices.filter((invoice) => invoice.status !== "pagada" && invoice.status !== "borrador").reduce((total, invoice) => total + invoiceTotal(invoice), 0);

  const confirmAccountAction = async () => {
    setBusy(true);
    if (confirmation === "status") {
      const result = await toggleCustomerStatus(customer.id);
      setBusy(false);
      if (!result.ok) return showToast({ title: "No se pudo cambiar el acceso", description: result.error, variant: "error" });
      setCustomer(result.user);
      setConfirmation(null);
      return showToast({ title: result.user.active ? "Cuenta activada" : "Cuenta desactivada", description: "El cambio quedó registrado en la actividad." });
    }
    if (confirmation === "password") {
      const result = await resetCustomerPassword(customer.id);
      setBusy(false);
      if (!result.ok) return showToast({ title: "No se pudo restablecer", description: result.error, variant: "error" });
      setCustomer(result.user);
      setTemporaryPassword(result.invitationStatus);
      return;
    }
    const parsed = lockerCodeSchema.safeParse(lockerCode);
    if (!parsed.success) { setBusy(false); return showToast({ title: "Casillero inválido", description: parsed.error.issues[0]?.message, variant: "error" }); }
    const result = await changeCustomerLocker(customer.id, parsed.data);
    setBusy(false);
    if (!result.ok) return showToast({ title: "No se pudo cambiar el casillero", description: result.error, variant: "error" });
    setCustomer(result.user);
    setConfirmation(null);
    showToast({ title: "Casillero actualizado", description: `${result.user.lockerCode} es el nuevo identificador de acceso.` });
  };

  return <div className="grid gap-6">
    <section className="overflow-hidden rounded-card bg-navy-950 text-white shadow-lift">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div><div className="flex flex-wrap items-center gap-3"><span className="grid size-12 place-items-center rounded-2xl bg-white/10"><UserRound className="size-6 text-orange-400" /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-orange-400">{customer.lockerCode}</p><h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">{customer.firstName} {customer.paternalLastName} {customer.maternalLastName}</h1></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${CUSTOMER_STATUS[customer.active ? "active" : "inactive"].className}`}>{CUSTOMER_STATUS[customer.active ? "active" : "inactive"].label}</span></div><p className="mt-4 max-w-2xl text-sm leading-6 text-white/65">{CUSTOMER_COPY.detail.description}</p></div>
        <div className="flex flex-wrap gap-2"><Link href={`/admin/recepcion?customer=${customer.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white hover:bg-orange-600"><PackagePlus className="size-4" />Crear caja</Link><Button variant="secondary" onClick={() => setConfirmation("status")}><ArchiveRestore className="size-4" />{customer.active ? "Desactivar" : "Activar"}</Button></div>
      </div>
      <div className="grid border-t border-white/10 sm:grid-cols-3"><Metric label="Correo y teléfono" value={customer.email} note={customer.phone} />{canViewBilling&&<Metric label="Saldo pendiente" value={formatUsd(balance)} note={`${invoices.length} documentos`} />}<Metric label="Operación" value={`${boxes.length} cajas`} note={`${shipments.length} envíos`} /></div>
    </section>

    <div className="overflow-x-auto border-b border-stone-200" role="tablist" aria-label="Expediente del cliente"><div className="flex min-w-max gap-1">{CUSTOMER_COPY.tabs.filter(item=>item!=="Facturas"||canViewBilling).map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`min-h-12 border-b-2 px-4 text-sm font-bold transition ${tab === item ? "border-orange-500 text-orange-600" : "border-transparent text-navy-500 hover:text-navy-950"}`}>{item}</button>)}</div></div>

    {tab === "Datos" && <ProfilePanel customer={customer} onUpdate={setCustomer} onResetPassword={() => { setTemporaryPassword(""); setConfirmation("password"); }} onChangeLocker={() => { setLockerCode(customer.lockerCode); setConfirmation("locker"); }} />}
    {tab === "Direcciones" && <AddressPanel customer={customer} items={addresses} recipients={recipients} onItems={setAddresses} onCustomer={setCustomer} />}
    {tab === "Destinatarios" && <RecipientPanel customer={customer} items={recipients} addresses={addresses} onItems={setRecipients} onCustomer={setCustomer} />}
    {tab === "Cajas" && <BoxesPanel boxes={boxes} />}
    {tab === "Envíos" && <ShipmentsPanel shipments={shipments} />}
    {canViewBilling && tab === "Facturas" && <InvoicesPanel invoices={invoices} balance={balance} />}
    {tab === "Notas internas" && <NotesPanel customer={customer} onCustomer={setCustomer} />}
    {tab === "Actividad" && <ActivityPanel customer={customer} />}

    <Dialog open={confirmation === "status"} onClose={() => setConfirmation(null)} title={customer.active ? "Desactivar cuenta" : "Activar cuenta"} description={customer.active ? "El cliente no podrá iniciar sesión hasta que vuelvas a activar su cuenta." : "El cliente recuperará el acceso a su panel."}><div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmation(null)}>Cancelar</Button><Button variant={customer.active ? "destructive" : "primary"} loading={busy} onClick={confirmAccountAction}>Confirmar</Button></div></Dialog>
    <Dialog open={confirmation === "password"} onClose={() => { setConfirmation(null); setTemporaryPassword(""); }} title="Restablecer contraseña" description="Se enviará un enlace de un solo uso. El cliente elegirá su propia contraseña.">{invitationStatus ? <div><div className="rounded-2xl bg-cream-100 p-5 text-center"><p className="text-xs font-bold uppercase tracking-wider text-navy-500">Estado de la invitación</p><p className="mt-2 font-mono text-xl font-bold text-navy-950">{invitationStatus}</p></div><p className="mt-3 text-xs leading-5 text-navy-500">El enlace queda en la cola de correos y vence a los 30 minutos.</p><div className="mt-5 flex justify-end"><Button onClick={() => { navigator.clipboard.writeText(invitationStatus); showToast({ title: "Estado copiado" }); }}>Copiar estado</Button></div></div> : <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmation(null)}>Cancelar</Button><Button loading={busy} onClick={confirmAccountAction}>Generar y enviar</Button></div>}</Dialog>
    <Dialog open={confirmation === "locker"} onClose={() => setConfirmation(null)} title="Cambiar casillero" description="El nuevo número sustituirá al actual también como identificador de acceso."><Input label="Nuevo casillero" value={lockerCode} onChange={(event) => setLockerCode(event.target.value.toUpperCase())} hint="Formato AL-MX-0000" /><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setConfirmation(null)}>Cancelar</Button><Button loading={busy} onClick={confirmAccountAction}>Confirmar cambio</Button></div></Dialog>
  </div>;
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <div className="border-white/10 p-5 sm:border-r last:border-r-0"><p className="text-xs font-bold uppercase tracking-wider text-white/45">{label}</p><p className="mt-2 truncate font-display text-lg font-bold">{value}</p><p className="mt-1 text-xs text-white/55">{note}</p></div>; }

function ProfilePanel({ customer, onUpdate, onResetPassword, onChangeLocker }: { customer: User; onUpdate: (user: User) => void; onResetPassword: () => void; onChangeLocker: () => void }) {
  const { showToast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileInput>({ resolver: zodResolver(customerProfileSchema), defaultValues: { firstName: customer.firstName, paternalLastName: customer.paternalLastName, maternalLastName: customer.maternalLastName ?? "", email: customer.email, phone: customer.phone, rfc: customer.rfc ?? "" } });
  return <div className="grid gap-5 lg:grid-cols-[1fr_19rem]"><Card><div className="flex items-center gap-3"><Edit3 className="size-5 text-orange-500" /><div><h2 className="font-display text-xl font-bold">Datos de contacto</h2><p className="text-sm text-navy-500">Mantén actualizada la información fiscal y de contacto.</p></div></div><form onSubmit={handleSubmit(async (data) => { const result = await updateCustomerProfile(customer.id, data); if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" }); onUpdate(result.user); showToast({ title: "Datos actualizados", description: "El expediente ya muestra la información nueva." }); })} className="mt-6 grid gap-4 sm:grid-cols-2"><Input label="Nombre" error={errors.firstName?.message} {...register("firstName")} /><Input label="Apellido paterno" error={errors.paternalLastName?.message} {...register("paternalLastName")} /><Input label="Apellido materno" error={errors.maternalLastName?.message} {...register("maternalLastName")} /><Input label="Correo" type="email" error={errors.email?.message} {...register("email")} /><Input label="Teléfono" error={errors.phone?.message} {...register("phone")} /><Input label="RFC opcional" className="uppercase" error={errors.rfc?.message} {...register("rfc")} /><div className="sm:col-span-2 flex justify-end"><Button type="submit" loading={isSubmitting}><Save className="size-4" />Guardar datos</Button></div></form></Card><Card className="h-fit bg-cream-100 shadow-none"><ShieldCheck className="size-6 text-orange-500" /><h2 className="mt-4 font-display text-lg font-bold">Acceso y seguridad</h2><p className="mt-2 text-sm leading-6 text-navy-500">Administra el identificador de casillero o genera un acceso temporal.</p><div className="mt-5 grid gap-2"><Button variant="secondary" onClick={onChangeLocker}>Cambiar casillero</Button><Button variant="secondary" onClick={onResetPassword}><KeyRound className="size-4" />Restablecer contraseña</Button></div></Card></div>;
}

function AddressPanel({ customer, items, recipients, onItems, onCustomer }: { customer: User; items: Address[]; recipients: Recipient[]; onItems: (items: Address[]) => void; onCustomer: (user: User) => void }) {
  const [editing, setEditing] = useState<Address | null | "new">(null);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<AddressInput>({ resolver: zodResolver(customerAddressSchema) });
  const begin = (item?: Address) => { setEditing(item ?? "new"); reset(item ? { ...item } : { label: "", street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "" }); };
  return <><PanelHeading icon={<MapPin className="size-5" />} title="Direcciones en México" description="Gestiona los domicilios que pueden asociarse a destinatarios."><Button onClick={() => begin()}><Plus className="size-4" />Agregar dirección</Button></PanelHeading>{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.id} className="shadow-none"><div className="flex justify-between gap-4"><div><p className="font-display text-lg font-bold">{item.label}</p><p className="mt-2 text-sm leading-6 text-navy-500">{item.street} {item.exteriorNumber}{item.interiorNumber ? ` int. ${item.interiorNumber}` : ""}, {item.neighborhood}, C.P. {item.postalCode}, {item.municipality}, {item.state}</p></div><div className="flex shrink-0"><IconButton label={`Editar ${item.label}`} onClick={() => begin(item)}><Edit3 className="size-4" /></IconButton><IconButton danger label={`Eliminar ${item.label}`} onClick={async () => { const result = await deleteCustomerAddress(customer.id, item.id); if (!result.ok) return showToast({ title: "No se pudo eliminar", description: result.error, variant: "error" }); onItems(items.filter((candidate) => candidate.id !== item.id)); onCustomer(result.user); showToast({ title: "Dirección eliminada" }); }}><Trash2 className="size-4" /></IconButton></div></div></Card>)}</div> : <EmptyState title="Sin direcciones" description="Agrega el primer domicilio mexicano del cliente." />}<Dialog open={Boolean(editing)} onClose={() => setEditing(null)} size="large" title={editing === "new" ? "Nueva dirección" : "Editar dirección"} description="El código postal puede completar municipio y estado."><form onSubmit={handleSubmit(async (data) => { const result = await upsertCustomerAddress(customer.id, data, editing === "new" ? undefined : editing?.id); if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" }); onItems(editing === "new" ? [...items, result.address] : items.map((item) => item.id === result.address.id ? result.address : item)); onCustomer(result.user); setEditing(null); showToast({ title: "Dirección guardada" }); })} className="grid max-h-[65vh] gap-4 overflow-y-auto px-1"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Nombre" error={errors.label?.message} {...register("label")} /><Input label="Calle" error={errors.street?.message} {...register("street")} /><Input label="Número exterior" error={errors.exteriorNumber?.message} {...register("exteriorNumber")} /><Input label="Número interior" error={errors.interiorNumber?.message} {...register("interiorNumber")} /><Input label="Código postal" error={errors.postalCode?.message} {...register("postalCode", { onBlur: (event) => { const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality); setValue("state", match.state); } } })} /><Input label="Colonia" error={errors.neighborhood?.message} {...register("neighborhood")} /><Input label="Municipio o alcaldía" error={errors.municipality?.message} {...register("municipality")} /><Select label="Estado" options={[{ value: "", label: "Selecciona" }, ...MEXICO_STATES.map((item) => ({ value: item, label: item }))]} error={errors.state?.message} {...register("state")} /></div><Textarea label="Referencias" error={errors.references?.message} {...register("references")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" loading={isSubmitting}>Guardar dirección</Button></div></form></Dialog><span className="sr-only">{recipients.length} destinatarios relacionados</span></>;
}

function RecipientPanel({ customer, items, addresses, onItems, onCustomer }: { customer: User; items: Recipient[]; addresses: Address[]; onItems: (items: Recipient[]) => void; onCustomer: (user: User) => void }) {
  const [editing, setEditing] = useState<Recipient | null | "new">(null);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RecipientInput>({ resolver: zodResolver(customerRecipientSchema) });
  const begin = (item?: Recipient) => { setEditing(item ?? "new"); reset(item ? { name: item.name, phone: item.phone, addressId: item.addressId } : { name: "", phone: "", addressId: addresses[0]?.id ?? "" }); };
  return <><PanelHeading icon={<UserRound className="size-5" />} title="Destinatarios" description="Asocia personas autorizadas con una dirección del cliente."><Button onClick={() => begin()} disabled={!addresses.length}><Plus className="size-4" />Agregar destinatario</Button></PanelHeading>{items.length ? <div className="grid gap-4 md:grid-cols-2">{items.map((item) => <Card key={item.id} className="shadow-none"><div className="flex justify-between gap-4"><div><p className="font-display text-lg font-bold">{item.name}</p><p className="mt-2 text-sm text-navy-500">{item.phone} · {addresses.find((address) => address.id === item.addressId)?.label ?? "Dirección no disponible"}</p></div><div className="flex shrink-0"><IconButton label={`Editar ${item.name}`} onClick={() => begin(item)}><Edit3 className="size-4" /></IconButton><IconButton danger label={`Eliminar ${item.name}`} onClick={async () => { const result = await deleteCustomerRecipient(customer.id, item.id); if (!result.ok) return showToast({ title: "No se pudo eliminar", description: result.error, variant: "error" }); onItems(items.filter((candidate) => candidate.id !== item.id)); onCustomer(result.user); showToast({ title: "Destinatario eliminado" }); }}><Trash2 className="size-4" /></IconButton></div></div></Card>)}</div> : <EmptyState title="Sin destinatarios" description={addresses.length ? "Agrega a la primera persona autorizada para recibir." : "Primero registra una dirección mexicana."} />}<Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo destinatario" : "Editar destinatario"}><form onSubmit={handleSubmit(async (data) => { const result = await upsertCustomerRecipient(customer.id, data, editing === "new" ? undefined : editing?.id); if (!result.ok) return showToast({ title: "No se pudo guardar", description: result.error, variant: "error" }); onItems(editing === "new" ? [...items, result.recipient] : items.map((item) => item.id === result.recipient.id ? result.recipient : item)); onCustomer(result.user); setEditing(null); showToast({ title: "Destinatario guardado" }); })} className="grid gap-4"><Input label="Nombre completo" error={errors.name?.message} {...register("name")} /><Input label="Teléfono" error={errors.phone?.message} {...register("phone")} /><Select label="Dirección" options={addresses.map((item) => ({ value: item.id, label: item.label }))} error={errors.addressId?.message} {...register("addressId")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button><Button type="submit" loading={isSubmitting}>Guardar destinatario</Button></div></form></Dialog></>;
}

function BoxesPanel({ boxes }: { boxes: Box[] }) { const categories=useCatalog(); return <DataTable rows={boxes} getRowKey={(row) => row.id} emptyTitle="Sin cajas" emptyDescription="Las cajas recibidas o prealertadas aparecerán aquí." columns={[{ key: "code", header: "Caja", render: (row) => <Link href={`/admin/cajas/${row.id}`} className="font-bold text-orange-600">{row.code}</Link> }, { key: "category", header: "Categoría", render: (row) => categories.find((item) => item.id === row.categoryId)?.name }, { key: "weight", header: "Peso", render: (row) => `${row.weightLb} lb` }, { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} /> }, { key: "received", header: "Recepción", render: (row) => row.receivedAt ? formatDate(row.receivedAt) : getStatusLabel(row.status) }]} />; }
function ShipmentsPanel({ shipments }: { shipments: Shipment[] }) { return <DataTable rows={shipments} getRowKey={(row) => row.id} emptyTitle="Sin envíos" emptyDescription="Los envíos creados por el cliente aparecerán aquí." columns={[{ key: "code", header: "Envío", render: (row) => <span className="font-bold text-navy-950">{row.code}</span> }, { key: "destination", header: "Destino", render: (row) => row.destinationCity }, { key: "boxes", header: "Cajas", render: (row) => row.boxIds.length }, { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} /> }]} />; }
function InvoicesPanel({ invoices, balance }: { invoices: Invoice[]; balance: number }) { return <div className="grid gap-5"><Card className="bg-navy-950 text-white"><p className="text-xs font-bold uppercase tracking-wider text-orange-400">Estado de cuenta</p><p className="mt-2 font-display text-3xl font-bold">{formatUsd(balance)}</p><p className="mt-1 text-sm text-white/60">Saldo de documentos emitidos no pagados.</p></Card><DataTable rows={invoices} getRowKey={(row) => row.id} emptyTitle="Sin facturas" emptyDescription="Los documentos de cobro aparecerán aquí." columns={[{ key: "number", header: "Factura", render: (row) => <span className="font-bold text-navy-950">{row.number}</span> }, { key: "issued", header: "Emisión", render: (row) => formatDate(row.issuedAt) }, { key: "due", header: "Vencimiento", render: (row) => formatDate(row.dueAt) }, { key: "total", header: "Total", render: (row) => <span className="font-bold">{formatUsd(invoiceTotal(row))}</span> }, { key: "status", header: "Estado", render: (row) => <StatusBadge status={row.status} /> }]} /></div>; }

function NotesPanel({ customer, onCustomer }: { customer: User; onCustomer: (user: User) => void }) { const { showToast } = useToast(); const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<NoteInput>({ resolver: zodResolver(internalNoteSchema), defaultValues: { body: "" } }); return <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><Card className="h-fit bg-cream-100 shadow-none"><h2 className="font-display text-xl font-bold">Agregar nota interna</h2><p className="mt-2 text-sm leading-6 text-navy-500">Solo el equipo operativo puede ver este contenido.</p><form onSubmit={handleSubmit(async (data) => { const result = await addCustomerNote(customer.id, data); if (!result.ok) return showToast({ title: "No se pudo agregar", description: result.error, variant: "error" }); onCustomer(result.user); reset(); showToast({ title: "Nota agregada" }); })} className="mt-5 grid gap-4"><Textarea label="Nota" rows={5} error={errors.body?.message} {...register("body")} /><Button type="submit" loading={isSubmitting}>Guardar nota</Button></form></Card><div className="grid gap-3">{customer.internalNotes.length ? customer.internalNotes.map((note) => <Card key={note.id} className="shadow-none"><p className="text-sm leading-6 text-navy-700">{note.body}</p><p className="mt-3 text-xs font-bold text-navy-400">{note.actor} · {formatDate(note.at)}</p></Card>) : <EmptyState title="Sin notas internas" description="Registra aquí acuerdos o consideraciones operativas." />}</div></div>; }
function ActivityPanel({ customer }: { customer: User }) { return customer.activity.length ? <div className="rounded-card border border-stone-200 bg-white p-5"><ol className="relative ml-2 border-l border-stone-200">{customer.activity.map((item) => <li key={item.id} className="relative pb-7 pl-7 last:pb-0"><span className="absolute -left-1.5 top-1.5 size-3 rounded-full border-2 border-white bg-orange-500" /><p className="font-bold text-navy-950">{item.description}</p><p className="mt-1 text-xs text-navy-500">{item.actor} · {formatDate(item.at)}</p></li>)}</ol></div> : <EmptyState title="Sin actividad" description="Las acciones administrativas quedarán registradas aquí." />; }
function PanelHeading({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) { return <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="flex items-start gap-3"><span className="mt-0.5 text-orange-500">{icon}</span><div><h2 className="font-display text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-navy-500">{description}</p></div></div>{children}</div>; }
function IconButton({ label, danger = false, onClick, children }: { label: string; danger?: boolean; onClick: () => void; children: ReactNode }) { return <button type="button" aria-label={label} onClick={onClick} className={`grid size-10 place-items-center rounded-full ${danger ? "text-danger-700 hover:bg-danger-50" : "text-navy-600 hover:bg-cream-100"}`}>{children}</button>; }
