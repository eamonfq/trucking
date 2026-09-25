'use client';
import {useEffect,useRef,useState} from 'react';
import {CreditCard,CheckCircle2} from 'lucide-react';
import {CloverCardFields,type CloverCardHandle} from "./clover-card-fields";
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {formatUsd} from '@/lib/utils/format';
import {prepareCloverPayment,submitCloverPayment,reconcileCloverPayment} from '@/lib/auth/clover-actions';

type Quote=Extract<Awaited<ReturnType<typeof prepareCloverPayment>>,{ok:true}>;
export function CloverCheckout({invoiceIds,warehouseId,requireLocation=false,onPaid,autoOpen=false,onPayable}:{invoiceIds:string[];warehouseId?:string;requireLocation?:boolean;onPaid?:()=>void;autoOpen?:boolean;onPayable?:()=>void}){
 const [quote,setQuote]=useState<Quote|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[chargeId,setChargeId]=useState('');
 const card=useRef<CloverCardHandle>(null),lock=useRef(false);
 const config=quote&&'config' in quote?quote.config:undefined;
 const attempt=quote&&'attempt' in quote?quote.attempt:undefined;
 const refresh=async()=>{const result=await prepareCloverPayment(invoiceIds);if(result.ok){setQuote(result);if('attempt'in result&&result.attempt?.status==='paid')onPaid?.();else if('config'in result&&result.config)onPayable?.();}else setError(result.error);};
 const idsKey=JSON.stringify(invoiceIds);
 useEffect(()=>{if(!autoOpen)return;let active=true;prepareCloverPayment(JSON.parse(idsKey)).then(result=>{if(active){if(result.ok)setQuote(result);else setError(result.error);}}).catch(()=>{if(active)setError('No se pudo consultar el pago.');});return()=>{active=false;};},[autoOpen,idsKey]);
 async function pay(){if(lock.current||!card.current||!quote)return;lock.current=true;setBusy(true);setError('');try{
   const token=await card.current.tokenize();
   const result=await submitCloverPayment(quote.invoiceIds,token,quote.amountUsd,warehouseId);
   if(!result.ok){setError(result.error);await refresh();return;}
   if(result.attempt.status==='declined'){setError('Clover rechazó la tarjeta. No se confirmó un pago. Abre de nuevo el formulario para usar otra tarjeta.');setQuote(null);return;}
   await refresh();
 }catch{setError('No se confirmó el pago. Consulta el estado antes de intentar otra vez.');await refresh();}finally{lock.current=false;setBusy(false);}}
 return <section className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5" aria-label="Pago seguro Clover">
  <div className="flex items-start gap-3"><span className="rounded-xl bg-orange-50 p-2 text-orange-700"><CreditCard className="size-5"/></span><div><h3 className="font-display font-bold text-navy-950">Pagar con Clover</h3><p className="mt-1 text-xs leading-5 text-navy-500">Tarjeta en formulario seguro. Solo se confirma el pago con la respuesta de Clover.</p></div></div>
  {error&&<p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
  {!quote&&<Button type="button" loading={busy} disabled={requireLocation&&!warehouseId} onClick={async()=>{setBusy(true);setError('');try{await refresh();}catch{setError('No se pudo consultar la factura.');}finally{setBusy(false);}}}>Abrir pago seguro</Button>}
  {requireLocation&&!warehouseId&&<p className="text-xs text-navy-500">Selecciona la ubicación del cobro.</p>}
  {quote&&<><div className="flex items-center justify-between border-y border-stone-100 py-3"><span className="text-sm">Total · {quote.invoiceNumbers.length} factura(s)</span><strong className="text-xl tabular-nums">{formatUsd(quote.amountUsd)}</strong></div><p className="text-xs text-navy-500 break-words">{quote.invoiceNumbers.join(' · ')}</p></>}
  {attempt?.status==='paid'?<p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-5"/>Pago confirmado. Referencia: {attempt.chargeId}{onPaid&&<button type="button" className="ml-2 underline" onClick={onPaid}>Continuar</button>}</p>:attempt?<div className="grid gap-3"><p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">Pago en verificación. No vuelvas a cobrar ni uses otro método hasta confirmar el resultado. Intento: {attempt.id}</p><Button type="button" variant="secondary" loading={busy} onClick={async()=>{setBusy(true);try{await refresh();}finally{setBusy(false);}}}>Consultar estado</Button>{quote?.canReconcile&&<div className="grid gap-3 border-t border-stone-200 pt-3"><Input label="ID del cargo en Clover" value={chargeId} onChange={e=>setChargeId(e.target.value)} hint="Copia el ID desde Clover para verificarlo. Esta consulta no realiza otro cargo."/><Button type="button" variant="secondary" loading={busy} disabled={!chargeId} onClick={async()=>{setBusy(true);setError('');try{const result=await reconcileCloverPayment(invoiceIds,chargeId);if(!result.ok)setError(result.error);else await refresh();}catch{setError('No se pudo verificar. No repitas el cobro.');}finally{setBusy(false);}}}>Verificar cargo con Clover</Button></div>}</div>:config&&<>
   <CloverCardFields ref={card} config={config} onReady={setReady}/>
   <Button type="button" loading={busy} disabled={!ready||(requireLocation&&!warehouseId)} onClick={pay}>Pagar {formatUsd(quote!.amountUsd)}</Button>

  </>}
 </section>;
}
