"use client";

import Link from "@/components/admin/admin-access";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpDown, Filter, Plus, Search, Truck as TruckIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { createTruck, transitionTruckState } from "@/lib/auth/admin-actions";
import { useDestinations } from "@/components/ui/catalog-provider";
import { getStatusLabel } from "@/lib/config/status";
import { TRUCK_ACTIONS } from "@/lib/domain/state-machine";
import { truckSchema } from "@/lib/schemas/admin";
import { TRUCK_STATUSES, type Driver, type Truck } from "@/lib/types";
import { truckActions, trucksManager } from "@/lib/i18n/catalogs/trucks-manager";
import { useLocale, useMessageTranslator, useT } from "@/lib/i18n/provider";
import { localizeTruckRoute } from "@/lib/utils/reception-display";

type TruckInput = z.input<typeof truckSchema>;

export function TruckManager({ initial, initialDrivers }: { initial: Truck[]; initialDrivers: Driver[] }) {
  const destinations=useDestinations();
  const t = useT(trucksManager);
  const ta = useMessageTranslator(truckActions);
  const locale = useLocale();
  const [trucks, setTrucks] = useState(initial);
  const [drivers, setDrivers] = useState(initialDrivers);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [destination, setDestination] = useState("all");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { showToast } = useToast();
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<TruckInput>({
    resolver: zodResolver(truckSchema),
    defaultValues: { driverId: "", destinationCity: destinations[0], maxWeightLb: undefined, notes: "" },
  });
  const driverId = useWatch({ control, name: "driverId" });
  const filtered = useMemo(() => trucks.filter((truck) => {
    const term = search.trim().toLowerCase();
    // departureDate es ISO (aaaa-mm-dd), así que comparar como texto ya ordena por fecha.
    const day = truck.departureDate.slice(0, 10);
    return (!term || truck.code.toLowerCase().includes(term) || truck.plate.toLowerCase().includes(term))
      && (status === "all" || truck.status === status)
      && (destination === "all" || (truck.stops?.some(stop=>stop.city===destination) || truck.destinationCity === destination))
      && (!from || day >= from)
      && (!to || day <= to);
  }).sort((a, b) => (a.departureDate.localeCompare(b.departureDate)) * (sort === "asc" ? 1 : -1)), [destination, from, search, sort, status, to, trucks]);

  const confirmTransition = async () => {
    if (!selectedTruck) return;
    setIsTransitioning(true);
    const action = TRUCK_ACTIONS[selectedTruck.status];
    const result = await transitionTruckState(selectedTruck.id, action?.description);
    setIsTransitioning(false);
    if (!result.ok) return showToast({ title: t("No se pudo cambiar el estado"), description: result.error, variant: "error" });
    setTrucks((current) => current.map((truck) => truck.id === result.truck.id ? result.truck : truck));
    setSelectedTruck(null);
    showToast({ title: action?.label ? ta(action.label) : t("Estado actualizado"), description: t("{boxes} cajas y {shipments} envíos actualizados.", { boxes: result.changedBoxes, shipments: result.changedShipments }) });
  };

  return <div className="grid gap-6">
    <form onSubmit={handleSubmit(async (data) => {
      const result = await createTruck(data);
      if (!result.ok) return showToast({ title: t("No se pudo crear el camión"), description: result.error, variant: "error" });
      setTrucks((current) => [...current, result.truck]);
      setDrivers((current) => current.some((driver) => driver.id === result.driver.id) ? current : [...current, result.driver]);
      reset({ driverId: "", destinationCity: destinations[0], maxWeightLb: undefined, notes: "" });
      showToast({ title: t("Camión creado"), description: t("{code} quedó planificado. Abre su detalle para agregar almacenes y fechas de llegada.", { code: result.truck.code }) });
    })} className="rounded-card bg-navy-950 p-5 text-white sm:p-6">
      <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-white/10"><Plus className="size-5 text-orange-400" /></span><div><h2 className="font-display text-xl font-bold">{t("Nueva guía máster")}</h2><p className="mt-1 text-sm text-white/60">{t("Configura el origen y las paradas después de crear el viaje.")}</p></div></div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Input tone="dark" label={t("Placa")} placeholder="FLA-2604" error={errors.plate?.message} {...register("plate")} />
        <Select tone="dark" label={t("Chofer")} options={[{ value: "", label: t("Selecciona") }, ...drivers.filter((driver) => driver.active).map((driver) => ({ value: driver.id, label: `${driver.name} · ${driver.license}` })), { value: "new", label: t("+ Alta rápida") }]} error={errors.driverId?.message} {...register("driverId")} />
        <Input tone="dark" label={t("Fecha de salida")} type="date" min={new Date().toISOString().slice(0, 10)} error={errors.departureDate?.message} {...register("departureDate")} />
        <Select tone="dark" label={t("Destino inicial (configura paradas en el detalle)")} options={destinations.map((city) => ({ value: city, label: city }))} error={errors.destinationCity?.message} {...register("destinationCity")} />
      </div>
      {driverId === "new" && <div className="mt-4 grid gap-4 rounded-2xl bg-white/8 p-4 md:grid-cols-3"><Input tone="dark" label={t("Nombre del chofer")} error={errors.newDriverName?.message} {...register("newDriverName")} /><Input tone="dark" label={t("Teléfono")} placeholder="+13055550199" error={errors.newDriverPhone?.message} {...register("newDriverPhone")} /><Input tone="dark" label={t("Licencia")} error={errors.newDriverLicense?.message} {...register("newDriverLicense")} /></div>}
      <div className="mt-5"><Input tone="dark" label={t("Peso máximo de carga (lb, opcional)")} type="number" min="0.01" step="0.01" placeholder={t("Sin límite configurado")} error={errors.maxWeightLb?.message} {...register("maxWeightLb")}/><p className="mt-2 text-xs text-white/65">{t("No se limita la cantidad ni el tipo de paquetes. Se usa el peso real, no el dimensional de cobro.")}</p></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end"><Textarea tone="dark" label={t("Notas operativas")} rows={2} error={errors.notes?.message} {...register("notes")} /><Button type="submit" loading={isSubmitting} className="min-w-44">{t("Crear camión")}</Button></div>
    </form>

    <div className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 lg:grid-cols-[1fr_.7fr_.7fr_auto]">
      <label className="flex min-h-11 items-center gap-2 rounded-xl bg-cream-100 px-3"><Search className="size-4 text-navy-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Buscar código o placa")} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <Select label={t("Estado")} hideLabel options={[{ value: "all", label: t("Todos los estados") }, ...TRUCK_STATUSES.map((item) => ({ value: item, label: getStatusLabel(item, locale) }))]} value={status} onChange={(event) => setStatus(event.target.value)} />
      <Select label={t("Ruta")} hideLabel options={[{ value: "all", label: t("Todos los destinos") }, ...Array.from(new Set([...destinations,...trucks.map(truck=>truck.destinationCity)])).map((city) => ({ value: city, label: city }))]} value={destination} onChange={(event) => setDestination(event.target.value)} />
      <Button variant="secondary" onClick={() => setSort((current) => current === "asc" ? "desc" : "asc")}><ArrowUpDown className="size-4" />{t("Salida")}</Button>

      <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 pt-3 lg:col-span-4">
        <span className="text-xs font-medium text-ink-700">{t("Fecha de salida")}</span>
        <label className="flex items-center gap-2 text-xs text-ink-500">{t("Desde")}
          <input type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="min-h-11 rounded-md border-[1.5px] border-line-300 bg-white px-3 text-sm font-medium text-navy-900 outline-none transition hover:border-label-600 focus:border-brand-700" />
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-500">{t("Hasta")}
          <input type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="min-h-11 rounded-md border-[1.5px] border-line-300 bg-white px-3 text-sm font-medium text-navy-900 outline-none transition hover:border-label-600 focus:border-brand-700" />
        </label>
        {(from || to) && <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="text-sm font-semibold text-brand-700 hover:text-brand-600">{t("Quitar fechas")}</button>}
      </div>
    </div>

    <p className="flex items-center gap-2 text-sm text-navy-500"><Filter className="size-4" />{t("{count} guías encontradas", { count: filtered.length })}</p>
    {filtered.map((truck) => { const action = TRUCK_ACTIONS[truck.status]; return <article key={truck.id} className="rounded-card border border-stone-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><Link href={`/admin/camiones/${truck.id}`} className="font-display text-xl font-bold hover:text-orange-600">{truck.code}</Link><StatusBadge status={truck.status} /></div><p className="mt-2 text-sm text-navy-500">{localizeTruckRoute(truck.route, locale)} · {truck.plate} · {truck.driverName}</p><p className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-400"><TruckIcon className="size-4" />{t("{count} cajas asignadas", { count: truck.boxIds.length })}</p></div><div className="flex flex-wrap gap-2"><Link href={`/admin/camiones/${truck.id}`} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 px-4 text-sm font-bold">{t("Ver detalle")}</Link>{["planificado","cargando"].includes(truck.status)&&<Link href={`/admin/camiones/${truck.id}#carga-escaneada`} className="inline-flex min-h-11 items-center rounded-full bg-navy-950 px-4 text-sm font-bold text-white">{t("Escanear carga")}</Link>}{action && !(truck.stops?.length && action.to==="en-destino") && <Button onClick={() => setSelectedTruck(truck)}>{ta(action.label)}</Button>}</div></div></article>; })}

    <Dialog open={Boolean(selectedTruck)} onClose={() => setSelectedTruck(null)} title={selectedTruck && TRUCK_ACTIONS[selectedTruck.status]?.label ? ta(TRUCK_ACTIONS[selectedTruck.status]!.label) : t("Actualizar camión")} description={selectedTruck && TRUCK_ACTIONS[selectedTruck.status] ? ta(TRUCK_ACTIONS[selectedTruck.status]!.description) : undefined}><p className="text-sm leading-6 text-navy-600">{t("La acción quedará registrada en el historial con el actor Operaciones A&L.")}</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setSelectedTruck(null)}>{t("Cancelar")}</Button><Button loading={isTransitioning} onClick={confirmTransition}>{t("Confirmar acción")}</Button></div></Dialog>
  </div>;
}
