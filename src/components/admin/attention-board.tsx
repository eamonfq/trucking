"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, CheckCheck, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type AttentionItem = {id:string;kind:string;title:string;detail:string;customer:string;at:string;href:string;priority:boolean};
export function AttentionBoard({items}:{items:AttentionItem[]}) {
  const [query,setQuery]=useState("");const [kind,setKind]=useState("Todo");const router=useRouter();
  const visible=items.filter(item=>(kind==="Todo"||item.kind===kind)&&`${item.title} ${item.detail} ${item.customer}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="mt-7"><div className="rounded-2xl bg-navy-900 p-6 text-white sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-white/70">Siguiente acción</p><div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-3xl font-semibold">{items.length} pendientes por atender</h2><p className="mt-3 max-w-xl text-sm leading-6 text-white/75">{items.filter(item=>item.priority).length} requieren prioridad. Atiende pagos, consultas y carga sin perder el contexto del cliente.</p></div><button onClick={()=>router.refresh()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md border border-white/40 px-5 text-sm font-semibold hover:bg-white/10"><RefreshCw className="size-4" />Actualizar</button></div></div>
    <div className="my-6 flex flex-col gap-4"><div className="max-w-md"><Input label="Buscar en pendientes" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Código, nombre o casillero" /></div><div className="flex flex-wrap gap-2" aria-label="Filtrar pendientes">{["Todo","Recepción","Carga","Pagos","Soporte","Entregas"].map(value=><Button key={value} variant={kind===value?"primary":"ghost"} aria-pressed={kind===value} onClick={()=>setKind(value)}>{value} <span className="text-xs opacity-80">{value==="Todo"?items.length:items.filter(item=>item.kind===value).length}</span></Button>)}</div></div>
    <div className="grid gap-3">{visible.map(item=><Link key={item.id} href={item.href} className="group flex min-w-0 items-start justify-between gap-4 rounded-2xl border border-line-300 bg-white p-5 transition hover:border-navy-900 sm:p-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-xs font-semibold"><span className="text-brand-700">{item.kind}</span>{item.priority&&<span className="rounded-full bg-cream-100 px-2.5 py-1 text-navy-900">Prioridad</span>}<span className="font-normal text-ink-500">Desde {new Date(item.at).toLocaleDateString("es-MX")}</span></div><h3 className="mt-2 font-display text-lg font-semibold text-navy-900">{item.title}</h3><p className="mt-1 break-words text-sm text-ink-500">{item.detail}</p><p className="mt-3 text-xs font-semibold text-navy-900">{item.customer}</p></div><ArrowUpRight className="mt-1 size-5 shrink-0 text-ink-500 transition group-hover:text-brand-700" /></Link>)}</div>
    {!visible.length&&<div className="rounded-2xl border border-line-300 bg-white py-16 text-center"><CheckCheck className="mx-auto size-9 text-brand-700" /><h3 className="mt-4 font-display text-xl font-semibold text-navy-900">Todo despejado en esta vista</h3><p className="mt-2 text-sm text-ink-500">No hay pendientes que coincidan con los filtros.</p></div>}
  </section>;
}
