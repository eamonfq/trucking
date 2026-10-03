"use client";

import Link,{useAdminPermission} from "@/components/admin/admin-access";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PackagePlus } from "lucide-react";
import { CUSTOM_CAPACITY_CATEGORY } from "@/lib/config/custom-cargo";
import { useCatalog } from "@/components/ui/catalog-provider";
import { getStatusLabel } from "@/lib/config/status";
import { BOX_STATUSES, type Box, type Truck, type User, type Warehouse } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { TruckScanner } from "./truck-scanner";
import { Button } from "@/components/ui/button";
import { loadSelectedPackages } from "@/lib/auth/warehouse-actions";
import {ReceptionList} from "@/components/ui/reception-list";
import { TruckLoadSummary } from "./truck-load-summary";

export function WarehouseBoard({ initialBoxes, initialTrucks, initialLoadedBoxes, users, warehouses }: { initialBoxes: Box[]; initialTrucks: Truck[]; initialLoadedBoxes: Box[]; users: User[]; warehouses: Warehouse[] }) {
  const canLoad=useAdminPermission("camiones");
  const router=useRouter(),loadLock=useRef(false);
  const [loading,setLoading]=useState(false);
  const [feedback,setFeedback]=useState<{ok:boolean;text:string}|null>(null);
  const [destination,setDestination]=useState("");
  const catalog=useCatalog();
  const categories=[...catalog,CUSTOM_CAPACITY_CATEGORY];
  const [confirmed, setConfirmed] = useState<Box[]>([]);
  const [truckUpdates, setTruckUpdates] = useState<Record<string, Truck>>({});
  const [snapshot, setSnapshot] = useState({ initialBoxes, initialTrucks });
  // Server refreshes remain authoritative; local confirmations only bridge that refresh.
  if (snapshot.initialBoxes !== initialBoxes || snapshot.initialTrucks !== initialTrucks) {
    setSnapshot({ initialBoxes, initialTrucks }); setConfirmed([]); setTruckUpdates({});
  }
  const boxes = useMemo(() => initialBoxes.filter(box => !confirmed.some(loaded => loaded.id === box.id)), [initialBoxes, confirmed]);
  const trucks = initialTrucks.map(truck => truckUpdates[truck.id] ?? truck);
  const [selected, setSelected] = useState<string[]>([]);
  const [truckId, setTruckId] = useState(initialTrucks[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const filtered = useMemo(() => boxes.filter((box) => {
    const customer = users.find((user) => user.id === box.userId);
    const term = search.trim().toLowerCase();
    return (!term || `${box.code} ${box.contentsNote??""} ${box.receptionGroup?.code??""} ${customer?.lockerCode ?? ""} ${customer?.firstName ?? ""} ${customer?.paternalLastName ?? ""}`.toLowerCase().includes(term)) && (status === "all" || box.status === status) && (category === "all" || box.categoryId === category);
  }), [boxes, category, search, status, users]);
  const selectable = filtered.filter((box) => box.status === "en-bodega").map((box) => box.id);
  const selectedBoxes = boxes.filter(box => box.status === "en-bodega" && selected.includes(box.id));
  const currentTruck = trucks.find(truck => truck.id === truckId);
  const stops=currentTruck?.stops??[];
  const destinationId=stops.length===1?stops[0].warehouseId:stops.some(stop=>stop.warehouseId===destination)?destination:"";
  const loadedBoxes = [...initialLoadedBoxes.filter(box => !confirmed.some(loaded => loaded.id === box.id)), ...confirmed];
  function handleLoaded(box: Box, truck: Truck) {
    setConfirmed(current => [...current.filter(item => item.id !== box.id), box]);
    setTruckUpdates(current => ({ ...current, [truck.id]: truck }));
    setSelected(current => current.filter(id => id !== box.id));
  }
  async function loadSelection(){
    if(loadLock.current||!currentTruck||!selectedBoxes.length||!destinationId)return;
    loadLock.current=true;setLoading(true);setFeedback(null);
    try{
      const result=await loadSelectedPackages(currentTruck.id,selectedBoxes.map(box=>box.id),destinationId);
      if(!result.ok){setFeedback({ok:false,text:result.error});return;}
      result.assigned.forEach(box=>handleLoaded(box,result.truck));
      setFeedback({ok:true,text:`${result.count} paquete(s) cargados a ${result.truck.code}.`});router.refresh();
    }catch{setFeedback({ok:false,text:"No se pudo confirmar la carga. Actualiza el inventario antes de reintentar."});}
    finally{loadLock.current=false;setLoading(false);}
  }


  return <div className="grid gap-5">
    <div className="grid gap-3 rounded-card border border-stone-200 bg-white p-4 lg:grid-cols-[1fr_.6fr_.6fr]">
      <label className="flex min-h-12 items-center gap-3 rounded-xl bg-cream-100 px-4"><Search className="size-4 text-navy-400" /><span className="sr-only">Buscar inventario</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caja, casillero o cliente" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <Select label="Estado" hideLabel value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: "all", label: "Todos los estados" }, ...BOX_STATUSES.filter((item) => ["recibida", "categorizada", "en-bodega", "excede-categoria"].includes(item)).map((item) => ({ value: item, label: getStatusLabel(item) }))]} />
      <Select label="Categoría" hideLabel value={category} onChange={(event) => setCategory(event.target.value)} options={[{ value: "all", label: "Todas las categorías" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
    </div>
    {canLoad&&<div className="grid min-w-0 gap-4 rounded-card border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-display text-lg font-bold text-navy-950">Cargar al camión</h3><p className="mt-1 text-sm text-navy-500">Selecciona un viaje y registra las cajas sin salir de Bodega.</p></div><span className="rounded-full bg-cream-100 px-3 py-1.5 text-xs font-semibold text-navy-700">{selectedBoxes.length} seleccionadas</span></div>
      {trucks.length ? <>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2"><Select label="Camión de carga" disabled={loading} value={currentTruck?.id ?? ""} onChange={event=>{setTruckId(event.target.value);setDestination("");setFeedback(null);}} options={[{value:"",label:"Selecciona un camión"},...trucks.map(truck=>({value:truck.id,label:`${truck.code} · ${truck.originWarehouseName ?? truck.route} · ${truck.boxIds.length} cargadas`}))]}/><Select label="Almacén de destino" disabled={loading||!stops.length} value={destinationId} onChange={event=>setDestination(event.target.value)} options={[{value:"",label:"Selecciona destino del viaje"},...stops.map(stop=>({value:stop.warehouseId,label:warehouses.find(warehouse=>warehouse.id===stop.warehouseId)?.name??stop.city}))]}/></div>
        <div className="flex flex-wrap gap-3"><Button type="button" loading={loading} disabled={!currentTruck||!selectedBoxes.length||!destinationId} onClick={()=>void loadSelection()}><PackagePlus className="size-4"/>{selectedBoxes.length?`Cargar ${selectedBoxes.length} paquete${selectedBoxes.length===1?"":"s"}`:"Cargar paquetes"}</Button>{currentTruck&&!loading&&<TruckScanner key={currentTruck.id} compact truck={currentTruck} boxes={loadedBoxes} warehouses={warehouses} onLoaded={handleLoaded} returnLabel="Volver a bodega"/>}</div>
        {feedback&&<p role={feedback.ok?"status":"alert"} className={"rounded-xl p-3 text-sm "+(feedback.ok?"bg-emerald-50 text-emerald-900":"bg-red-50 text-red-900")}>{feedback.text}</p>}
        {currentTruck&&currentTruck.boxIds.length>0&&<TruckLoadSummary boxes={loadedBoxes.filter(box=>currentTruck.boxIds.includes(box.id))} maxWeightLb={currentTruck.maxWeightLb}/>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-3"><p className="max-w-xl text-xs leading-5 text-navy-500">Marca las cajas y pulsa Cargar paquetes para agregarlas directamente. Escanear carga es una opción independiente.{currentTruck&&!stops.length&&" Configura primero la ruta del camión."}</p>{currentTruck&&<Link href={`/admin/camiones/${currentTruck.id}#ruta-del-camion`} className="text-sm font-semibold text-orange-600 hover:text-orange-700">Ver ruta del camión →</Link>}</div>
      </> : <p className="text-sm text-navy-500">No hay camiones disponibles para cargar. <Link href="/admin/camiones" className="font-semibold text-orange-600">Crear o configurar un camión →</Link></p>}
    </div>}
    {filtered.length ? <><div className="flex items-center justify-between gap-3 px-1 text-sm"><Checkbox aria-label="Seleccionar todas las cajas disponibles" label="Seleccionar todas las piezas disponibles" disabled={!canLoad} checked={selectable.length>0&&selectable.every(id=>selected.includes(id))} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...selectable])]:current.filter(id=>!selectable.includes(id)))}/><span className="text-xs text-navy-500">{filtered.length} piezas en esta vista</span></div><ReceptionList boxes={filtered} heading={pieces=>{const customer=users.find(u=>u.id===pieces[0].userId);return <p className="mt-1 text-sm text-navy-500">{customer?.firstName} {customer?.paternalLastName} · {customer?.lockerCode}</p>;}} selection={pieces=>{const ids=pieces.filter(b=>b.status==="en-bodega").map(b=>b.id);return <Checkbox aria-label={pieces.length===1?`Seleccionar ${pieces[0].code}`:`Seleccionar recepción ${pieces[0].receptionGroup?.code}`} label="" disabled={!canLoad||!ids.length} checked={ids.length>0&&ids.every(id=>selected.includes(id))} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,...ids])]:current.filter(id=>!ids.includes(id)))}/>;}} pieceLink={box=><Link href={`/admin/cajas/${box.id}`} className="text-sm font-bold text-orange-700">{box.code}</Link>}/></> : <EmptyState title="No hay cajas con estos filtros" description="Ajusta la búsqueda o registra una nueva recepción." action={<Link href="/admin/recepcion" className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white">Ir a recepción</Link>} />}
  </div>;
}
