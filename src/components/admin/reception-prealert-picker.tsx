"use client";
import { useState } from "react";
import type { Box } from "@/lib/types";
import { Input } from "@/components/ui/input";
export function ReceptionPrealertPicker({items,value,onChange,disabled,busy}:{items:Box[];value:string;onChange:(id:string)=>void;disabled:boolean;busy:boolean}){
 const [query,setQuery]=useState("");
 const selected=items.find(b=>b.id===value);
 const matches=items.filter(b=>`${b.code} ${b.originTracking??""} ${b.prealertDetails?.store??""} ${b.prealertDetails?.description??""}`.toLowerCase().includes(query.toLowerCase().trim()));
 return <fieldset disabled={disabled||busy} className="min-w-0 rounded-2xl border border-stone-200 bg-cream-50 p-3">
 <legend className="px-2 text-sm font-bold">Prealerta del cliente <span className="font-normal text-navy-500">· opcional</span></legend>
 {disabled?<p className="text-sm text-navy-500">Selecciona primero un cliente para consultar sus prealertas pendientes.</p>:<>
 <label className="flex cursor-pointer items-center gap-3 text-sm"><input type="radio" name="receptionPrealert" checked={!value} onChange={()=>onChange("")}/>Recepción nueva, sin prealerta</label>
 {items.length>0?<><div className="mt-4"><Input label="Buscar prealerta pendiente" placeholder="Código, tracking, tienda o contenido" value={query} onChange={e=>setQuery(e.target.value)}/></div><p className="my-3 text-xs text-navy-500">{matches.length} coincidencias · {items.length} pendientes</p><div className="grid max-h-28 gap-2 overflow-y-auto">{matches.slice(0,30).map(b=><label key={b.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 text-sm ${value===b.id?"border-orange-500 ring-1 ring-orange-500":"border-stone-200 hover:border-orange-300"}`}><input type="radio" className="mt-1" name="receptionPrealert" checked={value===b.id} onChange={()=>onChange(b.id)}/><span className="min-w-0"><strong className="block">{b.code}</strong><span className="block break-all text-navy-600">Tracking: {b.originTracking??"Sin tracking"}</span>{b.prealertDetails&&<span className="mt-1 block text-navy-500">{b.prealertDetails.store} · {b.prealertDetails.description}</span>}</span></label>)}</div>{!matches.length&&<p className="text-sm text-navy-500">No hay coincidencias. Prueba con otro tracking.</p>}{matches.length>30&&<p className="mt-2 text-xs">Se muestran 30 resultados; refina la búsqueda.</p>}</>:<p className="mt-3 text-sm text-navy-500">Este cliente no tiene prealertas pendientes. Puedes registrar una recepción nueva.</p>}
 {selected&&<div className="mt-3 rounded-lg bg-orange-50 p-2 text-sm text-orange-800"><strong>{selected.code} · medidas de referencia</strong><p>{selected.dimensions.length} × {selected.dimensions.width} × {selected.dimensions.height} in · {selected.weightLb?`${selected.weightLb} lb`:"Peso pendiente de medir"}</p></div>}
 <p className="mt-3 text-xs leading-5 text-navy-500">Elegir una prealerta prepara un aviso al cliente. No confirma la recepción física hasta guardar.</p></>}
 {busy&&<p role="status" className="mt-3 text-sm">Vinculando prealerta…</p>}
 </fieldset>;
}
