"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import type { Box } from "@/lib/types";
import { registerDelivery } from "@/lib/auth/operations-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { LANGUAGE_TAG } from "@/lib/i18n/config";
import { trucksDelivery } from "@/lib/i18n/catalogs/trucks-delivery";
import { useLocale, useT } from "@/lib/i18n/provider";

export type DeliveryRow = Pick<Box,"id"|"code"|"status"|"deliveryReceipt"> & {blocked?:string|null;customer:string;recipient:string;shipment:string;truck:string;balance:string};
export function DeliveryDesk({rows}:{rows:DeliveryRow[]}) {
  const t=useT(trucksDelivery),locale=useLocale();
  const [query,setQuery]=useState(""); const [history,setHistory]=useState(false); const [selected,setSelected]=useState<string>();
  const visible=rows.filter(row=>(history?row.status==="entregada":row.status==="en-destino")&&`${row.code} ${row.customer} ${row.shipment} ${row.truck}`.toLowerCase().includes(query.toLowerCase()));
  const active=rows.find(row=>row.id===selected&&row.status==="en-destino");
  return <div className="mt-7 grid gap-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="w-full sm:max-w-md"><Input label={t("Buscar caja, envío o cliente")} value={query} onChange={event=>setQuery(event.target.value)} /></div><Button variant="ghost" onClick={()=>{setHistory(!history);setSelected(undefined);}}>{history?t("Ver pendientes"):t("Ver entregas registradas")}</Button></div>
    <div className="grid gap-4 xl:grid-cols-2">{visible.map(row=><article key={row.id} className="rounded-2xl border border-line-300 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-xl font-semibold text-navy-900">{row.code}</h2><StatusBadge status={row.status} /></div><p className="mt-3 text-sm font-semibold text-navy-900">{row.customer}</p><dl className="mt-4 grid gap-3 text-sm text-ink-500"><div><dt className="text-xs">{t("Envío / guía máster")}</dt><dd className="mt-1 text-navy-900">{row.shipment} · {row.truck}</dd></div><div><dt className="text-xs">{t("Destinatario previsto")}</dt><dd className="mt-1 text-navy-900">{row.recipient}</dd></div><div><dt className="text-xs">{t("Facturación vinculada")}</dt><dd className="mt-1 text-navy-900">{row.balance}</dd></div></dl>{row.deliveryReceipt?<p className="mt-5 rounded-xl bg-cream-100 p-4 text-sm leading-6">{t("Recibió: {name}",{name:row.deliveryReceipt.receivedBy})}<br />{new Date(row.deliveryReceipt.deliveredAt).toLocaleString(LANGUAGE_TAG[locale])}<br />{row.deliveryReceipt.note}</p>:row.status==="en-destino"?<Button className="mt-5 w-full" variant="secondary" disabled={!!row.blocked} title={row.blocked??undefined} onClick={()=>setSelected(selected===row.id?undefined:row.id)}><CheckCheck className="size-4" />{row.blocked?t("Entrega bloqueada · revisar pago"):t("Registrar entrega")}</Button>:<p className="mt-5 text-xs text-ink-500">{t("Entrega histórica sin constancia de recepción.")}</p>}{active?.id===row.id&&<DeliveryForm key={row.id} row={row} onDone={()=>setSelected(undefined)} />}</article>)}</div>
    {!visible.length&&<div className="rounded-2xl border border-line-300 bg-white px-6 py-16 text-center"><CheckCheck className="mx-auto size-9 text-brand-700" /><h2 className="mt-4 font-display text-xl font-semibold">{history?t("Sin entregas registradas"):t("Sin entregas pendientes")}</h2><p className="mt-2 text-sm text-ink-500">{query?t("Prueba con otro código o cliente."):t("Las cajas aparecerán aquí cuando el camión llegue a destino.")}</p></div>}
    <p className="text-xs leading-5 text-ink-500">{t("El cierre de un camión no entrega cajas automáticamente. Cada recepción se registra individualmente; el envío se completa al entregar su última caja.")}</p>
  </div>;
}

function DeliveryForm({row,onDone}:{row:DeliveryRow;onDone:()=>void}) {
  const [name,setName]=useState("");const [note,setNote]=useState("");const [error,setError]=useState("");const [pending,startTransition]=useTransition();const router=useRouter();const {showToast}=useToast();const t=useT(trucksDelivery);
  return <form className="mt-5 grid gap-4 border-t border-line-300 pt-5" onSubmit={event=>{event.preventDefault();setError("");startTransition(async()=>{try{const result=await registerDelivery({boxId:row.id,receivedBy:name,note});if(!result.ok){setError(result.error);return;}showToast({title:t("Entrega registrada"),description:t("{code} actualizada. Notificación y correo en cola.",{code:row.code})});onDone();router.refresh();}catch{setError(t("No se pudo guardar. Actualiza antes de volver a intentarlo."));}});}}><Input label={t("Nombre de quien recibió físicamente")} required minLength={3} maxLength={160} value={name} onChange={event=>setName(event.target.value)} /><Textarea label={t("Verificación y observaciones de entrega")} required minLength={5} maxLength={1000} rows={3} value={note} onChange={event=>setNote(event.target.value)} placeholder={t("Ej. Identidad verificada en sucursal, caja recibida sin incidencias.")} /><p className="text-xs leading-5 text-ink-500">{t("Confirma únicamente después de la entrega física. No guardes números de identificación. Este registro no incluye firma digital.")}</p>{error&&<p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit" loading={pending}>{t("Confirmar entrega de {code}",{code:row.code})}</Button></form>;
}
