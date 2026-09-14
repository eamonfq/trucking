"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { BoxCategory } from "@/lib/config/box-categories";
import type { Box } from "@/lib/types";
import { formatUsd } from "@/lib/utils/format";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/badge";

const filters = [
  { label: "Todas", statuses: null },
  { label: "En bodega", statuses: ["recibida", "categorizada", "en-bodega", "excede-categoria"] },
  { label: "En camino", statuses: ["cargada-en-camion", "en-transito"] },
  { label: "En México", statuses: ["en-destino"] },
  { label: "Entregadas", statuses: ["entregada"] },
] as const;

export function ClientBoxList({ boxes, rates }: { boxes: Box[]; rates: BoxCategory[] }) {
  const [active, setActive] = useState("Todas");
  const visible = useMemo(() => { const filter = filters.find((item) => item.label === active); return !filter?.statuses ? boxes : boxes.filter((box) => (filter.statuses as readonly string[]).includes(box.status)); }, [active, boxes]);
  return <><div className="flex gap-2 overflow-x-auto pb-2">{filters.map((filter) => <button key={filter.label} onClick={() => setActive(filter.label)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${active === filter.label ? "bg-navy-950 text-white" : "border border-stone-200 bg-white text-navy-600"}`}>{filter.label}</button>)}</div><div className="mt-5 grid gap-4">{visible.length ? visible.map((box) => { const category = rates.find((item) => item.id === box.categoryId); return <Link key={box.id} href={`/cliente/cajas/${box.code}`} className="grid gap-4 rounded-card border border-stone-200 bg-white p-5 transition hover:border-orange-200 hover:shadow-soft sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><p className="font-display text-lg font-bold text-navy-950">{box.code}</p><StatusBadge status={box.status} />{box.receptionGroup&&<span className="rounded-md bg-orange-50 px-2 py-1 text-xs font-bold text-orange-700">Pieza {box.receptionGroup.index}/{box.receptionGroup.total}</span>}</div><p className="mt-2 text-xs text-navy-500">Tracking de origen: {box.originTracking ?? "No aplica"}</p>{box.recipientSnapshot&&<p className="mt-2 text-sm">Recibe: {box.recipientSnapshot.name} · {box.recipientSnapshot.phone}</p>}{box.originWarehouseName&&<p className="text-xs text-navy-500">Origen: {box.originWarehouseName}</p>}</div><div className="text-sm"><p className="font-bold text-navy-900">{box.categoryName ?? category?.name ?? "Carga"}</p><p className="mt-1 text-xs text-navy-500">{box.dimensions.length} × {box.dimensions.width} × {box.dimensions.height} in · {box.weightLb} lb</p></div><p className="font-display text-lg font-bold text-orange-600">{formatUsd(box.customPriceUsd ?? category?.priceUsd ?? 0)}</p></Link>; }) : <EmptyState title="No hay cajas en esta vista" description="Cuando una caja llegue a esta etapa aparecerá aquí." />}</div></>;
}
