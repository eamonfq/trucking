"use client";

import {useEffect,useRef,useState} from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';
import Link from './admin-access';
import {Checkbox} from '@/components/ui/checkbox';
import {Button} from '@/components/ui/button';
import {Select} from '@/components/ui/select';
import {StatusBadge} from '@/components/ui/badge';
import {boxWeightLabel,receptionConceptSummaries} from '@/lib/utils/reception-display';
import {truckLoad} from '@/lib/utils/truck-load';
import type {Box,User} from '@/lib/types';

type Reception={id:string;code:string;boxes:Box[]};
function Selection({ids,selected,label,text,disabled,onChange}:{ids:string[];selected:Set<string>;label:string;text?:string;disabled:boolean;onChange:(ids:string[],checked:boolean)=>void}){
 const ref=useRef<HTMLInputElement>(null);
 const count=ids.filter(id=>selected.has(id)).length;
 useEffect(()=>{if(ref.current)ref.current.indeterminate=count>0&&count<ids.length;},[count,ids.length]);
 const partial=count>0&&count<ids.length;
 return <span className="relative inline-flex"><Checkbox ref={ref} label={text??''} aria-label={label} aria-checked={partial?'mixed':ids.length>0&&count===ids.length} className={partial?'border-orange-600 bg-orange-50':undefined} disabled={disabled||!ids.length} checked={ids.length>0&&count===ids.length} onChange={event=>onChange(ids,event.target.checked)}/>{partial&&<span aria-hidden="true" className="pointer-events-none absolute left-1 top-1/2 h-0.5 w-3 -translate-y-1/2 rounded bg-orange-700"/>}</span>;
}

export function WarehouseInventory({groups,users,selectedIds,canSelect,busy,page,pageSize,onPage,onPageSize,onSelection}:{groups:Reception[];users:User[];selectedIds:string[];canSelect:boolean;busy:boolean;page:number;pageSize:number;onPage:(page:number)=>void;onPageSize:(size:number)=>void;onSelection:(ids:string[],checked:boolean)=>void}){
 const [expanded,setExpanded]=useState<Set<string>>(new Set());
 const selected=new Set(selectedIds),people=new Map(users.map(user=>[user.id,user]));
 const pages=Math.max(1,Math.ceil(groups.length/pageSize)),current=Math.min(page,pages),start=(current-1)*pageSize;
 const visible=groups.slice(start,start+pageSize);
 const selectable=visible.flatMap(group=>group.boxes.filter(box=>box.status==='en-bodega').map(box=>box.id));
 const columns='grid grid-cols-[28px_minmax(0,1fr)_40px] gap-x-3 gap-y-2 lg:grid-cols-[28px_minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1.4fr)_40px]';
 return <section aria-label="Inventario por recepción" className="min-w-0 rounded-2xl border border-stone-200 bg-white">
  <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-5"><Selection ids={selectable} selected={selected} label="Seleccionar todas las cajas disponibles" text="Seleccionar esta página" disabled={!canSelect||busy} onChange={onSelection}/><p className="text-xs text-navy-500">{groups.length} recepciones · {groups.reduce((sum,group)=>sum+group.boxes.length,0)} piezas</p></header>
  <div role="table" aria-label="Recepciones en bodega">
   <div role="rowgroup" className="hidden border-b border-stone-100 bg-cream-50 lg:block"><div role="row" className={`${columns} items-center px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-navy-500`}><span role="columnheader" className="sr-only">Seleccionar</span><span role="columnheader" className="col-start-2">Cliente / recepción</span><span role="columnheader">Contenido</span><span role="columnheader">Piezas · peso · estado</span><span role="columnheader" className="sr-only">Desglose</span></div></div>
   <div role="rowgroup" className="divide-y divide-stone-100">{visible.map(group=>{
    const customer=people.get(group.boxes[0].userId),ids=group.boxes.filter(box=>box.status==='en-bodega').map(box=>box.id);
    const open=expanded.has(group.id),count=ids.filter(id=>selected.has(id)).length,load=truckLoad(group.boxes);
    // Consolidate descriptions for display only; weights, billing and individual pieces remain intact.
    const descriptions=new Map<string,number>();
    for(const concept of receptionConceptSummaries(group.boxes))descriptions.set(concept.description,(descriptions.get(concept.description)??0)+concept.count);
    const content=[...descriptions].map(([description,count])=>`${count} × ${description}`).join(' · ');
    const states=[...new Set(group.boxes.map(box=>box.status))];
    const total=group.boxes[0].receptionGroup?.total??group.boxes.length;
    return <div key={group.id} data-reception-row={group.code} className={count?'bg-orange-50/50':'transition hover:bg-cream-50/60'}>
     <div role="row" className={`${columns} items-center px-4 py-3 sm:px-5`}>
      <div role="cell" className="col-start-1 row-start-1 flex items-center"><Selection ids={ids} selected={selected} label={group.boxes.length===1?`Seleccionar ${group.boxes[0].code}`:`Seleccionar recepción ${group.code}`} disabled={!canSelect||busy} onChange={onSelection}/></div>
      <div role="cell" className="col-start-2 row-start-1 min-w-0"><p className="truncate text-sm font-semibold text-navy-950" title={customer?[customer.firstName,customer.paternalLastName,customer.maternalLastName].filter(Boolean).join(' '):undefined}>{customer?[customer.firstName,customer.paternalLastName,customer.maternalLastName].filter(Boolean).join(' '):'Cliente no disponible'}</p><p className="mt-1 flex flex-wrap gap-x-2 text-[11px] text-navy-500"><Link href={`/admin/cajas/${group.boxes[0].id}`} className="font-semibold text-orange-700 hover:underline">{group.code}</Link>{customer?.lockerCode&&<span>{customer.lockerCode}</span>}</p></div>
      <div role="cell" className="col-start-2 row-start-2 min-w-0 lg:col-start-3 lg:row-start-1"><p className="line-clamp-2 break-words text-xs leading-5 text-navy-700" title={content}>{content}</p><p className="mt-0.5 truncate text-[10px] text-navy-400" title={group.boxes[0].originWarehouseName}>{group.boxes[0].originWarehouseName??'Origen no registrado'}</p></div>
      <div role="cell" className="col-start-2 row-start-3 flex flex-wrap items-start gap-x-4 gap-y-2 lg:col-start-4 lg:row-start-1 lg:grid lg:grid-cols-[40px_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-2">
       <div className="text-xs tabular-nums"><strong className="text-base font-bold text-navy-950">{group.boxes.length}</strong><span className="ml-1 text-navy-500 lg:hidden">piezas</span>{total>group.boxes.length&&<p className="text-[10px] text-navy-400">de {total}</p>}</div>
       <div className="min-w-0 text-xs"><strong className="tabular-nums text-navy-950">{load.weightLb} lb{load.missingWeights>0?' conocidas':''}</strong>{load.missingWeights>0?<p className="mt-0.5 text-[10px] text-amber-800">{load.missingWeights} por pesar</p>:group.boxes.some(box=>box.billing?.groupWeight)&&<p className="mt-0.5 text-[10px] text-navy-400">Pesaje conjunto</p>}</div>
       <div className="min-w-0">{states.length===1?<StatusBadge status={states[0]}/>:<span className="inline-block rounded-md bg-stone-100 px-2 py-1 text-[10px] font-semibold text-navy-700">{states.length} estados</span>}{count>0&&count<ids.length&&<p className="mt-1 text-[10px] text-orange-700">{count} seleccionadas</p>}</div>
      </div>
      <div role="cell" className="col-start-3 row-start-1 lg:col-start-5">{group.boxes.length>1?<button type="button" aria-label={`${open?'Ocultar':'Ver'} piezas de ${group.code}`} aria-expanded={open} aria-controls={`pieces-${group.boxes[0].id}`} onClick={()=>setExpanded(value=>{const next=new Set(value);if(open)next.delete(group.id);else next.add(group.id);return next;})} className="grid size-10 place-items-center rounded-lg border border-stone-200 text-navy-500 transition hover:border-orange-300 hover:bg-white hover:text-orange-700">{open?<ChevronDown aria-hidden="true" className="size-4"/>:<ChevronRight aria-hidden="true" className="size-4"/>}</button>:<Link aria-label={`Ver detalle de ${group.code}`} href={`/admin/cajas/${group.boxes[0].id}`} className="grid size-10 place-items-center rounded-lg text-navy-400 hover:bg-stone-100"><ChevronRight className="size-4"/></Link>}</div>
     </div>
     {open&&<div id={`pieces-${group.boxes[0].id}`} className="border-t border-stone-100 bg-stone-50/70 px-4 pb-3 pt-2 sm:px-5"><p className="mb-2 pl-10 text-[10px] font-semibold uppercase tracking-wider text-navy-400">Piezas de {group.code} · selecciona individualmente si lo necesitas</p><div className="divide-y divide-stone-200/70">{group.boxes.map(box=><div key={box.id} className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)] items-center gap-3 py-2 lg:grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <Selection ids={box.status==='en-bodega'?[box.id]:[]} selected={selected} label={`Seleccionar ${box.code}`} disabled={!canSelect||busy} onChange={onSelection}/><div className="min-w-0"><Link href={`/admin/cajas/${box.id}`} className="text-xs font-bold text-orange-700 hover:underline">{box.code}</Link><span className="ml-2 text-[10px] text-navy-400">{box.receptionGroup?.index}/{box.receptionGroup?.total}</span><p className="truncate text-[11px] text-navy-500" title={box.contentsNote}>{box.contentsNote??box.categoryName??box.categoryId}</p></div><p className="col-start-2 text-[11px] text-navy-500 lg:col-auto">{boxWeightLabel(box)}</p><div className="col-start-2 lg:col-auto"><StatusBadge status={box.status}/></div>
     </div>)}</div></div>}
    </div>;
   })}</div>
  </div>
  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-4 py-3 sm:px-5"><p className="text-xs text-navy-500" aria-live="polite">{groups.length?`${start+1}–${Math.min(start+pageSize,groups.length)} de ${groups.length} recepciones`:'0 recepciones'}</p><div className="flex flex-wrap items-center gap-3"><Select label="Recepciones por página" hideLabel value={String(pageSize)} onChange={event=>onPageSize(Number(event.target.value))} options={[10,20,50].map(size=>({value:String(size),label:`${size} por página`}))}/><Button type="button" variant="ghost" aria-label="Página anterior de bodega" disabled={busy||current===1} onClick={()=>onPage(current-1)}>Anterior</Button><span className="text-xs tabular-nums text-navy-500">{current} / {pages}</span><Button type="button" variant="ghost" aria-label="Página siguiente de bodega" disabled={busy||current===pages} onClick={()=>onPage(current+1)}>Siguiente</Button></div></footer>
 </section>;
}
