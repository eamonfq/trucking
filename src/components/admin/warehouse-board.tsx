"use client";

import Link,{useAdminPermission} from "@/components/admin/admin-access";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PackagePlus } from "lucide-react";
import { CUSTOM_CAPACITY_CATEGORY } from "@/lib/config/custom-cargo";
import { useCatalog } from "@/components/ui/catalog-provider";
import { getStatusLabel } from "@/lib/config/status";
import { BOX_STATUSES, type Box, type Truck, type User, type Warehouse } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { TruckScanner } from "./truck-scanner";
import { Button } from "@/components/ui/button";
import { loadSelectedPackages } from "@/lib/auth/warehouse-actions";
import {groupReceptions} from '@/lib/utils/reception-display';
import {WarehouseInventory} from './warehouse-inventory';
import { TruckLoadSummary } from "./truck-load-summary";
const normalize=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

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
  const [origin,setOrigin]=useState('all');
  const [page,setPage]=useState(1),[pageSize,setPageSize]=useState(20);
  const people=useMemo(()=>new Map(users.map(user=>[user.id,user])),[users]);
  const filtered = useMemo(() => boxes.filter((box) => {
    const customer = people.get(box.userId);
    const term = normalize(search.trim());
    return (!term || normalize(`${box.code} ${box.contentsNote??""} ${box.receptionGroup?.code??""} ${customer?.lockerCode ?? ""} ${customer?.firstName ?? ""} ${customer?.paternalLastName ?? ""} ${customer?.maternalLastName??''} ${customer?.phone??''}`).includes(term)) && (status === "all" || box.status === status) && (category === "all" || box.categoryId === category)&&(origin==='all'||(box.originWarehouseId??'unregistered')===origin);
  }), [boxes, category, search, status, origin, people]);
  const groups=useMemo(()=>groupReceptions(filtered).sort((a,b)=>(b.boxes[0].receivedAt??'').localeCompare(a.boxes[0].receivedAt??'')||b.code.localeCompare(a.code,'es',{numeric:true})),[filtered]);
  const originOptions=[...new Map(boxes.map(box=>[box.originWarehouseId??'unregistered',{value:box.originWarehouseId??'unregistered',label:box.originWarehouseName??'Origen no registrado'}])).values()];
  const selectedBoxes = boxes.filter(box => box.status === "en-bodega" && selected.includes(box.id));
  const currentTruck = trucks.find(truck => truck.id === truckId);
  const stops=currentTruck?.stops??[];
  const destinationId=stops.length===1?stops[0].warehouseId:stops.some(stop=>stop.warehouseId===destination)?destination:"";
  const loadedBoxes = [...initialLoadedBoxes.filter(box => !confirmed.some(loaded => loaded.id === box.id)), ...confirmed];
  function selectPieces(ids:string[],checked:boolean){if(!canLoad||loading)return;setSelected(current=>checked?[...new Set([...current,...ids])]:current.filter(id=>!ids.includes(id)));}
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
    <div className="grid min-w-0 gap-3 rounded-card border border-stone-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_1fr]">
      <label className="flex min-h-12 min-w-0 items-center gap-3 rounded-xl bg-cream-100 px-4"><Search className="size-4 shrink-0 text-navy-400" /><span className="sr-only">Buscar inventario</span><input value={search} onChange={(event) => {setSearch(event.target.value);setPage(1);}} placeholder="Recepción, cliente o contenido" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>
      <Select label="Estado" hideLabel value={status} onChange={(event) => {setStatus(event.target.value);setPage(1);}} options={[{ value: "all", label: "Todos los estados" }, ...BOX_STATUSES.filter((item) => ["recibida", "categorizada", "en-bodega", "excede-categoria"].includes(item)).map((item) => ({ value: item, label: getStatusLabel(item) }))]} />
      <Select label="Categoría" hideLabel value={category} onChange={(event) => {setCategory(event.target.value);setPage(1);}} options={[{ value: "all", label: "Todas las categorías" }, ...categories.map((item) => ({ value: item.id, label: item.name }))]} />
      <Select label="Almacén de origen" hideLabel value={origin} onChange={event=>{setOrigin(event.target.value);setPage(1);}} options={[{value:'all',label:'Todos los orígenes'},...originOptions]}/>
      {(search||status!=='all'||category!=='all'||origin!=='all')&&<div className="flex flex-wrap items-center justify-between gap-2 sm:col-span-2 xl:col-span-4"><p className="text-xs text-navy-500">{groups.length} recepciones coinciden · los filtros no cambian tu selección</p><button type="button" className="min-h-10 rounded-lg px-3 text-xs font-semibold text-orange-700 hover:bg-orange-50" onClick={()=>{setSearch('');setStatus('all');setCategory('all');setOrigin('all');setPage(1);}}>Limpiar filtros</button></div>}
    </div>
    {canLoad&&<div className="grid min-w-0 gap-3 rounded-card border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-bold text-navy-950">Cargar al camión</h3><div className="flex items-center gap-3"><span className="text-xs font-semibold text-navy-700">{selectedBoxes.length} seleccionadas</span>{selectedBoxes.length>0&&<button type="button" disabled={loading} onClick={()=>setSelected([])} className="min-h-9 rounded-lg px-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 disabled:opacity-50">Limpiar selección</button>}</div></div>
      {trucks.length ? <>
        <div className="grid min-w-0 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"><Select label="Camión de carga" disabled={loading} value={currentTruck?.id ?? ""} onChange={event=>{setTruckId(event.target.value);setDestination("");setFeedback(null);}} options={[{value:"",label:"Selecciona un camión"},...trucks.map(truck=>({value:truck.id,label:`${truck.code} · ${truck.originWarehouseName ?? truck.route} · ${truck.boxIds.length} cargadas`}))]}/><Select label="Almacén de destino" disabled={loading||!stops.length} value={destinationId} onChange={event=>setDestination(event.target.value)} options={[{value:"",label:"Selecciona destino del viaje"},...stops.map(stop=>({value:stop.warehouseId,label:warehouses.find(warehouse=>warehouse.id===stop.warehouseId)?.name??stop.city}))]}/><div className="flex flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-1"><Button type="button" loading={loading} disabled={!currentTruck||!selectedBoxes.length||!destinationId} onClick={()=>void loadSelection()}><PackagePlus className="size-4"/>{selectedBoxes.length?`Cargar ${selectedBoxes.length} paquete${selectedBoxes.length===1?"":"s"}`:"Cargar paquetes"}</Button>{currentTruck&&!loading&&<TruckScanner key={currentTruck.id} compact truck={currentTruck} boxes={loadedBoxes} warehouses={warehouses} onLoaded={handleLoaded} returnLabel="Volver a bodega"/>}</div></div>
        {feedback&&<p role={feedback.ok?"status":"alert"} className={"rounded-xl p-3 text-sm "+(feedback.ok?"bg-emerald-50 text-emerald-900":"bg-red-50 text-red-900")}>{feedback.text}</p>}
        {currentTruck&&currentTruck.boxIds.length>0&&<details className="border-t border-stone-100 pt-2"><summary className="cursor-pointer text-xs font-semibold text-navy-500">Ver carga actual · {currentTruck.boxIds.length} piezas en {currentTruck.code}</summary><div className="mt-3"><TruckLoadSummary boxes={loadedBoxes.filter(box=>currentTruck.boxIds.includes(box.id))} maxWeightLb={currentTruck.maxWeightLb}/></div></details>}
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-navy-500">La selección carga directamente. El escáner es independiente.{currentTruck&&!stops.length&&" Configura la ruta para cargar."}</p>{currentTruck&&<Link href={`/admin/camiones/${currentTruck.id}#ruta-del-camion`} className="text-xs font-semibold text-orange-600 hover:text-orange-700">Ver ruta →</Link>}</div>
      </> : <p className="text-sm text-navy-500">No hay camiones disponibles para cargar. <Link href="/admin/camiones" className="font-semibold text-orange-600">Crear o configurar un camión →</Link></p>}
    </div>}
    {filtered.length ? <WarehouseInventory groups={groups} users={users} selectedIds={selectedBoxes.map(box=>box.id)} canSelect={canLoad} busy={loading} page={page} pageSize={pageSize} onPage={setPage} onPageSize={size=>{setPageSize(size);setPage(1);}} onSelection={selectPieces}/> : <EmptyState title="No hay cajas con estos filtros" description="Ajusta la búsqueda o registra una nueva recepción." action={<Link href="/admin/recepcion" className="inline-flex min-h-11 items-center rounded-full bg-orange-500 px-5 text-sm font-bold text-white">Ir a recepción</Link>} />}
  </div>;
}
