"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Mail, ShieldCheck, UserRound, Warehouse, Workflow, RotateCcw } from "lucide-react";
import { getFlowGuide, type GuideTrack } from "@/lib/domain/flow-guide";
import { flowOptionLabel, type FlowConfig } from "@/lib/config/flow";
import { marketing } from "@/lib/i18n/catalogs/marketing";
import { useLocale, useT } from "@/lib/i18n/provider";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/badge";

export function FlowExplorer({initialFlow}:{initialFlow:FlowConfig}) {
  const locale=useLocale();const t=useT(marketing);
  const [flow,setFlow]=useState(initialFlow);
  const [track,setTrack]=useState<GuideTrack>("envio");
  const [index,setIndex]=useState(0);
  const steps=getFlowGuide(flow,track,locale);const step=steps[index]??steps[0];
  const changed=flow.originMode!==initialFlow.originMode||flow.billingMoment!==initialFlow.billingMoment;
  const lanes=[{label:t("Cliente"),icon:UserRound,body:step.client},{label:t("Operaciones A&L"),icon:Warehouse,body:step.admin},{label:t("Sistema"),icon:Workflow,body:step.system}];
  return <div className="min-w-0 overflow-hidden rounded-xl border border-line-300 bg-white shadow-card">
    <div className="flex flex-col gap-5 border-b border-line-300 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.14em] text-brand-700">{t("Recorrido interactivo · sin datos personales")}</p><span className="rounded-full bg-cream-100 px-3 py-1.5 text-xs text-ink-700">{changed?t("Escenario de ejemplo"):t("Configuración actual del sitio")}</span></div>
      <div className="flex flex-wrap gap-2" aria-label={t("Elegir flujo")}>{([{id:"envio",label:t("El viaje de una caja")},{id:"pagos",label:t("Facturación y pagos")},{id:"soporte",label:t("Atención y soporte")}] as const).map(item=><Button key={item.id} variant={track===item.id?"primary":"ghost"} aria-pressed={track===item.id} onClick={()=>{setTrack(item.id);setIndex(0);}}>{item.label}</Button>)}</div>
      <details className="rounded-lg bg-cream-50 px-4 py-3"><summary className="min-h-6 cursor-pointer text-sm font-semibold text-navy-900">{t("Explorar otra configuración")}</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><Select label={t("Origen de la caja")} value={flow.originMode} onChange={event=>{setFlow({...flow,originMode:event.target.value as FlowConfig["originMode"]});setIndex(0);}} options={[{value:"casillero",label:t("Compra con casillero")},{value:"entrega-directa",label:t("Entrega directa")}]} /><Select label={t("La factura se genera")} value={flow.billingMoment} onChange={event=>{setFlow({...flow,billingMoment:event.target.value as FlowConfig["billingMoment"]});setIndex(0);}} options={[{value:"al-recibir",label:t("Al recibir en bodega")},{value:"al-despachar",label:t("Al despachar el camión")}]} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs leading-5 text-ink-500">{t("Estos controles solo cambian la explicación. No modifican la configuración, crean operaciones ni envían correos.")}</p><Button variant="ghost" disabled={!changed} onClick={()=>{setFlow(initialFlow);setIndex(0);}}><RotateCcw className="size-4" />{t("Restaurar")}</Button></div></details>
    </div>
    <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav className="border-b border-line-300 bg-cream-50 p-4 lg:border-b-0 lg:border-r" aria-label={t("Etapas del recorrido")}><ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">{steps.map((item,position)=><li key={item.id}><button type="button" aria-current={index===position?"step":undefined} onClick={()=>setIndex(position)} className={`flex min-h-12 w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm transition ${index===position?"bg-navy-900 font-semibold text-white":"text-ink-700 hover:bg-cream-100"}`}><span aria-hidden="true" className={`grid size-6 shrink-0 place-items-center rounded-full border text-xs ${index===position?"border-white/40":"border-line-300"}`}>{position<index?<Check className="size-3" />:position+1}</span><span>{item.title}</span></button></li>)}</ol></nav>
      <div className="min-w-0 p-5 sm:p-8">
        <div aria-live="polite" aria-atomic="true"><p className="text-xs font-semibold uppercase tracking-[.16em] text-brand-700">{String(index+1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")} · {track === "soporte" ? t("Atención al cliente") : flowOptionLabel(flow.billingMoment, locale)}</p><h3 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{step.title}</h3><p className="mt-3 max-w-2xl text-base leading-7 text-ink-700">{step.summary}</p></div>
        <div className="mt-6 flex flex-wrap gap-3" aria-label={t("Estados después de esta etapa")}>{([{label:t("Caja"),status:step.box},{label:t("Envío"),status:step.shipment},{label:t("Camión"),status:step.truck},{label:t("Factura"),status:step.invoice},{label:t("Ticket"),status:step.support}]).filter(item=>item.status).map(item=><div key={item.label} className="flex items-center gap-2 text-xs text-ink-500"><span>{item.label}</span><StatusBadge status={item.status!} /></div>)}</div>
        <div className="mt-7 grid gap-5 xl:grid-cols-3">{lanes.map(lane=><section key={lane.label} className="min-w-0 border-t border-line-300 pt-4"><h4 className="flex items-center gap-2 text-sm font-semibold text-navy-900"><lane.icon aria-hidden="true" className="size-4" />{lane.label}</h4><p className="mt-3 text-sm leading-6 text-ink-700">{lane.body}</p></section>)}</div>
        <div className="mt-7 grid gap-4 rounded-lg bg-cream-100 p-5"><div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-900" /><div><h4 className="text-sm font-semibold text-navy-900">{t("Regla que protege el proceso")}</h4><p className="mt-1 text-sm leading-6 text-ink-700">{step.guard}</p></div></div><div className="flex items-start gap-3"><Mail aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-navy-900" /><div><h4 className="text-sm font-semibold text-navy-900">{t("Comunicación con el cliente")}</h4><p className="mt-1 text-sm leading-6 text-ink-700">{step.notification}</p></div></div></div>
        <div className="mt-7 flex items-center justify-between gap-3"><Button variant="ghost" disabled={index===0} onClick={()=>setIndex(index-1)}><ArrowLeft aria-hidden="true" className="size-4" />{t("Anterior")}</Button><Button disabled={index===steps.length-1} onClick={()=>setIndex(index+1)}>{t("Siguiente")}<ArrowRight aria-hidden="true" className="size-4" /></Button></div>
      </div>
    </div>
    <p className="border-t border-line-300 bg-cream-50 px-5 py-4 text-xs leading-5 text-ink-500 sm:px-7">{t("Demostración explicativa, no rastreo en vivo. «Correo en cola» no significa correo entregado: el envío externo depende de Resend, su remitente verificado y la configuración de despliegue.")}</p>
  </div>;
}
