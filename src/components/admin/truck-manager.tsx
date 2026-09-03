"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { advanceTruck, createTruck } from "@/lib/auth/admin-actions";
import { truckSchema } from "@/lib/schemas/admin";
import type { Truck } from "@/lib/types";

type TruckInput = z.input<typeof truckSchema>;
export function TruckManager({ initial }: { initial: Truck[] }) { const [trucks, setTrucks] = useState(initial); const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<TruckInput>({ resolver: zodResolver(truckSchema) }); const advance = async (id: string) => { const result = await advanceTruck(id); if (result.ok) setTrucks((current) => current.map((truck) => truck.id === id ? { ...truck, status: result.status } : truck)); }; return <div className="grid gap-5"><form onSubmit={handleSubmit(async (data) => { const result = await createTruck(data); if (result.ok) { setTrucks((current) => [...current, result.truck]); reset(); } })} className="grid gap-4 rounded-card bg-navy-950 p-5 sm:grid-cols-2 xl:grid-cols-5"><Input label="Placa" {...register("plate")} /><Input label="Chofer" {...register("driverName")} /><Input label="Fecha de salida" type="date" {...register("departureDate")} /><Input label="Ruta" {...register("route")} /><Button type="submit" loading={isSubmitting} className="self-end">Crear camión</Button></form>{trucks.map((truck) => <article key={truck.id} className="rounded-card border border-stone-200 bg-white p-5"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-xl font-bold">{truck.code}</h2><StatusBadge status={truck.status} /></div><p className="mt-2 text-sm text-navy-500">{truck.route} · {truck.plate} · {truck.driverName}</p><p className="mt-4 text-xs font-bold uppercase tracking-wider text-navy-400">{truck.boxIds.length} cajas asignadas</p></div><div className="flex flex-wrap gap-2"><a href={`/api/camiones/${truck.id}/manifiesto`} className="inline-flex min-h-11 items-center rounded-full border border-stone-200 px-4 text-sm font-bold">Manifiesto PDF</a><Button onClick={() => advance(truck.id)} disabled={truck.status === "cerrado"}>Avanzar estado</Button></div></div></article>)}</div>; }
