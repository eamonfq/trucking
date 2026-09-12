"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { editOperation } from "@/lib/auth/edit-actions";
import type { EditableRecord } from "@/lib/types/editing";

const labels={box:"Cajas / prealertas",shipment:"Envíos",invoice:"Facturas",truck:"Camiones",driver:"Choferes",support:"Soporte",payment:"Reportes de pago"};
export function OperationEditor({records}:{records:EditableRecord[]}) {
  const [search,setSearch]=useState("");
  const [selected,setSelected]=useState("");
  const [kind,setKind]=useState("");
  const record=records.find(x=>`${x.kind}/${x.id}`===selected);
  return <section className="mt-7 grid gap-6 rounded-xl border border-line-300 bg-white p-5 sm:p-7">
    <div className="flex items-start gap-3"><PencilLine className="mt-1 size-5 shrink-0 text-brand-700"/><div><h2 className="font-display text-xl font-bold">Editar con trazabilidad</h2><p className="mt-2 text-sm leading-6 text-ink-500">Los cambios conservan el registro anterior, el responsable y el motivo. Las operaciones cerradas admiten aclaraciones, no cambios silenciosos de importes o estados.</p></div></div>
    <div className="grid gap-4 md:grid-cols-2"><Input label="Buscar por código o nombre" value={search} onChange={e=>setSearch(e.target.value)}/><Select label="Tipo de registro" value={kind} onChange={e=>{setKind(e.target.value);setSelected("");}} options={[{value:"",label:"Todos"},...Object.entries(labels).map(([value,label])=>({value,label}))]}/></div>
    <Select label="Registro a corregir" value={selected} onChange={e=>setSelected(e.target.value)} options={[{value:"",label:"Selecciona un registro"},...records.filter(x=>(!kind||kind===x.kind)&&x.label.toLowerCase().includes(search.toLowerCase())).map(x=>({value:`${x.kind}/${x.id}`,label:`${labels[x.kind]} · ${x.label}`}))]}/>
    {!records.length && <p className="rounded-lg bg-cream-100 p-5 text-sm text-ink-700">Aún no hay registros operativos. Aparecerán aquí al trabajar con el sistema.</p>}
    {record && <RecordForm key={`${selected}/${record.expected}`} record={record}/>}
  </section>;
}
function RecordForm({record}:{record:EditableRecord}) {
  const router=useRouter();
  const [values,setValues]=useState(Object.fromEntries(record.fields.map(f=>[f.key,f.value])));
  const [reason,setReason]=useState(""); const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  const [noteOnly,setNoteOnly]=useState(record.locked);
  return <form className="grid gap-5 border-t border-line-200 pt-6" onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage("");try{const result=await editOperation({kind:record.kind,id:record.id,expected:record.expected,reason,values:noteOnly?{}:values});setMessage(result.ok?"Corrección guardada con historial.":result.error);if(result.ok)router.refresh();}catch{setMessage("No pudimos confirmar el guardado. Actualiza antes de reintentar.");}finally{setBusy(false);}}}>
    {record.locked ? <p className="flex gap-3 rounded-lg bg-cream-100 p-4 text-sm leading-6 text-ink-700"><ShieldCheck className="size-5 shrink-0"/>Este registro tiene vínculos, facturación o movimientos que deben conservarse. Puedes agregar una aclaración; usa las acciones operativas para retirar una asignación o rechazar un reporte pendiente.</p> : <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={noteOnly} onChange={e=>setNoteOnly(e.target.checked)}/>Solo agregar una aclaración</label>}
    {!noteOnly && <div className="grid gap-4 sm:grid-cols-2">{record.fields.map(f=>f.type==="checkbox"?<label key={f.key} className="flex min-h-12 items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(values[f.key])} onChange={e=>setValues({...values,[f.key]:e.target.checked})}/>{f.label}</label>:f.type==="select"?<Select key={f.key} label={f.label} value={String(values[f.key])} options={f.options??[]} onChange={e=>setValues({...values,[f.key]:e.target.value})}/>:<Input key={f.key} label={f.label} type={f.type} step={f.type==="number"?"0.01":undefined} min={f.type==="number"?0:undefined} value={String(values[f.key])} onChange={e=>setValues({...values,[f.key]:e.target.value})}/>)}</div>}
    <Input label="Motivo de la corrección (visible en el historial)" required minLength={5} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/>
    <p className="text-xs leading-6 text-ink-500">Cambiar tarifas aquí modifica solo este documento. No cambia el tarifario global. Fotos y comprobantes siguen siendo opcionales.</p>
    {message && <p role="status" className="rounded-lg bg-cream-100 p-4 text-sm">{message}</p>}
    <Button type="submit" loading={busy} className="justify-self-end">Guardar corrección</Button>
  </form>;
}
