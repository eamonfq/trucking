"use client";

import {formatDimensions} from "@/lib/utils/format";
import { CUSTOM_CAPACITY_CATEGORY } from "@/lib/config/custom-cargo";
import { useRouter } from "next/navigation";
import {TruckLoadSummary} from "./truck-load-summary";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit3, FileDown, FileText, Trash2 } from "lucide-react";
import Link from "@/components/admin/admin-access";
import { createBillOfLading } from "@/lib/auth/bill-of-lading-actions";
import { z } from "zod";
import { removeBoxFromTruck, transitionTruckState, updateTruck } from "@/lib/auth/admin-actions";
import { useCatalog, useDestinations } from "@/components/ui/catalog-provider";
import { OPERATION_ORIGIN } from "@/lib/config/operations";
import { TRUCK_ACTIONS } from "@/lib/domain/state-machine";
import { truckSchema } from "@/lib/schemas/admin";
import type { Box, Driver, Shipment, Truck, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Timeline } from "@/components/ui/timeline";
import { useToast } from "@/components/ui/toast";
import { truckActions, trucksManager } from "@/lib/i18n/catalogs/trucks-manager";
import { useLocale, useMessageTranslator, useT } from "@/lib/i18n/provider";

type TruckInput = z.input<typeof truckSchema>;

export function TruckDetailManager({ initialTruck, initialAssigned, users, drivers, shipments, billOfLading }: { initialTruck: Truck; initialAssigned: Box[]; initialAvailable: Box[]; users: User[]; drivers: Driver[]; shipments: Shipment[]; billOfLading?: { id: string; code: string } }) {
  const router=useRouter();
  const t = useT(trucksManager);
  const ta = useMessageTranslator(truckActions);
  const locale = useLocale();
  const destinations=useDestinations();
  const catalog=useCatalog();
  const categories=useMemo(()=>[...catalog,CUSTOM_CAPACITY_CATEGORY],[catalog]);
  const [truck, setTruck] = useState(initialTruck);
  const [assigned, setAssigned] = useState(initialAssigned);
  const [editOpen, setEditOpen] = useState(false);
  const [transitionOpen, setTransitionOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [creatingBill, setCreatingBill] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TruckInput>({
    resolver: zodResolver(truckSchema),
    defaultValues: { plate: truck.plate, driverId: truck.driverId, departureDate: truck.departureDate, destinationCity: truck.destinationCity as TruckInput["destinationCity"], maxWeightLb: truck.maxWeightLb, notes: truck.notes },
  });
  const action = TRUCK_ACTIONS[truck.status];
  const shipmentByBox = (boxId: string) => shipments.find((shipment) => shipment.boxIds.includes(boxId));


  const removeBox = async (boxId: string) => {
    const result = await removeBoxFromTruck(truck.id, boxId);
    if (!result.ok) return showToast({ title: t("No se pudo quitar la caja"), description: result.error, variant: "error" });
    setTruck({ ...result.truck });
    setAssigned((current) => current.filter((box) => box.id !== boxId));
    router.refresh();
    showToast({ title: t("Caja retirada"), description: t("{code} volvió a estar disponible en bodega.", { code: result.box.code }) });
  };

  const createBill = async () => {
    setCreatingBill(true);
    const result = await createBillOfLading({ truckId: truck.id });
    if (!result.ok) { setCreatingBill(false); return showToast({ title: t("No se pudo crear el bill of lading"), description: result.error, variant: "error" }); }
    showToast({ title: t("{code} creado", { code: result.code }), description: t("Carga agrupada por cantidad. Revisa los datos y guarda.") });
    router.push(`/admin/camiones/bill-of-lading/${result.id}`);
  };

  const transition = async () => {
    setBusy(true);
    const result = await transitionTruckState(truck.id, action?.description);
    setBusy(false);
    if (!result.ok) return showToast({ title: t("No se pudo cambiar el estado"), description: result.error, variant: "error" });
    setTruck(result.truck);router.refresh();
    setTransitionOpen(false);
    showToast({ title: action?.label ? ta(action.label) : t("Estado actualizado"), description: t("{boxes} cajas y {shipments} envíos sincronizados.", { boxes: result.changedBoxes, shipments: result.changedShipments }) });
  };

  return <div className="grid gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-center gap-3"><StatusBadge status={truck.status} /><span className="text-sm text-navy-500">{truck.plate} · {truck.driverName} · {t("salida {date}", { date: truck.departureDate })}</span></div><div className="flex flex-wrap gap-2">{truck.status === "planificado" && <Button variant="secondary" onClick={() => { reset({ plate: truck.plate, driverId: truck.driverId, departureDate: truck.departureDate, destinationCity: truck.destinationCity as TruckInput["destinationCity"], maxWeightLb: truck.maxWeightLb, notes: truck.notes }); setEditOpen(true); }}><Edit3 className="size-4" />{t("Editar viaje")}</Button>}<a href={`/api/camiones/${truck.id}/manifiesto`} title={t("Una fila por caja, para verificar la carga")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 px-4 text-sm font-bold"><FileDown className="size-4" />{t("Manifiesto PDF")}</a>{billOfLading ? <Link href={`/admin/camiones/bill-of-lading/${billOfLading.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-stone-200 px-4 text-sm font-bold"><FileText className="size-4" />Bill of Lading {billOfLading.code}</Link> : <Button variant="ghost" loading={creatingBill} onClick={createBill}><FileText className="size-4" />{t("Crear Bill of Lading")}</Button>}{action && !(truck.stops?.length && action.to==="en-destino") && <Button onClick={() => setTransitionOpen(true)}>{ta(action.label)}</Button>}</div></div>

    <TruckLoadSummary boxes={assigned} maxWeightLb={truck.maxWeightLb}/>


    <section><div className="flex items-end justify-between gap-4"><div><h2 className="font-display text-xl font-bold">{t("Cajas asignadas")}</h2><p className="mt-1 text-sm text-navy-500">{t("{count} cajas vinculadas a esta guía máster.", { count: assigned.length })}</p></div></div>{assigned.length ? <div className="mt-4 overflow-x-auto rounded-card border border-stone-200 bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-cream-100 text-xs uppercase tracking-wider text-navy-500"><tr><th className="p-4">{t("Caja")}</th><th className="p-4">{t("Cliente")}</th><th className="p-4">{t("Categoría")}</th><th className="p-4">{t("Medidas (in)")}</th><th className="p-4">{t("Peso real")}</th><th className="p-4">{t("Envío")}</th><th className="p-4 text-right">{t("Acción")}</th></tr></thead><tbody className="divide-y divide-stone-200">{assigned.map((box) => { const customer = users.find((user) => user.id === box.userId); return <tr key={box.id}><td className="p-4 font-bold">{box.code}</td><td className="p-4">{customer ? `${customer.firstName} ${customer.paternalLastName}` : t("Cliente")}</td><td className="p-4">{categories.find((category) => category.id === box.categoryId)?.name}</td><td className="p-4">{formatDimensions(box.dimensions, locale)}</td><td className="p-4">{box.weightLb} lb</td><td className="p-4">{shipmentByBox(box.id)?.code ?? t("Sin envío")}</td><td className="p-4 text-right">{(["planificado", "cargando"] as string[]).includes(truck.status) && <button onClick={() => removeBox(box.id)} className="inline-flex min-h-10 items-center gap-2 rounded-full px-3 font-bold text-danger-700 hover:bg-danger-50"><Trash2 className="size-4" />{t("Quitar")}</button>}</td></tr>; })}</tbody></table></div> : <div className="mt-4"><EmptyState title={t("Todavía no hay cajas asignadas")} description={t("Agrega cada caja leyendo su etiqueta desde la estación de escaneo.")} />{["planificado","cargando"].includes(truck.status)&&<div className="mt-4 flex justify-center"><a href="#carga-escaneada" className="inline-flex min-h-11 items-center justify-center rounded-md bg-orange-700 px-5 text-sm font-semibold text-white hover:bg-orange-800">{t("Escanear cajas")}</a></div>}</div>}</section>

    <section className="rounded-card border border-stone-200 bg-white p-5"><h2 className="font-display text-xl font-bold">{t("Historial del viaje")}</h2><div className="mt-6"><Timeline events={truck.timeline} /></div></section>

    <Dialog open={editOpen} onClose={() => setEditOpen(false)} title={t("Editar viaje")} description={t("Los datos pueden modificarse mientras la guía esté planificada.")}><form onSubmit={handleSubmit(async (data) => { const result = await updateTruck(truck.id, data); if (!result.ok) return showToast({ title: t("No se pudo guardar"), description: result.error, variant: "error" }); setTruck(result.truck);router.refresh(); setEditOpen(false); showToast({ title: t("Viaje actualizado"), description: t("{code} conserva su estado planificado.", { code: result.truck.code }) }); })} className="grid min-w-0 gap-4"><Input label={t("Placa")} error={errors.plate?.message} {...register("plate")} /><Select label={t("Chofer")} options={drivers.filter((driver) => driver.active).map((driver) => ({ value: driver.id, label: driver.name }))} error={errors.driverId?.message} {...register("driverId")} /><Input label={t("Fecha de salida")} type="date" min={new Date().toISOString().slice(0, 10)} error={errors.departureDate?.message} {...register("departureDate")} /><Select label={t("Destino")} options={Array.from(new Set([...destinations,truck.destinationCity])).map((city) => ({ value: city, label: `${OPERATION_ORIGIN} → ${city}` }))} error={errors.destinationCity?.message} {...register("destinationCity")} /><Input label={t("Peso máximo de carga (lb, opcional)")} type="number" min="0.01" step="0.01" error={errors.maxWeightLb?.message} {...register("maxWeightLb")}/><Textarea label={t("Notas")} error={errors.notes?.message} {...register("notes")} /><div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>{t("Cancelar")}</Button><Button type="submit" loading={isSubmitting}>{t("Guardar cambios")}</Button></div></form></Dialog>
    <Dialog open={transitionOpen} onClose={() => setTransitionOpen(false)} title={action?.label ? ta(action.label) : t("Actualizar camión")} description={action ? ta(action.description) : undefined}><p className="text-sm leading-6 text-navy-600">{t("La transición se guardará en el historial y actualizará en cascada las entidades relacionadas.")}</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setTransitionOpen(false)}>{t("Cancelar")}</Button><Button loading={busy} onClick={transition}>{t("Confirmar acción")}</Button></div></Dialog>
  </div>;
}
