"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {Barcode,Camera,CheckCircle2,AlertCircle,Keyboard,ScanLine} from "lucide-react";
import {scanLoad} from "@/lib/auth/warehouse-actions";
import {transitionTruckState} from "@/lib/auth/admin-actions";
import type {Box,Truck,Warehouse} from "@/lib/types";
import {Dialog} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {TruckLoadSummary} from "./truck-load-summary";
import {CameraBarcodeReader} from "./camera-barcode-reader";

export function TruckScanner({truck,boxes,warehouses}:{truck:Truck;boxes:Box[];warehouses:Warehouse[]}){
 const router=useRouter(),input=useRef<HTMLInputElement>(null),lock=useRef(false);
 const [open,setOpen]=useState(false),[camera,setCamera]=useState(false),[focused,setFocused]=useState(false);
 const [destination,setDestination]=useState(truck.stops?.[0]?.warehouseId??""),[code,setCode]=useState(""),[busy,setBusy]=useState(false);
 const [feedback,setFeedback]=useState<{ok:boolean;text:string}|null>(null);
 const [recent,setRecent]=useState<Array<{code:string;weight:number;destination:string}>>([]);
 const [snapshot,setSnapshot]=useState(truck),[currentTruck,setCurrentTruck]=useState(truck),[confirmed,setConfirmed]=useState<Box[]>([]);
 // A refreshed server snapshot supersedes local confirmations, including removals.
 if(snapshot!==truck){setSnapshot(truck);setCurrentTruck(truck);setConfirmed([]);}
 const stops=currentTruck.stops??[],ready=currentTruck.status==="cargando"&&stops.some(s=>s.warehouseId===destination);
 const assigned=[...boxes.filter(b=>currentTruck.boxIds.includes(b.id)),...confirmed.filter(b=>currentTruck.boxIds.includes(b.id)&&!boxes.some(original=>original.id===b.id))];
 useEffect(()=>{const hash=()=>{if(window.location.hash==="#carga-escaneada")setOpen(true);};hash();window.addEventListener("hashchange",hash);return()=>window.removeEventListener("hashchange",hash);},[]);
 useEffect(()=>{if(open&&ready&&!busy&&!camera)input.current?.focus();},[open,ready,busy,camera]);
 function close(){if(lock.current)return;setCamera(false);setOpen(false);if(window.location.hash==="#carga-escaneada")window.history.replaceState(null,"",window.location.pathname+window.location.search);}
 async function submit(raw:string){
  const value=raw.trim().toUpperCase();if(lock.current||!ready||!value)return;
  lock.current=true;setBusy(true);setFeedback(null);setCamera(false);
  try{const result=await scanLoad(truck.id,value,destination);if(!result.ok){setFeedback({ok:false,text:result.error});setCode(value);return;}
   setCurrentTruck(result.truck);setConfirmed(items=>[...items.filter(b=>b.id!==result.box.id),result.box]);
   setRecent(items=>[{code:result.box.code,weight:result.box.weightLb,destination:warehouses.find(w=>w.id===destination)?.name??destination},...items].slice(0,6));
   setFeedback({ok:true,text:result.box.code+" registrado en el camión. Listo para el siguiente paquete."});setCode("");router.refresh();
  }catch{setFeedback({ok:false,text:"No se confirmó el registro. Consulta las cajas asignadas antes de reintentar."});}
  finally{lock.current=false;setBusy(false);requestAnimationFrame(()=>{input.current?.focus();input.current?.select();});}
 }
 async function start(){if(lock.current)return;lock.current=true;setBusy(true);try{const r=await transitionTruckState(truck.id);if(!r.ok){setFeedback({ok:false,text:r.error});return;}setCurrentTruck(r.truck);setFeedback({ok:true,text:"Carga iniciada. Selecciona el destino y escanea la etiqueta A&L."});router.refresh();}catch{setFeedback({ok:false,text:"No se pudo iniciar la carga. Revisa el estado del camión."});}finally{lock.current=false;setBusy(false);}}
 return <section id="carga-escaneada" className="scroll-mt-6 rounded-2xl border border-orange-200 bg-orange-50/50 p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl bg-navy-950 text-white"><ScanLine className="size-6"/></span><div><h3 className="font-display text-lg font-bold">Agregar cajas al camión</h3><p className="mt-1 text-sm text-navy-500">Registra cada caja al subirla. El peso y el volumen se actualizan con cada lectura.</p></div></div><Button type="button" className="w-full sm:w-auto" onClick={()=>setOpen(true)}><Barcode className="size-4"/>Escanear cajas</Button></div><p className="mt-4 text-xs text-navy-500">Lector USB/Bluetooth en modo teclado + Enter, cámara o código manual. {currentTruck.boxIds.length} paquetes registrados.</p>
 <Dialog open={open} onClose={close} title={"Escanear carga · "+truck.code} description="Cada lectura aceptada registra físicamente el paquete en este camión." size="large"><div className="grid max-h-[72vh] gap-4 overflow-y-auto pr-1">
 <TruckLoadSummary boxes={assigned} maxWeightLb={currentTruck.maxWeightLb}/>
 {currentTruck.status==="planificado"?<div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="mb-3 text-sm">{stops.length?"La ruta está guardada. Inicia la carga para registrar paquetes.":"Guarda primero un origen y al menos una parada en la ruta del camión."}</p><Button type="button" loading={busy} disabled={!stops.length} onClick={start}>Iniciar carga</Button></div>:currentTruck.status!=="cargando"?<p role="status" className="rounded-xl bg-stone-100 p-4">La carga está cerrada. No se pueden agregar paquetes después del despacho.</p>:<>
 <Select label="Descargar este paquete en" disabled={busy||camera} value={destination} options={[{value:"",label:"Selecciona destino guardado"},...stops.map(s=>({value:s.warehouseId,label:warehouses.find(w=>w.id===s.warehouseId)?.name??s.city}))]} onChange={e=>{setDestination(e.target.value);setFeedback(null);}}/>
 <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 text-sm font-semibold"><span className={"size-2 rounded-full "+(busy?"bg-orange-500":focused&&!camera&&ready?"bg-emerald-500":"bg-stone-400")}/>{busy?"Verificando paquete…":camera?"Cámara activa":focused&&ready?"Listo para recibir código":"Activa el lector para comenzar"}</span><Barcode className="size-8 text-navy-400"/></div>
 {camera?<CameraBarcodeReader onRead={value=>{setCode(value);void submit(value);}} onError={text=>{setCamera(false);setFeedback({ok:false,text});}}/>:<div className="mb-4 grid h-24 place-items-center rounded-xl border border-dashed border-stone-300 bg-white"><div className="flex items-center gap-3 text-navy-500"><ScanLine className="size-10"/><p className="text-sm">Apunta el lector a la etiqueta<br/><span className="text-xs">Busca el código BX-… del paquete</span></p></div></div>}
 <form onSubmit={e=>{e.preventDefault();void submit(code);}} className="grid gap-3 sm:grid-cols-[1fr_auto]"><Input ref={input} label="Código del paquete" placeholder="Escanea o escribe BX-…" autoComplete="off" spellCheck={false} required disabled={!ready||camera} readOnly={busy} value={code} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} onChange={e=>setCode(e.target.value)}/><Button type="submit" className="self-end" disabled={!ready||camera||!code.trim()} loading={busy}>Registrar paquete</Button></form>
 <div className="mt-4 flex flex-wrap gap-2"><Button type="button" variant="secondary" disabled={!ready||busy} onClick={()=>{setCamera(false);input.current?.focus();}}><Keyboard className="size-4"/>Activar lector</Button><Button type="button" variant="ghost" disabled={!ready||busy} onClick={()=>setCamera(value=>!value)}><Camera className="size-4"/>{camera?"Cerrar cámara":"Usar cámara"}</Button></div><p className="mt-3 text-xs leading-5 text-navy-500">El lector USB/Bluetooth debe estar conectado al equipo y enviar Enter después del código. No necesita activar la cámara. También puedes escribir el código y pulsar Registrar.</p></div></>}
 {feedback&&<div role={feedback.ok?"status":"alert"} className={"flex gap-2 rounded-xl border p-3 text-sm "+(feedback.ok?"border-emerald-200 bg-emerald-50 text-emerald-900":"border-red-200 bg-red-50 text-red-900")}>{feedback.ok?<CheckCircle2 className="size-5 shrink-0"/>:<AlertCircle className="size-5 shrink-0"/>}{feedback.text}</div>}
 {recent.length>0&&<div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-navy-400">Últimas lecturas aceptadas · esta sesión</h4><ul className="divide-y divide-stone-100">{recent.map(r=><li key={r.code} className="flex justify-between gap-3 py-2 text-sm"><span className="font-semibold">{r.code}<span className="block text-xs font-normal text-navy-500">{r.destination}</span></span><span className="tabular-nums">{r.weight} lb</span></li>)}</ul></div>}
 <Button type="button" variant="ghost" disabled={busy} onClick={close}>Volver al camión</Button></div></Dialog></section>;
}
