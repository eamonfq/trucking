"use client";
import { WAREHOUSE_KINDS, WAREHOUSE_KIND_LABELS, type WarehouseKind } from "@/lib/config/warehouses";
import { Dialog } from "@/components/ui/dialog";
import { LocationDirectory } from "./location-directory";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveWarehouse, saveWarehouseOperator, getWarehouseAdministration } from "@/lib/auth/warehouse-actions";

type Data=Awaited<ReturnType<typeof getWarehouseAdministration>>;
export function WarehouseSettings({data}:{data:Data}) {
  const router=useRouter();
  const blank={id:undefined as string|undefined,name:"",address:"",kind:"origen" as WarehouseKind,country:"Estados Unidos",state:"",city:"",active:true,arrivalMessage:"Tu paquete {codigo} fue recibido en {almacen}, {destino}. Nuestro equipo puede ayudarte a coordinar su retiro."};
  const empty={id:undefined as string|undefined,firstName:"",paternalLastName:"",email:"",phone:"",active:true,grants:[] as NonNullable<Data["operators"][number]["warehouseGrants"]>};
  const [warehouse,setWarehouse]=useState(blank),[operator,setOperator]=useState(empty),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const [editor,setEditor]=useState<"warehouse"|"operator"|null>(null),[grantSearch,setGrantSearch]=useState(""),[onlyAssigned,setOnlyAssigned]=useState(false),[grantPage,setGrantPage]=useState(1);
  const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const grantsFound=data.warehouses.filter(w=>normalize([w.name,w.city,w.country,w.kind].join(" ")).includes(normalize(grantSearch))&&(!onlyAssigned||operator.grants.some(g=>g.warehouseId===w.id))).sort((a,b)=>a.name.localeCompare(b.name,"es"));
  const grantPages=Math.max(1,Math.ceil(grantsFound.length/10)),currentGrantPage=Math.min(grantPage,grantPages);
  function editWarehouse(id?:string){const w=data.warehouses.find(w=>w.id===id);setWarehouse(w?{...w,kind:w.kind??"destino",country:w.country??"",state:w.state??"",address:w.address??""}:blank);setMessage("");setEditor("warehouse");}
  function editOperator(id?:string){const o=data.operators.find(o=>o.id===id);setOperator(o?{...o,grants:o.warehouseGrants??[]}:empty);setGrantSearch("");setOnlyAssigned(false);setGrantPage(1);setMessage("");setEditor("operator");}
  async function save(kind:"warehouse"|"operator") {
    setBusy(true);setMessage("");
    try { const result=await (kind==="warehouse"?saveWarehouse(warehouse):saveWarehouseOperator(operator));
      if(!result.ok){setMessage(result.error);return;}
      setMessage(kind==="warehouse"?"Almacén guardado.":operator.id?"Permisos guardados. El operador deberá volver a iniciar sesión.":"Operador creado. Invitación preparada en la cola de correos.");
      if(kind==="warehouse")setWarehouse(blank);else setOperator(empty);setEditor(null);router.refresh();
    } catch {setMessage("No se pudo guardar. Tus datos se conservan; intenta nuevamente.");} finally {setBusy(false);}
  }
  return <div className="grid gap-6">
    <p role="status" aria-live="polite" className="text-sm font-semibold">{message}</p>
    <LocationDirectory title="Ubicaciones operativas" description="Busca tus almacenes de origen y destino. Abre un registro únicamente cuando necesites editarlo." locations rows={data.warehouses.map(w=>({id:w.id,title:w.name,detail:[w.city,w.country,w.address].filter(Boolean).join(" · "),search:[w.name,w.city,w.state,w.country,w.address].join(" "),kind:w.kind??"destino",active:w.active,extra:<p className="mt-2 text-xs text-navy-500">{data.operators.filter(o=>o.warehouseGrants?.some(g=>g.warehouseId===w.id)).length} operadores asignados</p>}))} onEdit={editWarehouse} onCreate={()=>editWarehouse()} createLabel="Crear almacén"/>
    <LocationDirectory title="Accesos de almacén" description="Permisos por ubicación, sin acceso a facturas ni cobros." rows={data.operators.map(o=>{const names=data.warehouses.filter(w=>o.warehouseGrants?.some(g=>g.warehouseId===w.id)).map(w=>w.name);return {id:o.id,title:o.firstName+" "+o.paternalLastName,detail:o.email+" · "+names.length+" almacenes asignados",search:[o.firstName,o.paternalLastName,o.email,...names].join(" "),active:o.active};})} onEdit={editOperator} onCreate={()=>editOperator()} createLabel="Crear operador"/>
    <Dialog open={editor==="warehouse"} onClose={()=>{if(!busy)setEditor(null);}} title={warehouse.id?"Editar almacén":"Crear almacén"} size="large"><div className="max-h-[70dvh] overflow-y-auto px-1"><p role="status" className="mb-3 text-sm text-orange-700">{message}</p>
      <form onSubmit={e=>{e.preventDefault();void save("warehouse");}} className="grid gap-4 md:grid-cols-2">
        <Select label="Función del almacén" value={warehouse.kind} options={WAREHOUSE_KINDS.map(kind=>({value:kind,label:WAREHOUSE_KIND_LABELS[kind]}))} onChange={e=>setWarehouse({...warehouse,kind:e.target.value as WarehouseKind})}/><Input label="País" required placeholder="Ej. Estados Unidos o México" value={warehouse.country} onChange={e=>setWarehouse({...warehouse,country:e.target.value})}/><Input label="Estado / provincia" required placeholder="Ej. Illinois, Texas o Jalisco" value={warehouse.state} onChange={e=>setWarehouse({...warehouse,state:e.target.value})}/><Input label="Nombre del almacén" required value={warehouse.name} onChange={e=>setWarehouse({...warehouse,name:e.target.value})}/>
        <Input label="Dirección completa" maxLength={300} value={warehouse.address} onChange={e=>setWarehouse({...warehouse,address:e.target.value})}/><Input label="Ciudad" required placeholder="Ej. Arlington Heights, El Paso o Valle de Juárez" value={warehouse.city} onChange={e=>setWarehouse({...warehouse,city:e.target.value})}/>
        <div className="md:col-span-2"><Textarea label="Mensaje de recepción / llegada" required value={warehouse.arrivalMessage} onChange={e=>setWarehouse({...warehouse,arrivalMessage:e.target.value})}/><p className="mt-2 text-xs text-navy-500">Variables disponibles: {"{codigo}, {almacen}, {destino}"}.</p></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={warehouse.active} onChange={e=>setWarehouse({...warehouse,active:e.target.checked})}/>Almacén activo</label>
        <div className="flex gap-2"><Button type="submit" loading={busy}>{warehouse.id?"Guardar cambios":"Crear almacén"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={()=>setEditor(null)}>Cancelar</Button></div>
      </form>
    </div></Dialog>
    <Dialog open={editor==="operator"} onClose={()=>{if(!busy)setEditor(null);}} title={operator.id?"Editar operador":"Crear operador"} description="Solo recepción y contactos. Sin acceso a información financiera." size="large"><div className="max-h-[70dvh] overflow-y-auto px-1"><p role="status" className="mb-3 text-sm text-orange-700">{message}</p>
      <form onSubmit={e=>{e.preventDefault();void save("operator");}} className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre" required value={operator.firstName} onChange={e=>setOperator({...operator,firstName:e.target.value})}/>
        <Input label="Apellido" required value={operator.paternalLastName} onChange={e=>setOperator({...operator,paternalLastName:e.target.value})}/>
        <Input label="Correo de acceso" type="email" required readOnly={!!operator.id} value={operator.email} onChange={e=>setOperator({...operator,email:e.target.value})}/>
        <Input label="Teléfono (opcional)" type="tel" value={operator.phone} onChange={e=>setOperator({...operator,phone:e.target.value})}/>
        <fieldset className="grid gap-3 md:col-span-2"><legend className="mb-3 text-sm font-bold">Permisos por almacén</legend>{!data.warehouses.length&&<p className="text-sm">Crea primero un almacén.</p>}<Input label="Buscar almacén para asignar permisos" placeholder="Nombre, ciudad, país o tipo" value={grantSearch} onChange={e=>{setGrantSearch(e.target.value);setGrantPage(1);}}/><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyAssigned} onChange={e=>{setOnlyAssigned(e.target.checked);setGrantPage(1);}}/>Solo asignados ({operator.grants.length})</label>{!grantsFound.length&&<p className="text-sm">No hay almacenes que coincidan con estos filtros.</p>}{grantsFound.slice((currentGrantPage-1)*10,currentGrantPage*10).map(w=>{const grant=operator.grants.find(g=>g.warehouseId===w.id);return <div role="group" aria-label={w.name} key={w.id} className="flex flex-wrap items-center gap-5 rounded-xl bg-stone-50 p-4"><span className="mr-auto font-semibold">{w.name} · {w.kind??"destino"}{!w.active?" · Inactivo":""}<span className="block text-xs font-normal text-navy-500">{w.city}</span></span>{(["receive","viewContacts"] as const).map(permission=><label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={grant?.[permission]??false} onChange={e=>{const next={warehouseId:w.id,receive:grant?.receive??false,viewContacts:grant?.viewContacts??false,[permission]:e.target.checked};setOperator({...operator,grants:[...operator.grants.filter(g=>g.warehouseId!==w.id),next].filter(g=>g.receive||g.viewContacts)});}}/>{permission==="receive"?"Recibir / descargar":"Ver contacto del cliente"}</label>)}</div>;})}<div className="flex items-center justify-between gap-3 text-sm"><Button type="button" variant="secondary" disabled={currentGrantPage===1} onClick={()=>setGrantPage(currentGrantPage-1)}>Anterior</Button><span>{grantsFound.length} almacenes · {currentGrantPage} / {grantPages}</span><Button type="button" variant="secondary" disabled={currentGrantPage===grantPages} onClick={()=>setGrantPage(currentGrantPage+1)}>Siguiente</Button></div></fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={operator.active} onChange={e=>setOperator({...operator,active:e.target.checked})}/>Cuenta activa</label>
        <div className="flex gap-2"><Button type="submit" loading={busy}>{operator.id?"Guardar permisos":"Crear e invitar"}</Button><Button type="button" variant="secondary" disabled={busy} onClick={()=>setEditor(null)}>Cancelar</Button></div>
      </form>
    </div></Dialog>
  </div>;
}
