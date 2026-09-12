"use client";
import { Banknote, CreditCard, MapPin } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { formatUsd } from "@/lib/utils/format";
export type PaymentChoice = { method: "efectivo" | "destino" | "tarjeta" | "transferencia" | "deposito"; warehouseId?:string; amount: string; reference: string };
export function PaymentCapture({value,onChange,total,allowDestination=true,locations=[]}:{value:PaymentChoice;onChange:(value:PaymentChoice)=>void;total:number;allowDestination?:boolean;locations?:{id:string;name:string}[]}){
 const options=[{value:"efectivo" as const,label:"Efectivo",icon:Banknote},...(allowDestination?[{value:"destino" as const,label:"En destino",icon:MapPin}]:[]),{value:"tarjeta" as const,label:"Tarjeta",icon:CreditCard},{value:"transferencia" as const,label:"Transferencia",icon:Banknote},{value:"deposito" as const,label:"Depósito",icon:Banknote}];
 return <fieldset className="grid min-w-0 gap-3">
  <legend className="mb-2 text-sm font-semibold text-ink-700">Selecciona la forma de pago</legend>
  <div className={`grid gap-2 ${"grid-cols-2 sm:grid-cols-3"}`}>{options.map(option=><label key={option.value} className={`relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center text-sm font-semibold transition focus-within:ring-2 focus-within:ring-orange-500 ${value.method===option.value?"border-orange-500 bg-orange-50 text-orange-800":"border-stone-200 bg-white text-navy-600 hover:border-navy-400"}`}><input className="sr-only" type="radio" name="collectionMethod" value={option.value} checked={value.method===option.value} onChange={()=>onChange({...value,method:option.value,amount:"",reference:""})}/><option.icon className="size-5" aria-hidden="true"/>{option.label}</label>)}</div>
  <div className="flex items-center justify-between gap-3 border-y border-stone-200 py-3"><span className="text-sm text-navy-500">Total a cubrir</span><strong className="font-display text-2xl text-navy-950">{total>0?formatUsd(total):"Por calcular"}</strong></div>
  {["tarjeta","transferencia","deposito"].includes(value.method)&&<Input name="cardAmount" label="Monto pagado (USD)" required type="number" min="0.01" step="0.01" inputMode="decimal" value={value.amount} onChange={e=>onChange({...value,amount:e.target.value})} hint="Importe recibido; debe coincidir con el total. No se realiza un cargo bancario desde aquí."/>}
  <Select label="Ubicación del registro" required value={value.warehouseId??(locations.length===1?locations[0].id:"")} onChange={e=>onChange({...value,warehouseId:e.target.value})} options={[{value:"",label:"Selecciona almacén"},...locations.map(w=>({value:w.id,label:w.name}))]}/>
  {["tarjeta","transferencia","deposito"].includes(value.method)&&<Input name="paymentReference" label="Referencia externa / transacción (opcional)" maxLength={160} placeholder="Ej. autorización o referencia bancaria" value={value.reference} onChange={e=>onChange({...value,reference:e.target.value})} hint="No incluyas datos completos de tarjeta. El folio interno se genera automáticamente."/>}
  <p className={`rounded-xl p-3 text-sm leading-5 ${value.method==="destino"?"bg-amber-50 text-amber-900":"bg-emerald-50 text-emerald-900"}`}>{value.method==="destino"?"Pendiente de pago en destino. Se generará un folio de acuerdo; no registra dinero recibido.":"Al guardar confirmas que recibiste el total. Se generará un folio de pago único y quedará registrado en la factura."}</p>
 </fieldset>;
}
