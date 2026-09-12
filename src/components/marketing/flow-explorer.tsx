"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Mail, ShieldCheck, UserRound, Warehouse, Workflow, RotateCcw } from "lucide-react";
import { getFlowGuide, type GuideTrack } from "@/lib/domain/flow-guide";
import { FLOW_OPTION_LABELS, type FlowConfig } from "@/lib/config/flow";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";

export function FlowExplorer({initialFlow}:{initialFlow:FlowConfig}) {
  const [flow,setFlow]=useState(initialFlow);
  const [track,setTrack]=useState<GuideTrack>("envio");
  const [index,setIndex]=useState(0);
  const steps=getFlowGuide(flow,track);const step=steps[index]??steps[0];
  const changed=flow.originMode!==initialFlow.originMode||flow.billingMoment!==initialFlow.billingMoment;
  const lanes=[{label:"Cliente",icon:UserRound,body:step.client},{label:"Operaciones A&L",icon:Warehouse,body:step.admin},{label:"Sistema",icon:Workflow,body:step.system}];
  return <div className="min-w-0 overflow-hidden rounded-xl border border-line-300 bg-white shadow-card">
    <div className="flex flex-col gap-5 border-b border-line-300 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-700">Recorrido interactivo · sin datos personales</p><span className="rounded-full bg-cream-100 px-3 py-1.5 text-xs text-ink-700">{changed?"Escenario de ejemplo":"Configuración actual del sitio"}</span></div>
      <div className="flex flex-wrap gap-2" aria-label="Elegir flujo">{([{id:"envio",label:"El viaje de una caja"},{id:"pagos",label:"Facturación y pagos"},{id:"soporte",label:"Atención y soporte"}] as const).map(item=><Button key={item.id} variant={track===item.id?"primary":"ghost"} aria-pressed={track===item.id} onClick={()=>{setTrack(item.id);setIndex(0);}}>{item.label}</Button>)}</div>
      <details className="rounded-lg bg-cream-50 px-4 py-3"><summary className="min-h-6 cursor-pointer text-sm font-semibold text-navy-900">Explorar otra configuración</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><Select label="Origen de la caja" value={flow.originMode} onChange={event=>{setFlow({...flow,originMode:event.target.value as FlowConfig["originMode"]});setIndex(0);}} options={[{value:"casillero",label:"Compra con casillero"},{value:"entrega-directa",label:"Entrega directa"}]} /><Select label="La factura se genera" value={flow.billingMoment} onChange={event=>{setFlow({...flow,billingMoment:event.target.value as FlowConfig["billingMoment"]});setIndex(0);}} options={[{value:"al-recibir",label:"Al recibir en bodega"},{value:"al-despachar",label:"Al despachar el camión"}]} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs leading-5 text-ink-500">Estos controles solo cambian la explicación. No modifican la configuración, crean operaciones ni envían correos.</p><Button variant="ghost" disabled={!changed} onClick={()=>{setFlow(initialFlow);setIndex(0);}}><RotateCcw className="size-4" />Restaurar</Button></div></details>
    </div>
    <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav className="border-b border-line-300 bg-cream-50 p-4 lg:border-b-0 lg:border-r" aria-label="Etapas del recorrido"><ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">{steps.map((item,position)=><li key={item.id}><button type="button" aria-current={index===position?"step":undefined} onClick={()=>setIndex(position)} className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${index===position?"bg-navy-900 font-semibold text-white":"text-ink-700 hover:bg-cream-100"}`}><span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${index===position?"border-white/40":"border-line-300"}`}>{position<index?<Check className="size-3" />:position+1}</span><span>{item.title}</span></button></li>)}</ol></nav>
      <div className="min-w-0 p-5 sm:p-8">
        <div aria-live="polite" aria-atomic="true"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-700">{String(index+1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")} · {track === "soporte" ? "Atención al cliente" : FLOW_OPTION_LABELS[flow.billingMoment]}</p><h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{step.title}</h3><p className="mt-3 max-w-2xl text-base leading-7 text-ink-700">{step.summary}</p></div>
        <div className="mt-6 flex flex-wrap gap-3" aria-label="Estados después de esta etapa">{([{label:"Caja",status:step.box},{label:"Envío",status:step.shipment},{label:"Camión",status:step.truck},{label:"Factura",status:step.invoice},{label:"Ticket",status:step.support}]).filter(item=>item.status).map(item=><div key={item.label} className="flex items-center gap-2 text-xs text-ink-500"><span>{item.label}</span><StatusBadge status={item.status!} /></div>)}</div>
        <div className="mt-7 grid gap-5 xl:grid-cols-3">{lanes.map(lane=><section key={lane.label} className="min-w-0 border-t border-line-300 pt-4"><h4 className="flex items-center gap-2 text-sm font-semibold text-navy-900"><lane.icon aria-hidden="true" className="size-4" />{lane.label}</h4><p className="mt-3 text-sm leading-6 text-ink-700">{lane.body}</p></section>)}</div>
        <div className="mt-7 grid gap-4 rounded-lg bg-cream-100 p-5"><div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-900" /><div><h4 className="text-sm font-semibold text-navy-900">Regla que protege el proceso</h4><p className="mt-1 text-sm leading-6 text-ink-700">{step.guard}</p></div></div><div className="flex items-start gap-3"><Mail aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-900" /><div><h4 className="text-sm font-semibold text-navy-900">Comunicación con el cliente</h4><p className="mt-1 text-sm leading-6 text-ink-700">{step.notification}</p></div></div></div>
        <div className="mt-7 flex items-center justify-between gap-3"><Button variant="ghost" disabled={index===0} onClick={()=>setIndex(index-1)}><ArrowLeft aria-hidden="true" className="size-4" />Anterior</Button><Button disabled={index===steps.length-1} onClick={()=>setIndex(index+1)}>Siguiente<ArrowRight aria-hidden="true" className="size-4" /></Button></div>
      </div>
    </div>
    <p className="border-t border-line-300 bg-cream-50 px-5 py-4 text-xs leading-5 text-ink-500 sm:px-7">Demostración explicativa, no rastreo en vivo. «Correo en cola» no significa correo entregado: el envío externo depende de Resend, su remitente verificado y la configuración de despliegue.</p>
  </div>;
}
