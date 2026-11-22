"use client";
import {useState} from 'react';
import {PrivateFileLink} from './private-file-link';
import {ui} from '@/lib/i18n/catalogs/ui';
import {useT} from '@/lib/i18n/provider';
export function PrivatePhoto({id,name}:{id:string;name:string}){
 const [state,setState]=useState<'loading'|'ready'|'error'>('loading');
 const t=useT(ui);
 const src=`/api/files/${encodeURIComponent(id)}?inline=1`;
 return <div className="grid gap-3">
  <div className="overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
   {state==='loading'&&<p role="status" className="p-4 text-sm text-navy-500">{t("Cargando foto de recepción…")}</p>}
   {state==='error'?<p role="alert" className="p-4 text-sm text-navy-500">{t("No se pudo cargar la foto.")} <button type="button" onClick={()=>setState('loading')} className="font-semibold underline">{t("Reintentar")}</button></p>:<a href={src} target="_blank" rel="noopener noreferrer" aria-label={t("Ampliar foto de recepción")}>
    {/* eslint-disable-next-line @next/next/no-img-element -- authenticated image must bypass the public image optimizer */}
    <img src={src} alt={t("Foto del paquete registrada en recepción")} onLoad={()=>setState('ready')} onError={()=>setState('error')} className="max-h-96 w-full object-contain"/>
   </a>}
  </div>
  <p className="text-xs text-navy-500">{t("Toca la imagen para ampliarla.")}</p>
  <PrivateFileLink id={id} name={name}/>
 </div>;
}
