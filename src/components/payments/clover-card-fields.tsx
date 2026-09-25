'use client';
import {useEffect,useId,useImperativeHandle,useRef,useState,type Ref} from 'react';
import {LockKeyhole} from 'lucide-react';
import {cloverFormConfig} from '@/lib/auth/clover-actions';
import styles from './clover-card-fields.module.css';

type SDK={elements:()=>{create:(name:string,style:unknown)=>{mount:(selector:string)=>void}};createToken:()=>Promise<{token?:string;errors?:Record<string,string>}>};
declare global {interface Window {Clover?:new(key:string,options:{merchantId:string})=>SDK}}
export type CloverCardHandle={tokenize:()=>Promise<string>};
export type CloverFormConfig={publicKey:string;merchantId:string;sdkUrl:string;environment:'sandbox'|'production'};
const scripts=new Map<string,Promise<void>>();
function loadSDK(url:string){let pending=scripts.get(url);if(!pending){pending=new Promise<void>((resolve,reject)=>{const script=document.createElement('script');script.src=url;script.async=true;script.onload=()=>resolve();script.onerror=()=>{script.remove();scripts.delete(url);reject(new Error('No se pudo cargar Clover. Revisa tu conexión y vuelve a intentar.'));};document.head.appendChild(script);});scripts.set(url,pending);}return pending;}
const fields=[['CARD_NUMBER','Número de tarjeta'],['CARD_DATE','Vencimiento'],['CARD_CVV','CVV'],['CARD_POSTAL_CODE','Código postal']];
export function CloverCardFields({ref,config:provided,onReady}:{ref?:Ref<CloverCardHandle>;config?:CloverFormConfig;onReady?:(ready:boolean)=>void}){
 const [loaded,setLoaded]=useState<CloverFormConfig>(),[error,setError]=useState(''),[ready,setReady]=useState(false),[retry,setRetry]=useState(0);
 const sdk=useRef<SDK|null>(null);const prefix=`clover-${useId().replace(/[^a-zA-Z0-9]/g,'')}`;const config=provided??loaded;
 useEffect(()=>{if(provided)return;let active=true;cloverFormConfig().then(result=>{if(!active)return;if(result.ok)setLoaded(result.config);else setError(result.error);}).catch(()=>{if(active)setError('No se pudo consultar la configuración de Clover.');});return()=>{active=false;};},[provided,retry]);
 useEffect(()=>{if(!config)return;let active=true;
  loadSDK(config.sdkUrl).then(()=>{if(!active)return;if(!window.Clover)throw new Error('Clover no está disponible.');const client=new window.Clover(config.publicKey,{merchantId:config.merchantId});const elements=client.elements();for(const [name] of fields)elements.create(name,{input:{fontSize:'16px',lineHeight:'46px',padding:'0',margin:'0',color:'#10213b'}}).mount(`#${prefix}-${name}`);sdk.current=client;setReady(true);onReady?.(true);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'No se pudo abrir Clover.');});
  return()=>{active=false;sdk.current=null;setReady(false);onReady?.(false);for(const[name]of fields)document.getElementById(`${prefix}-${name}`)?.replaceChildren();};
 },[config,prefix,onReady,retry]);
 useImperativeHandle(ref,()=>({tokenize:async()=>{if(!sdk.current)throw new Error('Espera a que el formulario seguro esté listo.');setError('');const result=await sdk.current.createToken();if(!result.token||result.errors){const message='Revisa número de tarjeta, vencimiento, CVV y código postal.';setError(message);throw new Error(message);}return result.token;}}));
 return <div className="grid gap-3" aria-label="Datos seguros de tarjeta Clover">
  {config?.environment==='sandbox'&&<p className="text-xs font-medium text-amber-700">Modo de pruebas · no usar tarjetas reales</p>}
  {error?<div role="alert" className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">{error}<button type="button" className="ml-2 underline" onClick={()=>{setError('');setRetry(n=>n+1);}}>Reintentar</button></div>:!ready&&<p role="status" className="text-xs text-navy-500">Cargando formulario seguro…</p>}
  <div className="grid min-w-0 grid-cols-2 gap-3">{fields.map(([name,label])=><div key={name} className={name==='CARD_NUMBER'||name==='CARD_POSTAL_CODE'?'col-span-2 min-w-0':'min-w-0'}><p className="mb-1.5 text-xs font-medium text-navy-600">{label}</p><div id={`${prefix}-${name}`} aria-label={label} className={styles.field}/></div>)}</div>
  <p className="flex items-start gap-2 text-[11px] leading-4 text-navy-500"><LockKeyhole className="size-3.5 shrink-0"/>Procesado por Clover. No guardamos el número de tarjeta ni el CVV.</p>
 </div>;
}
