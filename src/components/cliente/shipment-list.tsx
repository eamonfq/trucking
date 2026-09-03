"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { Shipment } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";

const filters = [
  { label: "Todos", statuses: null },
  { label: "Por despachar", statuses: ["pendiente", "confirmado"] },
  { label: "En ruta", statuses: ["en-transito"] },
  { label: "En México", statuses: ["en-destino"] },
  { label: "Entregados", statuses: ["entregado"] },
] as const;

export function ShipmentList({ shipments }: { shipments: Shipment[] }) {
  const [active, setActive] = useState<string>("Todos");
  const visible = useMemo(() => {
    const filter = filters.find((item) => item.label === active);
    return !filter?.statuses ? shipments : shipments.filter((shipment) => (filter.statuses as readonly string[]).includes(shipment.status));
  }, [active, shipments]);
  if (!shipments.length) return <EmptyState title="Todavía no tienes envíos" description="Agrupa las cajas que ya están en bodega y elige quién las recibe en México." action={<Link href="/cliente/envios/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-orange-500 px-5 text-sm font-bold text-white"><Plus className="size-4" />Crear envío</Link>} />;
  return <>
    <div className="flex gap-2 overflow-x-auto pb-2">{filters.map((filter) => {
      const total = !filter.statuses ? shipments.length : shipments.filter((shipment) => (filter.statuses as readonly string[]).includes(shipment.status)).length;
      return <button type="button" key={filter.label} onClick={() => setActive(filter.label)} aria-pressed={active === filter.label} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${active === filter.label ? "bg-navy-950 text-white" : "border border-stone-200 bg-white text-navy-600 hover:border-navy-400"}`}>{filter.label} · {total}</button>;
    })}</div>
    <div className="mt-5">{visible.length ? <div className="grid gap-4 lg:grid-cols-2">{visible.map((shipment) => <Link href={`/cliente/envios/${shipment.code}`} key={shipment.id} className="rounded-card border border-stone-200 bg-white p-5 transition hover:border-orange-200 hover:shadow-soft">
      <div className="flex items-start justify-between gap-4"><div><p className="font-display text-xl font-bold text-navy-950">{shipment.code}</p><p className="mt-2 text-sm text-navy-500">{shipment.destinationCity}</p></div><StatusBadge status={shipment.status} /></div>
      <div className="mt-6 flex justify-between border-t border-stone-200 pt-4 text-xs text-navy-500"><span>{shipment.boxIds.length} {shipment.boxIds.length === 1 ? "caja" : "cajas"}</span><span>{shipment.truckId ? "Camión asignado" : "Listo para asignación"}</span></div>
    </Link>)}</div> : <EmptyState title="No hay envíos en esta vista" description="Cambia de pestaña para ver los envíos en otra etapa." />}</div>
  </>;
}
