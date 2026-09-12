"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { saveWarehouse, saveWarehouseOperator, getWarehouseAdministration } from "@/lib/auth/warehouse-actions";

type Data=Awaited<ReturnType<typeof getWarehouseAdministration>>;
export function WarehouseSettings({data,cities}:{data:Data;cities:string[]}) {
  const router=useRouter();
  const blank={id:undefined as string|undefined,name:"",address:"",city:cities[0]??"",active:true,arrivalMessage:"Tu paquete {codigo} fue recibido en {almacen}, {destino}. Nuestro equipo puede ayudarte a coordinar su retiro."};
  const empty={id:undefined as string|undefined,firstName:"",paternalLastName:"",email:"",phone:"",active:true,grants:[] as NonNullable<Data["operators"][number]["warehouseGrants"]>};
  const [warehouse,setWarehouse]=useState(blank),[operator,setOperator]=useState(empty),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  async function save(kind:"warehouse"|"operator") {
    setBusy(true);setMessage("");
    try { const result=await (kind==="warehouse"?saveWarehouse(warehouse):saveWarehouseOperator(operator));
      if(!result.ok){setMessage(result.error);return;}
      setMessage(kind==="warehouse"?"Almacén guardado.":operator.id?"Permisos guardados. El operador deberá volver a iniciar sesión.":"Operador creado. Invitación preparada en la cola de correos.");
      if(kind==="warehouse")setWarehouse(blank);else setOperator(empty);router.refresh();
    } catch {setMessage("No se pudo guardar. Tus datos se conservan; intenta nuevamente.");} finally {setBusy(false);}
  }
  return <div className="grid gap-6">
    <p role="status" aria-live="polite" className="text-sm font-semibold">{message}</p>
    <section className="rounded-3xl border border-stone-200 bg-white p-6"><h2 className="font-display text-xl font-bold">Ubicaciones operativas</h2><p className="mt-2 text-sm text-navy-500">Cada almacén tiene su ciudad y su propio mensaje de recepción. Las ciudades se administran en Configuración.</p>
      <div className="my-5 flex flex-wrap gap-2">{data.warehouses.map(w=><Button key={w.id} variant="secondary" onClick={()=>setWarehouse({...w,address:w.address??""})}>{w.name}{!w.active?" · Inactivo":""}</Button>)}</div>
      <form onSubmit={e=>{e.preventDefault();void save("warehouse");}} className="grid gap-4 md:grid-cols-2">
        <Input label="Nombre del almacén" required value={warehouse.name} onChange={e=>setWarehouse({...warehouse,name:e.target.value})}/>
        <Input label="Dirección completa" maxLength={300} value={warehouse.address} onChange={e=>setWarehouse({...warehouse,address:e.target.value})}/><Select label="Ciudad" value={warehouse.city} options={[...new Set([...cities,warehouse.city])].filter(Boolean).map(c=>({value:c,label:c}))} onChange={e=>setWarehouse({...warehouse,city:e.target.value})}/>
        <div className="md:col-span-2"><Textarea label="Mensaje al recibir el paquete" required value={warehouse.arrivalMessage} onChange={e=>setWarehouse({...warehouse,arrivalMessage:e.target.value})}/><p className="mt-2 text-xs text-navy-500">Variables disponibles: {"{codigo}, {almacen}, {destino}"}.</p></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={warehouse.active} onChange={e=>setWarehouse({...warehouse,active:e.target.checked})}/>Almacén activo</label>
        <div className="flex gap-2"><Button type="submit" loading={busy}>{warehouse.id?"Guardar cambios":"Crear almacén"}</Button><Button type="button" variant="ghost" onClick={()=>setWarehouse(blank)}>Nuevo</Button></div>
      </form>
    </section>
    <section className="rounded-3xl bg-navy-950 p-6 text-white"><h2 className="font-display text-xl font-bold">Accesos de almacén</h2><p className="mt-2 text-sm text-white/65">Solo paquetes y recepción. Este rol nunca puede consultar facturas, importes ni registrar cobros.</p>
      <div className="my-5 flex flex-wrap gap-2">{data.operators.map(o=><button key={o.id} className="rounded-xl border border-white/20 px-3 py-2 text-sm" onClick={()=>setOperator({...o,grants:o.warehouseGrants??[]})}>{o.firstName} {o.paternalLastName}{!o.active?" · Inactivo":""}</button>)}</div>
      <form onSubmit={e=>{e.preventDefault();void save("operator");}} className="grid gap-4 md:grid-cols-2">
        <Input tone="dark" label="Nombre" required value={operator.firstName} onChange={e=>setOperator({...operator,firstName:e.target.value})}/>
        <Input tone="dark" label="Apellido" required value={operator.paternalLastName} onChange={e=>setOperator({...operator,paternalLastName:e.target.value})}/>
        <Input tone="dark" label="Correo de acceso" type="email" required readOnly={!!operator.id} value={operator.email} onChange={e=>setOperator({...operator,email:e.target.value})}/>
        <Input tone="dark" label="Teléfono (opcional)" type="tel" value={operator.phone} onChange={e=>setOperator({...operator,phone:e.target.value})}/>
        <fieldset className="grid gap-3 md:col-span-2"><legend className="mb-3 text-sm font-bold">Permisos por almacén</legend>{!data.warehouses.length&&<p className="text-sm">Crea primero un almacén.</p>}{data.warehouses.map(w=>{const grant=operator.grants.find(g=>g.warehouseId===w.id);return <div key={w.id} className="flex flex-wrap items-center gap-5 rounded-xl bg-white/5 p-4"><span className="mr-auto font-semibold">{w.name} · {w.city}</span>{(["receive","viewContacts"] as const).map(permission=><label key={permission} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={grant?.[permission]??false} onChange={e=>{const next={warehouseId:w.id,receive:grant?.receive??false,viewContacts:grant?.viewContacts??false,[permission]:e.target.checked};setOperator({...operator,grants:[...operator.grants.filter(g=>g.warehouseId!==w.id),next].filter(g=>g.receive||g.viewContacts)});}}/>{permission==="receive"?"Recibir / descargar":"Ver contacto del cliente"}</label>)}</div>;})}</fieldset>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={operator.active} onChange={e=>setOperator({...operator,active:e.target.checked})}/>Cuenta activa</label>
        <div className="flex gap-2"><Button type="submit" loading={busy}>{operator.id?"Guardar permisos":"Crear e invitar"}</Button><Button type="button" variant="secondary" onClick={()=>setOperator(empty)}>Nuevo operador</Button></div>
      </form>
    </section>
  </div>;
}
