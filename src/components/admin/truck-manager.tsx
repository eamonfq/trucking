"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { createTruck, transitionTruckState } from "@/lib/auth/admin-actions";
import { TRUCK_ACTIONS } from "@/lib/domain/state-machine";
import { truckSchema } from "@/lib/schemas/admin";
import type { Truck } from "@/lib/types";

type TruckInput = z.input<typeof truckSchema>;
export function TruckManager({ initial }: { initial: Truck[] }) {
  const [trucks, setTrucks] = useState(initial);
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { showToast } = useToast();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TruckInput>({ resolver: zodResolver(truckSchema) });

  const confirmTransition = async () => {
    if (!selectedTruck) return;
    setIsTransitioning(true);
    const action = TRUCK_ACTIONS[selectedTruck.status];
    const result = await transitionTruckState(selectedTruck.id, action?.description);
    setIsTransitioning(false);
    if (!result.ok) {
      showToast({ title: "No se pudo cambiar el estado", description: result.error, variant: "error" });
      return;
    }
    setTrucks((current) => current.map((truck) => truck.id === result.truck.id ? result.truck : truck));
    setSelectedTruck(null);
    showToast({ title: action?.label ?? "Estado actualizado", description: `${result.changedBoxes} cajas y ${result.changedShipments} envíos actualizados.` });
  };

  return <div className="grid gap-5"><form onSubmit={handleSubmit(async (data) => { const result = await createTruck(data); if (result.ok) { setTrucks((current) => [...current, result.truck]); reset(); showToast({ title: "Camión creado", description: `${result.truck.code} quedó listo para planificar su carga.` }); } })} className="grid gap-4 rounded-card bg-navy-950 p-5 sm:grid-cols-2 xl:grid-cols-5"><Input label="Placa" {...register("plate")} /><Input label="Chofer" {...register("driverName")} /><Input label="Fecha de salida" type="date" {...register("departureDate")} /><Input label="Ruta" {...register("route")} /><Button type="submit" loading={isSubmitting} className="self-end">Crear camión</Button></form>{trucks.map((truck) => { const action = TRUCK_ACTIONS[truck.status]; return <article key={truck.id} className="rounded-card border border-stone-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-xl font-bold">{truck.code}</h2><StatusBadge status={truck.status} /></div><p className="mt-2 text-sm text-navy-500">{truck.route} · {truck.plate} · {truck.driverName}</p><p className="mt-4 text-xs font-bold uppercase tracking-wider text-navy-400">{truck.boxIds.length} cajas asignadas</p></div><div className="flex flex-wrap gap-2"><a href={`/api/camiones/${truck.id}/manifiesto`} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 px-4 text-sm font-bold">Manifiesto PDF</a>{action && <Button onClick={() => setSelectedTruck(truck)}>{action.label}</Button>}</div></div></article>; })}<Dialog open={Boolean(selectedTruck)} onClose={() => setSelectedTruck(null)} title={selectedTruck ? TRUCK_ACTIONS[selectedTruck.status]?.label ?? "Actualizar camión" : "Actualizar camión"} description={selectedTruck ? TRUCK_ACTIONS[selectedTruck.status]?.description : undefined}><p className="text-sm leading-6 text-navy-600">Esta acción quedará registrada en el historial con el actor Operaciones A&amp;L.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setSelectedTruck(null)}>Cancelar</Button><Button loading={isTransitioning} onClick={confirmTransition}>Confirmar acción</Button></div></Dialog></div>;
}
