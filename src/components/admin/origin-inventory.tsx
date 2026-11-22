"use client";
import { useState } from "react";
import type { getOriginInventory } from "@/lib/auth/warehouse-actions";
import { Input } from "@/components/ui/input";
import {OperationalReceptionList} from "@/components/ui/operational-reception-list";
import { StatusBadge } from "@/components/ui/badge";
import { receptionAlmacen } from "@/lib/i18n/catalogs/reception-almacen";
import { useT } from "@/lib/i18n/provider";
export function OriginInventory({data}:{data:Awaited<ReturnType<typeof getOriginInventory>>}) {
  const t=useT(receptionAlmacen);
  const [search,setSearch]=useState("");
  return <section className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-6"><h2 className="font-display text-2xl font-bold">{t("Mis almacenes de origen")}</h2><p className="text-sm text-navy-500">{t("Consulta paquetes y contactos autorizados. El alta inicial y la carga al camión se gestionan desde administración; este acceso no muestra cobros ni facturas.")}</p><Input label={t("Buscar código o cliente")} value={search} onChange={e=>setSearch(e.target.value)}/>{data.map(w=>{const found=w.boxes.filter(b=>[b.code,b.receptionGroup?.code,b.contentsNote,b.customer?.name,b.customer?.phone].some(v=>v?.toLowerCase().includes(search.toLowerCase())));return <div key={w.id}><h3 className="mb-3 font-bold">{found.length===1?t("{name} · 1 paquetes",{name:w.name}):t("{name} · {count} paquetes",{name:w.name,count:found.length})}</h3><OperationalReceptionList pieces={found.slice(0,100)} renderPiece={b=><article key={b.id} className="rounded-xl border border-stone-200 p-4"><div className="flex justify-between gap-3"><strong>{b.code}</strong><StatusBadge status={b.status}/></div><p className="my-2 text-sm">{b.dimensions.length} × {b.dimensions.width} × {b.dimensions.height} in · {b.weightLabel}</p>{b.customer&&<div className="flex flex-wrap gap-4 text-sm"><span>{b.customer.name}</span><a href={`tel:${b.customer.phone}`}>{b.customer.phone}</a><a href={`mailto:${b.customer.email}`}>{b.customer.email}</a></div>}</article>}/>{!found.length&&<p className="text-sm text-navy-500">{t("Sin paquetes registrados en este origen.")}</p>}{found.length>100&&<p>{t("Refina la búsqueda: se muestran 100 resultados.")}</p>}</div>;})}</section>;
}
