'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {LockKeyhole,CreditCard,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {formatUsd} from '@/lib/utils/format';
import {prepareCloverPayment,submitCloverPayment,reconcileCloverPayment} from '@/lib/auth/clover-actions';

type SDK={elements:()=>{create:(name:string,style:unknown)=>{mount:(selector:string)=>void}};createToken:()=>Promise<{token?:string;errors?:Record<string,string>}>};
declare global {interface Window {Clover?:new(key:string,options:{merchantId:string})=>SDK}}
const scripts=new Map<string,Promise<void>>();
function loadSDK(url:string){let pending=scripts.get(url);if(!pending){pending=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();scripts.delete(url);reject(new Error('No se pudo cargar el formulario seguro. Revisa tu conexión y vuelve a abrirlo.'));};document.head.appendChild(script);});scripts.set(url,pending);}return pending;}
type Quote=Extract<Awaited<ReturnType<typeof prepareCloverPayment>>,{ok:true}>;
export function CloverCheckout({invoiceIds,warehouseId,requireLocation=false,onPaid}:{invoiceIds:string[];warehouseId?:string;requireLocation?:boolean;onPaid?:()=>void}){
 const [quote,setQuote]=useState<Quote|null>(null),[busy,setBusy]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[chargeId,setChargeId]=useState('');
 const sdk=useRef<SDK|null>(null),lock=useRef(false);const prefix=`clover-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;
 const config=quote&&'config' in quote?quote.config:undefined;
 const attempt=quote&&'attempt' in quote?quote.attempt:undefined;
 const refresh=async()=>{const result=await prepareCloverPayment(invoiceIds);if(result.ok){setQuote(result);if('attempt'in result&&result.attempt?.status==='paid')onPaid?.();}else setError(result.error);};
 useEffect(()=>{
   if(!config)return;let active=true;
   loadSDK(config.sdkUrl).then(()=>{if(!active)return;if(!window.Clover)throw new Error('Clover no está disponible.');const client=new window.Clover(config.publicKey,{merchantId:config.merchantId});const elements=client.elements();for(const name of ['CARD_NUMBER','CARD_DATE','CARD_CVV','CARD_POSTAL_CODE'])elements.create(name,{input:{fontSize:'16px',color:'#10213b'}}).mount(`#${prefix}-${name}`);sdk.current=client;setReady(true);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudo abrir Clover.');});
   return()=>{active=false;sdk.current=null;setReady(false);for(const name of ['CARD_NUMBER','CARD_DATE','CARD_CVV','CARD_POSTAL_CODE'])document.getElementById(`${prefix}-${name}`)?.replaceChildren();};
 },[config,prefix]);
 async function pay(){if(lock.current||!sdk.current||!quote)return;lock.current=true;setBusy(true);setError('');try{
   const token=await sdk.current.createToken();if(!token.token||token.errors)throw new Error('Revisa el número de tarjeta, vencimiento, CVV y código postal.');
   const result=await submitCloverPayment(quote.invoiceIds,token.token,quote.amountUsd,warehouseId);
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
  {attempt?.status==='paid'?<p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="size-5"/>Pago confirmado. Referencia: {attempt.chargeId}</p>:attempt?<div className="grid gap-3"><p role="status" className="rounded-xl bg-amber-50 p-3 text-sm">Pago en verificación. No vuelvas a cobrar ni uses otro método hasta confirmar el resultado. Intento: {attempt.id}</p><Button type="button" variant="secondary" loading={busy} onClick={async()=>{setBusy(true);try{await refresh();}finally{setBusy(false);}}}>Consultar estado</Button>{quote?.canReconcile&&<div className="grid gap-3 border-t border-stone-200 pt-3"><Input label="ID del cargo en Clover" value={chargeId} onChange={e=>setChargeId(e.target.value)} hint="Copia el ID desde Clover para verificarlo. Esta consulta no realiza otro cargo."/><Button type="button" variant="secondary" loading={busy} disabled={!chargeId} onClick={async()=>{setBusy(true);setError('');try{const result=await reconcileCloverPayment(invoiceIds,chargeId);if(!result.ok)setError(result.error);else await refresh();}catch{setError('No se pudo verificar. No repitas el cobro.');}finally{setBusy(false);}}}>Verificar cargo con Clover</Button></div>}</div>:config&&<>
   {config.environment==='sandbox'&&<p className="text-xs font-semibold text-amber-700">Modo de pruebas · no usar tarjetas reales</p>}
   {!ready&&<p role="status" className="text-sm text-navy-500">Cargando formulario seguro…</p>}
   <div className="grid grid-cols-2 gap-3">{[['CARD_NUMBER','Número de tarjeta'],['CARD_DATE','Vencimiento'],['CARD_CVV','CVV'],['CARD_POSTAL_CODE','Código postal']].map(([field,label])=><div key={field} className={field==='CARD_NUMBER'?'col-span-2':''}><p className="mb-2 text-xs font-medium text-navy-600">{label}</p><div id={`${prefix}-${field}`} aria-label={label} className="min-h-12 rounded-xl border border-stone-200 bg-white px-3 py-2"/></div>)}</div>
   <Button type="button" loading={busy} disabled={!ready||(requireLocation&&!warehouseId)} onClick={pay}>Pagar {formatUsd(quote!.amountUsd)} USD</Button>
   <p className="flex gap-2 text-xs leading-5 text-navy-500"><LockKeyhole className="size-4 shrink-0"/>Los datos de tarjeta se ingresan directamente en Clover. No guardamos el número ni el CVV.</p>
  </>}
 </section>;
}
