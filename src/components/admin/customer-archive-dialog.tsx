"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { previewCustomerArchive,archiveCustomerBoxes } from "@/lib/auth/customer-archive-actions";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Preview=Extract<Awaited<ReturnType<typeof previewCustomerArchive>>,{ok:true}>;
export function CustomerArchiveDialog({box,onClose}:{box:{id:string;code:string}|null;onClose:()=>void}){
 return box?<Fields key={box.id} box={box} onClose={onClose}/>:null;
}
function Fields({box,onClose}:{box:{id:string;code:string};onClose:()=>void}){
 const [scope,setScope]=useState<"piece"|"reception">("reception"),[preview,setPreview]=useState<Preview|null>(null),[reason,setReason]=useState(""),[confirmation,setConfirmation]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const router=useRouter();
 async function review(){
  setBusy(true);setError("");
  try{const result=await previewCustomerArchive({id:box.id,scope});if(result.ok)setPreview(result);else{setPreview(null);setError(result.error);}}
  catch{setError("No se pudo consultar la recepción.");}finally{setBusy(false);}
 }
 async function withdraw(){
  if(busy||!preview||confirmation!=="RETIRAR"||reason.trim().length<5)return;
  setBusy(true);setError("");
  try{
   const result=await archiveCustomerBoxes({id:box.id,scope,revision:preview.revision,reason,confirmation});
   if(!result.ok){setError(result.error);setPreview(null);return;}
   onClose();router.refresh();
  }catch{setError("No se confirmó el retiro. Actualiza antes de reintentar.");setPreview(null);}
  finally{setBusy(false);}
 }
 return <Dialog open onClose={()=>{if(!busy)onClose();}} title="Retirar caja o recepción" description={box.code} footer={
  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
   <Button variant="ghost" disabled={busy} onClick={onClose}>Cancelar</Button>
   {preview&&<Button variant="destructive" loading={busy} disabled={confirmation!=="RETIRAR"||reason.trim().length<5} onClick={withdraw}>Retirar del inventario</Button>}
  </div>
 }>
  <div className="grid gap-4 pb-1">
   <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-900">Se retiran del inventario y del panel del cliente, con opción de restaurar desde este expediente. Las facturas, pagos y fotos se conservan: no se anulan cobros ni se devuelven importes.</p>
   <Select label="Qué deseas retirar" disabled={busy} value={scope} options={[{value:"reception",label:"Recepción completa · todas las cajas"},{value:"piece",label:"Solo esta caja"}]} onChange={e=>{setScope(e.target.value as typeof scope);setPreview(null);setError("");setConfirmation("");}}/>
   <Button loading={busy} variant="secondary" onClick={review}>Revisar impacto</Button>
   {preview&&<>
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
     <strong>{preview.reference}</strong><p className="mt-2 text-sm">{preview.count} caja(s) se retirarán.</p>
     <p className="mt-1 text-xs text-navy-500">{preview.invoicesKept} factura(s) se conservan, {preview.paidInvoicesKept} pagada(s). Si el retiro requiere ajustes de facturación, revísalos por separado en Facturas.</p>
    </div>
    <Input label="Motivo del retiro" disabled={busy} placeholder="Ej. cancelación del cliente, corrección o error de registro" minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/>
    <Input label="Escribe RETIRAR para confirmar" disabled={busy} autoComplete="off" value={confirmation} onChange={e=>setConfirmation(e.target.value)}/>
   </>}
   {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>
 </Dialog>;
}
