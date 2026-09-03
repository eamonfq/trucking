"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Plus, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { z } from "zod";
import { createCustomerAsAdmin } from "@/lib/auth/admin-actions";
import { CUSTOMER_COPY, CUSTOMER_STATUS } from "@/lib/config/customers";
import { MEXICO_STATES, POSTAL_CODE_CATALOG } from "@/lib/config/mexico";
import { registrationSchema } from "@/lib/schemas/registration";
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

type RegistrationInput = z.input<typeof registrationSchema>;

export function CustomerManager({ initialUsers, initialAddresses, boxes, shipments, invoices }: { initialUsers: User[]; initialAddresses: Address[]; boxes: Box[]; shipments: Shipment[]; invoices: Invoice[] }) {
  const [customers, setCustomers] = useState(initialUsers.filter((user) => user.role === "cliente"));
  const [customerAddresses, setCustomerAddresses] = useState(initialAddresses);
  const [search, setSearch] = useState("");
  const [accountStatus, setAccountStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [open, setOpen] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<RegistrationInput>({ resolver: zodResolver(registrationSchema), defaultValues: { acceptedTerms: true, state: "", rfc: "" } });
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
    reset({ firstName: "", paternalLastName: "", maternalLastName: "", email: "", phone: "", password: "", confirmPassword: "", acceptedTerms: true, street: "", exteriorNumber: "", interiorNumber: "", neighborhood: "", postalCode: "", municipality: "", state: "", references: "", rfc: "" });
    setOpen(true);
  };

  return <div className="grid gap-6">
    <div className="grid gap-3 rounded-card border border-stone-200 bg-white p-4 lg:grid-cols-[1fr_.55fr_.65fr_auto]">
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-cream-100 px-4"><Search className="size-4 text-navy-400" /><span className="sr-only">Buscar cliente</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, correo, casillero o teléfono" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <Select label="Estado de cuenta" hideLabel value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)} options={[{ value: "all", label: "Todos los estados" }, { value: "true", label: CUSTOMER_STATUS.active.label }, { value: "false", label: CUSTOMER_STATUS.inactive.label }]} />
      <Select label="Ciudad" hideLabel value={city} onChange={(event) => setCity(event.target.value)} options={[{ value: "all", label: "Todas las ciudades" }, ...cities.map((item) => ({ value: item, label: item }))]} />
      <Button onClick={beginCreate}><Plus className="size-4" />Nuevo cliente</Button>
    </div>

    <p className="flex items-center gap-2 text-sm text-navy-500"><SlidersHorizontal className="size-4" />{filtered.length} clientes encontrados</p>
    <DataTable rows={filtered} getRowKey={(row) => row.id} emptyTitle={CUSTOMER_COPY.directory.emptyTitle} emptyDescription={CUSTOMER_COPY.directory.emptyDescription} columns={[
      { key: "locker", header: "Casillero", render: (row) => <Link href={`/admin/clientes/${row.id}`} className="font-bold text-orange-600 hover:text-orange-700">{row.lockerCode}</Link> },
      { key: "name", header: "Nombre", render: (row) => <div><p className="font-bold text-navy-950">{row.firstName} {row.paternalLastName}</p><span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${CUSTOMER_STATUS[row.active ? "active" : "inactive"].className}`}>{CUSTOMER_STATUS[row.active ? "active" : "inactive"].label}</span></div> },
      { key: "contact", header: "Contacto", render: (row) => <div><p>{row.email}</p><p className="mt-1 text-xs text-navy-400">{row.phone}</p></div> },
      { key: "warehouse", header: "En bodega", render: (row) => <span className="font-display text-lg font-bold text-navy-950">{boxes.filter((box) => box.userId === row.id && box.status === "en-bodega").length}</span> },
      { key: "balance", header: "Saldo pendiente", render: (row) => <span className="font-bold text-navy-950">{formatUsd(invoices.filter((invoice) => invoice.userId === row.id && invoice.status !== "pagada" && invoice.status !== "borrador").reduce((total, invoice) => total + invoiceTotal(invoice), 0))}</span> },
      { key: "movement", header: "Último movimiento", render: (row) => lastMovement(row) ? formatDate(lastMovement(row)!) : "Sin movimientos" },
      { key: "action", header: "", className: "text-right", render: (row) => <Link href={`/admin/clientes/${row.id}`} className="inline-flex min-h-10 items-center rounded-full border border-stone-200 px-4 font-bold hover:bg-cream-100">Abrir expediente</Link> },
    ]} />

    <Dialog open={open} onClose={() => setOpen(false)} size="large" title="Registrar cliente" description="Usa los mismos datos y validaciones del registro público.">
      <form onSubmit={handleSubmit(async (data) => {
        const result = await createCustomerAsAdmin(data);
        if (!result.ok) return showToast({ title: "No se pudo registrar", description: result.error, variant: "error" });
        setCustomers((current) => [...current, result.user]);
        setCustomerAddresses((current) => [...current, result.address]);
        setOpen(false);
        showToast({ title: "Cliente registrado", description: `${result.user.lockerCode} fue asignado y la bienvenida se envió por correo.` });
      })} className="grid max-h-[68vh] gap-4 overflow-y-auto px-1">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Nombre" error={errors.firstName?.message} {...register("firstName")} /><Input label="Apellido paterno" error={errors.paternalLastName?.message} {...register("paternalLastName")} /><Input label="Apellido materno" error={errors.maternalLastName?.message} {...register("maternalLastName")} /></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Correo" type="email" error={errors.email?.message} {...register("email")} /><Input label="Teléfono +52" inputMode="numeric" error={errors.phone?.message} {...register("phone")} /><Input label="RFC opcional" className="uppercase" error={errors.rfc?.message} {...register("rfc")} /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Contraseña inicial" type="password" error={errors.password?.message} {...register("password")} /><Input label="Confirmar contraseña" type="password" error={errors.confirmPassword?.message} {...register("confirmPassword")} /></div>
        <div className="border-t border-stone-200 pt-4"><p className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Building2 className="size-5 text-orange-500" />Dirección principal en México</p><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Input label="Calle" error={errors.street?.message} {...register("street")} /><Input label="Número exterior" error={errors.exteriorNumber?.message} {...register("exteriorNumber")} /><Input label="Número interior" error={errors.interiorNumber?.message} {...register("interiorNumber")} /><Input label="Código postal" inputMode="numeric" error={errors.postalCode?.message} {...register("postalCode", { onBlur: (event) => { const match = POSTAL_CODE_CATALOG[event.target.value]; if (match) { setValue("municipality", match.municipality); setValue("state", match.state); } } })} /><Input label="Colonia" error={errors.neighborhood?.message} {...register("neighborhood")} /><Input label="Municipio o alcaldía" error={errors.municipality?.message} {...register("municipality")} /></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Select label="Estado" options={[{ value: "", label: "Selecciona" }, ...MEXICO_STATES.map((item) => ({ value: item, label: item }))]} error={errors.state?.message} {...register("state")} /><Textarea label="Referencias" error={errors.references?.message} {...register("references")} /></div></div>
        <input type="checkbox" className="sr-only" {...register("acceptedTerms")} />
        <div className="sticky bottom-0 flex justify-end gap-2 bg-white py-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" loading={isSubmitting}><UserRound className="size-4" />Crear cuenta</Button></div>
      </form>
    </Dialog>
  </div>;
}
