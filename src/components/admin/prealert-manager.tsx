"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Pencil, PackageCheck, ChevronLeft, ChevronRight } from "lucide-react";
import type { Box, User } from "@/lib/types";
import { CustomerSearch } from "./customer-search";
import { CustomerQuickCreate } from "./customer-quick-create";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useCatalog } from "@/components/ui/catalog-provider";
import { saveAdminPrealert, selectPrealertAtWarehouse } from "@/lib/auth/warehouse-actions";

const normalize=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const lastUpdate=(box:Box)=>box.timeline.at(-1)?.at??"";
const PAGE_SIZE=20;

export function PrealertManager({users,boxes}:{users:User[];boxes:Box[]}){
 const router=useRouter(),catalog=useCatalog().filter(c=>c.active!==false);
 const empty={id:undefined as string|undefined,userId:"",store:"",tracking:"",description:"",declaredValue:"",estimatedCategory:catalog[0]?.id??""};
 const [form,setForm]=useState(empty),[customers,setCustomers]=useState(users);
 const [search,setSearch]=useState(""),[page,setPage]=useState(1),[open,setOpen]=useState(false);
 const [busy,setBusy]=useState(false),[receiving,setReceiving]=useState<string|null>(null);
 const [error,setError]=useState(""),[message,setMessage]=useState(""),[newClientId,setNewClientId]=useState("");
 const [saved,setSaved]=useState<Box|null>(null);
 // Keep the server response visible immediately, without masking a later server revision.
 const records=new Map(boxes.map(box=>[box.id,box]));
 if(saved&&(!records.has(saved.id)||lastUpdate(records.get(saved.id)!)<lastUpdate(saved)))records.set(saved.id,saved);
 const pending=Array.from(records.values()).filter(box=>box.status==="pre-alertada").sort((a,b)=>lastUpdate(b).localeCompare(lastUpdate(a)));
 const owners=new Map(customers.map(user=>[user.id,user]));
 const terms=normalize(search).split(/\s+/).filter(Boolean);
 const filtered=pending.filter(box=>{const user=owners.get(box.userId);const text=normalize(`${box.code} ${box.originTracking??""} ${box.prealertDetails?.store??""} ${box.prealertDetails?.description??""} ${user?.firstName??""} ${user?.paternalLastName??""} ${user?.lockerCode??""} ${user?.email??""}`);return terms.every(term=>text.includes(term));});
 const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),currentPage=Math.min(page,pages);
 const visible=filtered.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
 function create(){setForm({...empty,userId:newClientId});setError("");setOpen(true);}
 function edit(box:Box){setForm({id:box.id,userId:box.userId,store:box.prealertDetails?.store??"",description:box.prealertDetails?.description??"",declaredValue:String(box.prealertDetails?.declaredValue??""),tracking:box.originTracking??"",estimatedCategory:box.categoryId});setError("");setOpen(true);}
 async function receive(box:Box){
   if(receiving)return;setReceiving(box.id);setMessage("");
   try{const result=await selectPrealertAtWarehouse(box.id,box.userId);if(!result.ok){setMessage(result.error);setReceiving(null);router.refresh();return;}router.push(`/admin/recepcion?customer=${box.userId}&prealert=${box.id}`);}
   catch{setMessage("No se pudo abrir la recepción. Intenta nuevamente.");setReceiving(null);}
 }
 return <div className="grid gap-4">
  <div className="flex flex-wrap items-center justify-between gap-4">
   <div><h2 className="font-display text-xl font-bold text-navy-950">Pendientes de recepción <span className="ml-2 rounded-full bg-orange-50 px-3 py-1 text-sm text-orange-700">{pending.length}</span></h2><p className="mt-1 text-sm text-navy-500">Consulta, asigna o recibe las compras anunciadas por tus clientes.</p></div>
   <div className="flex flex-wrap gap-2"><CustomerQuickCreate onCreated={user=>{setCustomers(current=>[...current.filter(item=>item.id!==user.id),user]);setNewClientId(user.id);setMessage(`Cliente ${user.lockerCode} creado. Pulsa Crear prealerta para asignarle su compra.`);}}/><Button type="button" onClick={create}><Plus className="size-4" aria-hidden="true"/>Crear prealerta</Button></div>
  </div>
  {message&&<p role="status" className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">{message}</p>}
  <div className="rounded-2xl border border-stone-200 bg-white p-4"><Input label="Buscar prealertas" placeholder="Código, tracking, cliente, casillero o tienda" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></div>
  <section aria-label="Lista de prealertas pendientes" className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
   <div className="hidden grid-cols-[1.3fr_1fr_1fr_260px] gap-4 border-b border-stone-200 bg-cream-100 px-5 py-3 text-xs font-bold uppercase tracking-wider text-navy-500 xl:grid"><span>Prealerta / tracking</span><span>Cliente</span><span>Contenido</span><span className="min-w-52 text-right">Acciones</span></div>
   {visible.length?<div className="divide-y divide-stone-100">{visible.map(box=>{const owner=owners.get(box.userId);return <article key={box.id} className="grid items-center gap-4 p-5 transition hover:bg-cream-50 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_260px]">
    <div className="min-w-0"><button type="button" className="font-display text-base font-bold text-navy-950 underline-offset-4 hover:text-orange-700 hover:underline" onClick={()=>edit(box)} aria-label={`Editar prealerta ${box.code}`}>{box.code}</button><p className="mt-1 break-all text-sm text-navy-500">{box.originTracking??"Sin tracking"}</p><span className="mt-2 inline-block rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">Por recibir</span></div>
    <div className="min-w-0"><p className="text-sm font-semibold">{owner?`${owner.firstName} ${owner.paternalLastName}`:"Cliente no disponible"}</p><p className="mt-1 text-sm text-navy-500">{owner?.lockerCode??"—"}</p></div>
    <div className="min-w-0"><p className="text-sm font-semibold">{box.prealertDetails?.store??"Tienda no registrada"}</p><p className="mt-1 line-clamp-2 text-sm text-navy-500">{box.prealertDetails?.description??box.categoryName??"Sin descripción"}</p></div>
    <div className="flex flex-wrap gap-2 xl:justify-end"><Button type="button" variant="ghost" className="px-3" onClick={()=>edit(box)} aria-label={`Editar o asignar ${box.code}`}><Pencil className="size-4" aria-hidden="true"/>Editar / asignar</Button><Button type="button" variant="secondary" className="px-3" loading={receiving===box.id} disabled={receiving!==null||!owner?.active} onClick={()=>void receive(box)} aria-label={`Recibir ${box.code} en bodega`}><PackageCheck className="size-4" aria-hidden="true"/>Recibir</Button></div>
   </article>;})}</div>:<div className="grid justify-items-center gap-3 px-5 py-12 text-center"><ClipboardList className="size-9 text-navy-300" aria-hidden="true"/><h3 className="font-display text-lg font-bold">{search?"No hay coincidencias":"No hay prealertas pendientes"}</h3><p className="max-w-md text-sm text-navy-500">{search?"Prueba con otro tracking, cliente o casillero.":"Las compras pendientes aparecerán aquí. Crea una prealerta cuando un cliente anuncie un paquete."}</p>{search?<Button type="button" variant="ghost" onClick={()=>{setSearch("");setPage(1);}}>Limpiar búsqueda</Button>:<Button type="button" variant="secondary" onClick={create}>Crear primera prealerta</Button>}</div>}
   {filtered.length>0&&<footer className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 px-5 py-3"><p className="text-sm text-navy-500">{(currentPage-1)*PAGE_SIZE+1}–{Math.min(currentPage*PAGE_SIZE,filtered.length)} de {filtered.length}</p><div className="flex items-center gap-3"><Button type="button" variant="ghost" className="px-3" aria-label="Página anterior" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft className="size-4"/></Button><span className="text-sm">{currentPage} / {pages}</span><Button type="button" variant="ghost" className="px-3" aria-label="Página siguiente" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}><ChevronRight className="size-4"/></Button></div></footer>}
  </section>
  <Dialog open={open} onClose={()=>{if(!busy)setOpen(false);}} size="large" title={form.id?"Editar o asignar prealerta":"Crear prealerta"} description="Asocia la compra al cliente y registra su tracking. Las medidas reales se confirman al recibirla.">
   <form className="grid max-h-[65vh] gap-4 overflow-y-auto px-1" onSubmit={async event=>{
     event.preventDefault();if(busy)return;if(!form.userId){setError("Selecciona el cliente al que pertenece esta compra.");return;}setBusy(true);setError("");
     try{const result=await saveAdminPrealert(form,form.id);if(!result.ok){setError(result.error);return;}setSaved(result.box);setOpen(false);setSearch("");setPage(1);setMessage(`${result.box.code} guardada. El aviso al cliente quedó en la cola de correos.`);router.refresh();}
     catch{setError("No se pudo guardar. Tus datos se conservan; intenta nuevamente.");}finally{setBusy(false);}
   }}>
    <CustomerSearch users={customers} value={form.userId} onChange={id=>setForm({...form,userId:id})}/>
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Tienda" required minLength={2} value={form.store} onChange={e=>setForm({...form,store:e.target.value})}/><Input label="Tracking de origen" required minLength={5} value={form.tracking} onChange={e=>setForm({...form,tracking:e.target.value})}/><div className="sm:col-span-2"><Input label="Descripción del contenido" required minLength={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div><Input label="Valor declarado (USD)" type="number" step="0.01" min="0.01" required value={form.declaredValue} onChange={e=>setForm({...form,declaredValue:e.target.value})}/><Select label="Categoría estimada" value={form.estimatedCategory} options={[{value:"",label:"Selecciona una categoría"},...catalog.map(c=>({value:c.id,label:c.name}))]} required onChange={e=>setForm({...form,estimatedCategory:e.target.value})}/></div>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-stone-200 bg-white pt-4"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" loading={busy}>{form.id?"Guardar cambios":"Crear prealerta"}</Button></div>
   </form>
  </Dialog>
 </div>;
}
