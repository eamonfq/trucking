'use client';
import {useEffect,useState} from 'react';
import {Bell,BellOff} from 'lucide-react';
import {pushSettings,subscribePush,unsubscribePush} from '@/lib/auth/push-actions';
import {usePwa} from './pwa-provider';
export function PushSettings(){
 const {ios,installed}=usePwa();
 const [supported,setSupported]=useState(false),[active,setActive]=useState(false),[key,setKey]=useState<string|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('Comprobando notificaciones…');
 useEffect(()=>{let live=true;async function check(){const supported='serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window&&window.isSecureContext;setSupported(supported);if(!supported){setMessage('Abre la app en un navegador compatible para activar avisos.');return;}try{const reg=await navigator.serviceWorker.getRegistration('/');const sub=await reg?.pushManager.getSubscription();const settings=await pushSettings(sub?.endpoint);if(live){setKey(settings.publicKey);setActive(settings.active&&Notification.permission==='granted');setMessage(settings.publicKey?'':'Los avisos push aún no están habilitados por el equipo.');}}catch{if(live)setMessage('No pudimos consultar los avisos. Recarga para reintentar.');}}void check();return()=>{live=false;};},[]);
 async function toggle(){setBusy(true);setMessage('');try{
  const reg=await navigator.serviceWorker.getRegistration('/');if(!reg?.active)throw new Error('La app se está preparando. Recarga e inténtalo de nuevo.');
  const existing=await reg.pushManager.getSubscription();
  if(active){if(existing){const result=await unsubscribePush(existing.endpoint);if(!result.ok)throw new Error('Vuelve a iniciar sesión para cambiar los avisos.');await existing.unsubscribe();}setActive(false);setMessage('Avisos desactivados en este dispositivo. Seguirás recibiendo emails.');return;}
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Permite las notificaciones en la configuración del navegador para recibir avisos.');
  const sub=existing??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key!});
  const saved=await subscribePush(sub.toJSON());if(!saved.ok){if(!existing)await sub.unsubscribe();throw new Error(saved.error??'No se pudo activar.');}
  setActive(true);setMessage('Recibirás avisos de las mismas novedades operativas que enviamos por email.');
 }catch(error){setMessage(error instanceof Error?error.message:'No se pudo cambiar esta preferencia.');}finally{setBusy(false);}}
 return <div className="mt-5 border-t border-white/15 pt-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="flex items-center gap-2 text-sm font-semibold"><Bell className="size-4 text-orange-300"/>Avisos en este dispositivo</p><p className="mt-1 text-xs leading-5 text-slate-300">Recepción, movimientos y novedades de tu cuenta. Tú decides si activarlos.</p></div><button type="button" disabled={busy||!supported||!key||(ios&&!installed)} onClick={toggle} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 px-4 text-sm font-semibold hover:bg-white/10 disabled:opacity-50">{active?<BellOff className="size-4"/>:<Bell className="size-4"/>}{busy?'Guardando…':active?'Desactivar avisos':'Activar avisos'}</button></div>{ios&&!installed&&<p className="mt-3 text-xs text-orange-200">En iPhone/iPad instala la app y ábrela desde su icono para activar notificaciones (iOS/iPadOS 16.4 o posterior).</p>}{message&&<p role="status" className="mt-3 text-xs leading-5 text-slate-300">{message}</p>}</div>;
}
