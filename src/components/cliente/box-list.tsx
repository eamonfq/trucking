"use client";

import {ReceptionList} from "@/components/ui/reception-list";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { BoxCategory } from "@/lib/config/box-categories";
import type { Box } from "@/lib/types";

import { EmptyState } from "@/components/ui/empty-state";


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
  return <><div className="flex gap-2 overflow-x-auto pb-2">{filters.map((filter) => <button key={filter.label} onClick={() => setActive(filter.label)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold ${active === filter.label ? "bg-navy-950 text-white" : "border border-stone-200 bg-white text-navy-600"}`}>{filter.label}</button>)}</div><div className="mt-5 grid gap-4">{visible.length ? <ReceptionList boxes={visible.map(b=>b.billing||b.customPriceUsd!==undefined?b:{...b,customPriceUsd:rates.find(r=>r.id===b.categoryId)?.priceUsd??0})} showAmounts pieceLink={box=><Link href={`/cliente/cajas/${box.code}`} className="text-sm font-bold text-orange-700">{box.code} →</Link>} heading={pieces=><div className="mt-1 text-xs leading-5 text-navy-500">{pieces[0].recipientSnapshot&&<p>Recibe: {pieces[0].recipientSnapshot.name} · {pieces[0].recipientSnapshot.phone}</p>}{pieces[0].originWarehouseName&&<p>Origen: {pieces[0].originWarehouseName}</p>}</div>}/> : <EmptyState title="No hay cajas en esta vista" description="Cuando una caja llegue a esta etapa aparecerá aquí." />}</div></>;
}
