"use client";
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {Input} from '@/components/ui/input';
import {Button} from '@/components/ui/button';
import {registerPendingCargoWeight} from '@/lib/auth/cargo-weight-actions';
export function KnownCargoWeight({boxId}:{boxId:string}){
 const [weight,setWeight]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),router=useRouter();
 return <form className="grid gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-5" onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{const result=await registerPendingCargoWeight(boxId,Number(weight));setMessage(result.ok?'Peso registrado. Reimprime la etiqueta.':result.error);if(result.ok)router.refresh();}catch{setMessage('No se confirmó el cambio. Actualiza antes de reintentar.');}finally{setBusy(false);}}}><h2 className="font-semibold">Peso pendiente de registrar</h2><p className="text-sm leading-6">Completa el pesaje físico antes de usar un camión con límite de peso. Esto no cambia el precio acordado ni los pagos.</p><div className="flex flex-wrap items-end gap-3"><Input label="Peso real de esta pieza (lb)" type="number" min="0.001" step="0.001" required value={weight} onChange={e=>setWeight(e.target.value)}/><Button loading={busy} type="submit">Registrar peso físico</Button></div><p role="status" className="text-sm">{message}</p></form>;
}
