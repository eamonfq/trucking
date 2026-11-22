"use client";

import Link from "@/components/admin/admin-access";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Plus, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { z } from "zod";
import { createCustomerAsAdmin } from "@/lib/auth/admin-actions";
import { CUSTOMER_COPY, CUSTOMER_STATUS } from "@/lib/config/customers";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { quickCustomerSchema as registrationSchema } from "@/lib/schemas/customer";
import { formatDate, formatUsd } from "@/lib/utils/format";
import { invoiceTotal } from "@/lib/utils/invoices";
import type { Address, Box, Invoice, Shipment, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { customersCommon } from "@/lib/i18n/catalogs/customers-common";
import { customersDirectory } from "@/lib/i18n/catalogs/customers-directory";
import { customersForms } from "@/lib/i18n/catalogs/customers-forms";
import { useLocale, useT } from "@/lib/i18n/provider";

type RegistrationInput = z.input<typeof registrationSchema>;

export function CustomerManager({ initialUsers, initialAddresses, boxes, shipments, invoices }: { initialUsers: User[]; initialAddresses: Address[]; boxes: Box[]; shipments: Shipment[]; invoices: Invoice[] }) {
  const [customers, setCustomers] = useState(initialUsers.filter((user) => user.role === "cliente"));
  const [customerAddresses, setCustomerAddresses] = useState(initialAddresses);
  const [search, setSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const t = useT(customersDirectory), tf = useT(customersForms), tc = useT(customersCommon), locale = useLocale();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<RegistrationInput,unknown,z.output<typeof registrationSchema>>({ resolver: zodResolver(registrationSchema), defaultValues: { state: "", rfc: "", preferredLocale: "es" } });
  const cities = useMemo(() => Array.from(new Set(customerAddresses.map((address) => address.municipality))).sort(), [customerAddresses]);
  const filtered = useMemo(() => customers.filter((customer) => {
    const term = search.trim().toLowerCase();
    const searchable = `${customer.firstName} ${customer.paternalLastName} ${customer.maternalLastName ?? ""} ${customer.email} ${customer.lockerCode} ${customer.phone}`.toLowerCase();
    const matchesStatus = accountStatus === "all" || String(customer.active) === accountStatus;
    const matchesCity = city === "all" || customerAddresses.some((address) => address.userId === customer.id && address.municipality === city);
    return (!term || searchable.includes(term)) && matchesStatus && matchesCity;
  }), [accountStatus, city, customerAddresses, customers, search]);

  const lastMovement = (customer: User) => {
    const dates = [
      ...customer.activity.map((item) => item.at),
      ...boxes.filter((box) => box.userId === customer.id).flatMap((box) => box.timeline.map((item) => item.at)),
      ...shipments.filter((shipment) => shipment.userId === customer.id).flatMap((shipment) => shipment.timeline.map((item) => item.at)),
    ].sort().reverse();
    return dates[0];
  };

  const beginCreate = () => {
    reset({ firstName: "", paternalLastName: "", maternalLastName: "", email: "", phone: "", street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "", rfc: "", preferredLocale: "es" });
    setOpen(true);
  };

  return <div className="grid gap-6">
    <div className="grid gap-3 rounded-card border border-stone-200 bg-white p-4 lg:grid-cols-[1fr_.55fr_.65fr_auto]">
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-cream-100 px-4"><Search className="size-4 text-navy-400" /><span className="sr-only">{t("Buscar cliente")}</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Nombre, correo, casillero o teléfono")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <Select label={t("Estado de cuenta")} hideLabel value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)} options={[{ value: "all", label: t("Todos los estados") }, { value: "true", label: tc(CUSTOMER_STATUS.active.label) }, { value: "false", label: tc(CUSTOMER_STATUS.inactive.label) }]} />
      <Select label={t("Ciudad")} hideLabel value={city} onChange={(event) => setCity(event.target.value)} options={[{ value: "all", label: t("Todas las ciudades") }, ...cities.map((item) => ({ value: item, label: item }))]} />
      <Button onClick={beginCreate}><Plus className="size-4" />{t("Nuevo cliente")}</Button>
    </div>

    <p className="flex items-center gap-2 text-sm text-navy-500"><SlidersHorizontal className="size-4" />{t("{count} clientes encontrados", { count: filtered.length })}</p>
    <DataTable rows={filtered} getRowKey={(row) => row.id} emptyTitle={t(CUSTOMER_COPY.directory.emptyTitle)} emptyDescription={t(CUSTOMER_COPY.directory.emptyDescription)} columns={[
      { key: "locker", header: t("Casillero"), render: (row) => <Link href={`/admin/clientes/${row.id}`} className="font-bold text-orange-600 hover:text-orange-700">{row.lockerCode}</Link> },
      { key: "name", header: t("Nombre"), render: (row) => <div><p className="font-bold text-navy-950">{row.firstName} {row.paternalLastName}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${CUSTOMER_STATUS[row.active ? "active" : "inactive"].className}`}>{tc(CUSTOMER_STATUS[row.active ? "active" : "inactive"].label)}</span></div> },
      { key: "contact", header: t("Contacto"), render: (row) => <div><p>{row.email}</p><p className="mt-1 text-xs text-navy-400">{row.phone}</p></div> },
      { key: "warehouse", header: t("En bodega"), render: (row) => <span className="font-display text-lg font-bold text-navy-950">{boxes.filter((box) => box.userId === row.id && box.status === "en-bodega").length}</span> },
      { key: "balance", header: t("Saldo pendiente"), render: (row) => <span className="font-bold text-navy-950">{formatUsd(invoices.filter((invoice) => invoice.userId === row.id && invoice.status !== "pagada" && invoice.status !== "borrador").reduce((total, invoice) => total + invoiceTotal(invoice), 0))}</span> },
      { key: "movement", header: t("Último movimiento"), render: (row) => lastMovement(row) ? formatDate(lastMovement(row)!, locale) : t("Sin movimientos") },
      { key: "action", header: "", className: "text-right", render: (row) => <Link href={`/admin/clientes/${row.id}`} className="inline-flex min-h-10 items-center rounded-full border border-stone-200 px-4 font-bold hover:bg-cream-100">{t("Abrir expediente")}</Link> },
    ]} />

    <Dialog open={open} onClose={() => setOpen(false)} size="large" title={t("Registrar cliente")} description={t("Usa los mismos datos y validaciones del registro público.")}>
      <form onSubmit={handleSubmit(async (data) => {
        let result;
        try { result = await createCustomerAsAdmin(data); } catch { return showToast({title:t("No se confirmó el alta"),description:t("Conservamos tus datos. Revisa el directorio antes de reintentar."),variant:"error"}); }
        if (!result.ok) return showToast({ title: t("No se pudo registrar"), description: result.error, variant: "error" });
        setCustomers((current) => [...current, result.user]);
        if(result.address.id)setCustomerAddresses((current) => [...current, result.address]);
        setSearch(""); setAccountStatus("all"); setCity("all");
        setOpen(false);
        showToast({ title: t("Cliente registrado"), description: `${t("{code} fue asignado.", { code: result.user.lockerCode })} ${result.user.email?t("La invitación quedó en cola de correo."):t("Sin correo: no se envió invitación.")}` });
      })} className="grid min-w-0 gap-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label={tf("Nombre")} error={errors.firstName?.message} {...register("firstName")} /><Input label={tf("Apellido paterno")} error={errors.paternalLastName?.message} {...register("paternalLastName")} /><Input label={tf("Apellido materno")} error={errors.maternalLastName?.message} {...register("maternalLastName")} /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label={tf("Correo (opcional)")} type="email" error={errors.email?.message} {...register("email")} /><Input label={tf("Teléfono")} inputMode="tel" error={errors.phone?.message} {...register("phone")} /><Input label={tf("RFC opcional")} className="uppercase" error={errors.rfc?.message} {...register("rfc")} /><Select label={tf("Idioma de correos y facturas")} options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]} {...register("preferredLocale")} /></div>
        <p className="rounded-xl bg-cream-100 p-4 text-sm leading-7 text-ink-700">{t("Si indicas un correo enviaremos una invitación. Sin correo, puedes registrar y atender al cliente; su acceso al portal queda pendiente.")}</p>
        <div className="border-t border-stone-200 pt-4"><p className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><Building2 className="size-5 text-orange-500" />{t("Dirección o retiro en bodega")}</p><p className="mb-4 text-sm text-navy-500">{t("Todos los campos son opcionales. Si retira en bodega, basta el nombre o una referencia; aparecerá en la etiqueta.")}</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label={tf("Calle")} error={errors.street?.message} {...register("street")} /><Input label={tf("Número exterior")} error={errors.exteriorNumber?.message} {...register("exteriorNumber")} /><Input label={tf("Número interior")} error={errors.interiorNumber?.message} {...register("interiorNumber")} /><Input label={tf("Código postal")} inputMode="numeric" error={errors.postalCode?.message} {...register("postalCode", { onBlur: (event) => { const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality); setValue("state", match.state); } } })} /><Input label={tf("Colonia")} error={errors.neighborhood?.message} {...register("neighborhood")} /><Input label={tf("Municipio o alcaldía")} error={errors.municipality?.message} {...register("municipality")} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Select label={tf("Estado")} options={[{ value: "", label: tf("Selecciona") }, ...MEXICO_STATES.map((item) => ({ value: item, label: item }))]} error={errors.state?.message} {...register("state")} /><Textarea label={t("Bodega o referencia de retiro")} placeholder={t("Ej. Bodega Valle de Juárez")} error={errors.references?.message} {...register("references")} /></div></div>
        <div className="sticky bottom-0 flex justify-end gap-2 bg-white py-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>{tf("Cancelar")}</Button><Button type="submit" loading={isSubmitting}><UserRound className="size-4" />{t("Crear cuenta")}</Button></div>
      </form>
    </Dialog>
  </div>;
}
