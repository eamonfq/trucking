"use client";
import { warehouseSupports } from "@/lib/config/warehouses";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTruckStops } from "@/lib/auth/warehouse-actions";
import {TruckScanner} from "./truck-scanner";
import type { Box, Truck, Warehouse } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
export function TruckRoute({truck,warehouses,boxes=[]}:{truck:Truck;warehouses:Warehouse[];boxes?:Box[]}){
 const router=useRouter();
 const [stops,setStops]=useState((truck.stops??[]).map(s=>({warehouseId:s.warehouseId,arrivalDate:s.arrivalDate}))),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const origins=warehouses.filter(w=>w.active&&warehouseSupports(w,"origen"));
 const [origin,setOrigin]=useState(truck.originWarehouseId??(origins.length===1?origins[0].id:""));
 const editable=["planificado","cargando"].includes(truck.status);
 async function execute(){setBusy(true);try{const result=await saveTruckStops(truck.id,stops,origin);setMessage(result.ok?"Paradas y fechas guardadas. Abre el escáner para cargar paquetes.":result.error);if(result.ok)router.refresh();}catch{setMessage("No se pudo guardar la ruta. Revisa el estado antes de reintentar.");}finally{setBusy(false);}}
 return <><div className="mb-6"><TruckScanner truck={truck} boxes={boxes} warehouses={warehouses}/></div><section id="ruta-del-camion" className="mb-7 grid gap-5 rounded-3xl border border-stone-200 bg-white p-6"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Ruta y control físico</p><h2 className="mt-2 font-display text-2xl font-bold">Un viaje, múltiples destinos</h2><p className="mt-2 text-sm text-navy-500">Ordena las paradas por fecha de llegada. No puedes quitar un destino con paquetes cargados.</p></div>
 <form onSubmit={e=>{e.preventDefault();void execute();}} className="grid gap-3"><Select label="Almacén de origen · salida del viaje" required disabled={!editable||truck.boxIds.length>0} value={origin} options={[{value:"",label:"Selecciona el almacén de salida"},...warehouses.filter(w=>(w.active&&warehouseSupports(w,"origen"))||w.id===truck.originWarehouseId).map(w=>({value:w.id,label:`${w.name} · ${w.city}`}))]} onChange={e=>setOrigin(e.target.value)}/>{stops.map((stop,index)=><div key={index} className="grid items-end gap-3 rounded-xl bg-cream-50 p-3 md:grid-cols-[1fr_1fr_auto]"><Select label={`Almacén · parada ${index+1}`} disabled={!editable} value={stop.warehouseId} options={[{value:"",label:"Selecciona almacén"},...warehouses.filter(w=>(w.active&&warehouseSupports(w,"destino")&&w.id!==origin)||w.id===stop.warehouseId).map(w=>({value:w.id,label:`${w.name} · ${w.city}`}))]} onChange={e=>setStops(stops.map((s,i)=>i===index?{...s,warehouseId:e.target.value}:s))}/><Input label="Llegada estimada" type="date" required min={truck.departureDate} disabled={!editable} value={stop.arrivalDate} onChange={e=>setStops(stops.map((s,i)=>i===index?{...s,arrivalDate:e.target.value}:s))}/><Button type="button" variant="ghost" disabled={!editable} onClick={()=>setStops(stops.filter((_,i)=>i!==index))}>Quitar</Button></div>)}{editable&&<div className="flex flex-wrap gap-3"><Button type="button" variant="secondary" onClick={()=>setStops([...stops,{warehouseId:"",arrivalDate:stops.at(-1)?.arrivalDate??truck.departureDate}])}>Agregar destino</Button><Button type="submit" loading={busy}>Guardar ruta</Button></div>}</form>
 <p role="status" aria-live="polite" className="text-sm font-semibold">{message}</p></section></>;
}
