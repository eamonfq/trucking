"use client";

import { calculateBilling, DEFAULT_WEIGHT_PRICING, type WeightPricing } from "@/lib/utils/billing";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./reception-pos.module.css";
import { PackageCheck, Plus, Printer, CheckCircle2, ArrowRight } from "lucide-react";
import { z } from "zod";
import { PackageQuantity, PackageMeasurements } from "./package-batch-controls";
import { ReceptionRecipient } from "./reception-recipient";
import { receivePackageGroup } from "@/lib/auth/file-actions";
import { selectPrealertAtWarehouse } from "@/lib/auth/warehouse-actions";
import Link from "next/link";
import { PaymentCapture, type PaymentChoice } from "@/components/admin/payment-capture";
import { CustomerSearch } from "@/components/admin/customer-search";
import { CustomerQuickCreate } from "@/components/admin/customer-quick-create";
import { PhotoField } from "@/components/admin/photo-field";
import type { BoxCategory } from "@/lib/config/box-categories";
import { ReceptionPrealertPicker } from "./reception-prealert-picker";
import { receptionSchema } from "@/lib/schemas/admin";
import { formatUsd } from "@/lib/utils/format";
import { suggestCategory } from "@/lib/utils/suggest-category";
import type { Box, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

import {resolveReceptionPieces} from "@/lib/utils/reception-pieces";

type ReceptionInput = z.input<typeof receptionSchema>;

export function ReceptionForm({ users, prealerts = [], excessPolicy, excessFeeUsd = 0, rates, defaultCustomerId, defaultPrealertId, weightPricing = DEFAULT_WEIGHT_PRICING, locations=[], origins=[] }: { origins?:{id:string;name:string}[]; locations?:{id:string;name:string}[]; weightPricing?: WeightPricing; users: User[]; prealerts?: Box[]; excessPolicy: string; excessFeeUsd?: number; rates: BoxCategory[]; defaultCustomerId?: string; defaultPrealertId?: string }) {
  const [quantity,setQuantity]=useState(1),[shared,setShared]=useState({dimensions:true,weight:false,price:false}),[pieces,setPieces]=useState<Array<{length:number;width:number;height:number;weightLb:number;customPriceUsd:number}>>([]);
  const [piecePage,setPiecePage]=useState(0);
  const [receivedIds, setReceivedIds] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentChoice>({method:"destino",amount:"",reference:""});
  const [selectingPrealert,setSelectingPrealert]=useState(false);
  const [lastReceived, setLastReceived] = useState<{id:string;code:string;count:number;total:number;rejected:boolean} | null>(null);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [customers, setCustomers] = useState(users);
  const { showToast } = useToast();
  const { register, handleSubmit, control, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<ReceptionInput, unknown, z.output<typeof receptionSchema>>({ resolver: zodResolver(receptionSchema), defaultValues: { originWarehouseId:origins.length===1?origins[0].id:"", billingMode:"peso-real", customer: defaultCustomerId ?? "", prealertId: defaultPrealertId ?? "", reject: false, overrideCategory: "", overrideReason: "", rejectionReason: "" } });
  const values = useWatch({ control });
  const dims = { length: Number(values.length) || 0, width: Number(values.width) || 0, height: Number(values.height) || 0 };
  const hasMeasurements = Boolean(dims.length && dims.width && dims.height && Number(values.weightLb));
  const suggestion = hasMeasurements ? suggestCategory(dims, Number(values.weightLb), rates) : null;
  const prealert = prealerts.find(item => item.id === values.prealertId);
  const mode=values.billingMode??"peso-real";
  const surcharge = mode==="fijo" && !values.reject && excessPolicy === "recargo" && prealert && hasMeasurements && !suggestCategory(dims, Number(values.weightLb), rates.filter(rate => rate.id === prealert.categoryId)).category ? excessFeeUsd : 0;
  const customPrice=Number(values.customPriceUsd)||0;
  const isExceeded = mode==="manual";
  let billing: ReturnType<typeof calculateBilling> | undefined;
  try { billing=calculateBilling(mode,dims,Number(values.weightLb)||0,weightPricing,mode==="manual"?customPrice:rates.find(rate=>rate.id===values.overrideCategory)?.priceUsd??suggestion?.category?.priceUsd??0); } catch {}
  const resolvedPieces=resolveReceptionPieces({...dims,weightLb:Number(values.weightLb)||0,customPriceUsd:customPrice},pieces.slice(0,quantity-1),shared).map(p=>mode==="volumen"?p:{...p,length:0,width:0,height:0});
  const piecePrices=resolvedPieces.map(p=>{try{const category=suggestCategory(p,p.weightLb,rates).category;return calculateBilling(mode,{length:p.length,width:p.width,height:p.height},p.weightLb,weightPricing,mode==="manual"?p.customPriceUsd:category?.priceUsd??0).amountUsd;}catch{return 0;}});
  const total=Math.round(((billing?.amountUsd??0)+surcharge+piecePrices.reduce((a,b)=>a+b,0))*100)/100;
  const pricedCount=(billing?1:0)+piecePrices.filter(price=>price>0).length;

  if(lastReceived)return <section className="mx-auto grid max-w-3xl gap-6 rounded-2xl border border-stone-200 bg-white p-6 sm:p-8"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-full bg-stone-100 text-navy-700"><CheckCircle2 className="size-6"/></span><div><p className="text-xs font-semibold uppercase tracking-wider text-navy-400">Recepción {lastReceived.code}</p><h2 className="mt-1 font-display text-2xl font-bold">{lastReceived.count} {lastReceived.count===1?"paquete registrado":"paquetes registrados"}</h2><p className="mt-2 text-sm text-navy-500">{lastReceived.rejected?"El rechazo quedó en el historial.":"Recepción confirmada. Total: "+formatUsd(lastReceived.total)+". Imprime las etiquetas antes de mover la carga."}</p></div></div><div className="flex flex-wrap gap-3"><Button type="button" onClick={()=>{setLastReceived(null);}}><Plus className="size-4"/>Registrar otro paquete</Button>{!lastReceived.rejected&&<Link target="_blank" href={`/etiquetas/${lastReceived.id}?grupo=1`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border-[1.5px] border-navy-900 px-5.5 text-sm font-semibold text-navy-900 transition hover:bg-navy-900 hover:text-white"><Printer className="size-4"/>Imprimir {lastReceived.count===1?"etiqueta":"etiquetas"}</Link>}{!lastReceived.rejected&&<Link target="_blank" href={`/api/recepciones/${lastReceived.id}/recibo`} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-stone-300 px-5 text-sm font-semibold"><Printer className="size-4"/>Recibo térmico · 80 mm</Link>}</div><p className="text-xs text-navy-500">«Registrar otro paquete» conserva el cliente y el destino, pero limpia medidas, peso, foto y pago.</p><div className="flex flex-wrap items-center gap-4 border-t border-stone-100 pt-4"><Button type="button" variant="ghost" onClick={()=>{const warehouse=getValues("originWarehouseId");reset({customer:"",recipientId:"",originWarehouseId:warehouse,billingMode:"peso-real",length:"",width:"",height:"",weightLb:"",prealertId:"",reject:false,overrideCategory:"",overrideReason:"",rejectionReason:""});setLastReceived(null);}}>Recepción para otro cliente</Button><Link href="/admin/bodega" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600">Ver bodega<ArrowRight className="size-3.5"/></Link><Link href="/admin/facturas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-600">Ver facturas<ArrowRight className="size-3.5"/></Link></div></section>;
  return <form onSubmit={handleSubmit(async (data) => {
    if(photoBusy)return;
    if(quantity>1){const invalid=resolvedPieces.findIndex(p=>!receptionSchema.safeParse({...data,...p,customPriceUsd:mode==="manual"?p.customPriceUsd:undefined}).success);if(invalid>=0){setPiecePage(Math.floor(invalid/5));showToast({title:"Revisa el paquete "+(invalid+2),description:"Completa el peso real y las medidas o cotización según el método de cobro.",variant:"error"});return;}}
    const upload = new FormData(); if (photo) upload.set("file",photo);
    let result;
    try { const base={...data,customPriceUsd:isExceeded&&!data.reject?data.customPriceUsd:undefined};const batch=Array.from({length:quantity},(_,i)=>i===0?base:{...base,...resolvedPieces[i-1],customPriceUsd:mode==="manual"?resolvedPieces[i-1]?.customPriceUsd:undefined,overrideCategory:"",overrideReason:"",prealertId:""});result = await receivePackageGroup(batch, upload, data.reject ? undefined : {method:payment.method, warehouseId:payment.warehouseId, reference:payment.reference, ...(["tarjeta","transferencia","deposito"].includes(payment.method) ? {amount:payment.amount} : {})}); }
    catch { return showToast({title:"No se confirmó la recepción",description:"Revisa la conexión y actualiza la bodega antes de reintentar para evitar duplicados.",variant:"error"}); }
    if (!result.ok) return showToast({ title: "No se pudo registrar la recepción", description: result.error, variant: "error" });
    const first=result.results[0];
    showToast({ title: first.box.status === "rechazada" ? "Rechazo registrado" : "Caja enviada a bodega", description: `${result.results.length} paquete(s) registrado(s). Total: ${formatUsd(result.total)}.` });
    setReceivedIds(current => [...current, ...result.results.map(r=>r.box.id)]);setQuantity(1);setPieces([]);setPiecePage(0);setShared({dimensions:true,weight:false,price:false});
    reset({recipientId:data.recipientId,originWarehouseId:data.originWarehouseId, length:"",width:"",height:"",weightLb:"",customPriceUsd:undefined,billingMode:mode, customer: data.customer, prealertId: "", reject: false, overrideCategory: "", overrideReason: "", rejectionReason: "" });
    setPhoto(null); setPayment({method:"destino",amount:"",reference:"",warehouseId:payment.warehouseId}); setLastReceived({id:first.box.id,code:first.box.receptionGroup?.code??first.box.code,count:result.results.length,total:result.total,rejected:first.box.status==="rechazada"});
  })} className={`${styles.pos} grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]`}>
    <div className="grid min-w-0 gap-4">
      <section className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <Select label="Almacén de origen · recepción" required value={values.originWarehouseId??""} options={[{value:"",label:"Selecciona dónde recibes el paquete"},...origins.map(w=>({value:w.id,label:w.name}))]} onChange={e=>{setValue("originWarehouseId",e.target.value);setPayment(p=>({...p,warehouseId:e.target.value}));}}/>{!origins.length&&<p className="text-sm text-orange-700">Configura primero un almacén de origen activo en Administración → Almacenes.</p>}<div className="flex items-start justify-between gap-3"><StepHeading number="01" title="Cliente y prealerta" description="Cliente y contacto de entrega."/><CustomerQuickCreate compact onCreated={user=>{setCustomers(current=>[...current.filter(item=>item.id!==user.id),user]);setValue("prealertId","");setValue("customer",user.id,{shouldValidate:true});setValue("recipientId","");}}/></div>
        <div className="min-w-0">
          <CustomerSearch users={customers} value={values.customer} error={errors.customer?.message} onChange={id=>{setValue("customer",id,{shouldValidate:true});setValue("prealertId","");setValue("recipientId","");}}/>
        </div>
        {values.customer&&<ReceptionRecipient key={`recipient:${values.customer}`} userId={values.customer} value={values.recipientId??""} onChange={id=>setValue("recipientId",id)}/>}
        <ReceptionPrealertPicker key={`prealert:${values.customer??""}`} items={prealerts.filter(box=>box.status==="pre-alertada"&&box.userId===values.customer&&!receivedIds.includes(box.id))} value={values.prealertId??""} disabled={!values.customer} busy={selectingPrealert} onChange={async id=>{
          if(!id){setValue("prealertId","");return;}
          const customerId=values.customer;if(!customerId)return;
          setSelectingPrealert(true);
          try{const result=await selectPrealertAtWarehouse(id,customerId);if(!result.ok){showToast({title:"No se pudo vincular",description:result.error,variant:"error"});return;}if(getValues("customer")===customerId)setValue("prealertId",id);}
          catch{showToast({title:"No se pudo vincular la prealerta",description:"Vuelve a seleccionarla para reintentar.",variant:"error"});}
          finally{setSelectingPrealert(false);}
        }}/>
      </section>
      <section className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <StepHeading number="02" title="Paquetes y cobro" description="Selecciona cómo se cobrará esta recepción."/>
        <Select label="Método de cobro" options={[{value:"peso-real",label:"Peso · solo libras reales"},{value:"volumen",label:"Volumen · según las medidas"},{value:"manual",label:"Carga especial · cotización manual"}]} {...register("billingMode")}/>
        <div className="py-2"><PackageQuantity value={quantity} onChange={n=>{setQuantity(n);setPieces(current=>Array.from({length:n-1},(_,i)=>current[i]??{...dims,weightLb:0,customPriceUsd:0}));}}/></div>
        {quantity>1&&<div className="grid gap-3 border-y border-stone-100 py-3"><p className="text-xs font-semibold text-navy-600">Confirma qué se repite en las {quantity} piezas</p><div className="flex flex-wrap gap-x-5 gap-y-3">{mode==="volumen"&&<Checkbox label="Mismas dimensiones" checked={shared.dimensions} onChange={e=>setShared(v=>({...v,dimensions:e.target.checked}))}/>}<Checkbox label="Confirmo el mismo peso real" checked={shared.weight} onChange={e=>setShared(v=>({...v,weight:e.target.checked}))}/>{mode==="manual"&&<Checkbox label="Misma cotización por pieza" checked={shared.price} onChange={e=>setShared(v=>({...v,price:e.target.checked}))}/>}</div><p className="text-xs leading-5 text-navy-500">{shared.weight?"Se usará el peso real del paquete 1 para todas las piezas.":"Pesa cada caja e indica su peso en la tabla, aunque tenga las mismas medidas."} Una etiqueta por pieza; la prealerta aplica solo a la primera.</p></div>}
        {mode==="volumen"&&<div className="flex gap-2 overflow-x-auto pb-1" aria-label="Medidas de las cajas disponibles">
          {rates.map(rate=><button type="button" key={rate.id} onClick={()=>{setValue("length",rate.dimensions.length,{shouldValidate:true});setValue("width",rate.dimensions.width,{shouldValidate:true});setValue("height",rate.dimensions.height,{shouldValidate:true});setValue("overrideCategory","");}} className={`min-w-32 flex-1 rounded-xl border p-3 text-left ${suggestion?.category?.id===rate.id?"border-orange-500 bg-orange-50 ring-1 ring-orange-500":"border-stone-200 bg-white hover:border-orange-300"}`}><strong className="block font-display text-base text-navy-950">{rate.name}</strong><span className="mt-1 block whitespace-nowrap text-xs text-navy-500">{rate.dimensions.length} × {rate.dimensions.width} × {rate.dimensions.height} in</span><span className="block text-xs text-navy-500">Hasta {rate.maxWeightLb} lb</span><span className="mt-1 block text-sm font-bold text-orange-700">{`${formatUsd(weightPricing.pricePerLbUsd)} / lb dimensional`}</span></button>)}
        </div>}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {mode==="volumen"&&<><Input label="Largo (in)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.length?.message} {...register("length",{shouldUnregister:true})}/>
          <Input label="Ancho (in)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.width?.message} {...register("width",{shouldUnregister:true})}/>
          <Input label="Alto (in)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.height?.message} {...register("height",{shouldUnregister:true})}/></>}
          <Input label="Peso (lb)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.weightLb?.message} {...register("weightLb")}/>
        </div>
        <p className="-mt-2 text-xs leading-5 text-navy-500">{mode==="peso-real"?"Solo se cobra el peso real, redondeado hacia arriba a la libra completa. No necesitas medidas.":mode==="volumen"?`Medidas en pulgadas. Fórmula: largo × ancho × alto ÷ ${weightPricing.dimensionalBase} × ${weightPricing.dimensionalFactor}. El peso real es informativo para el camión; no cambia el precio.`:"Indica el peso real para el camión y el precio acordado. No necesitas medidas."}</p>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 px-4 py-3" aria-live="polite"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-navy-400">{quantity>1?"Cálculo · paquete 1":"Cálculo por pieza"}</p><h3 className="mt-1 text-sm font-semibold text-navy-950">{mode==="peso-real"?"Peso real":mode==="volumen"?"Volumen":"Cotización especial"}</h3><p className="mt-1 text-xs leading-5 text-navy-500">{mode==="volumen"?`Equivalente dimensional: ${billing?.dimensionalWeightLb.toFixed(2)??"—"} lb · se redondea hacia arriba.`:mode==="manual"?"Precio acordado por pieza, independiente del peso.":`Peso real: ${Number(values.weightLb)||0} lb`}</p></div><div className="text-right"><p className="text-lg font-semibold tabular-nums text-navy-950">{billing?formatUsd(billing.amountUsd):"—"}</p><p className="mt-1 text-[11px] text-navy-500">{mode!=="manual"&&billing?`${billing.billableWeightLb} lb × ${formatUsd(weightPricing.pricePerLbUsd)}`:"Por pieza"}</p></div></div>
        {isExceeded&&!values.reject&&<Input label="Precio de carga personalizada (USD)" type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="0.00" error={errors.customPriceUsd?.message} {...register("customPriceUsd",{shouldUnregister:true,setValueAs:value=>value===""?undefined:Number(value)})}/>}
        {quantity>1&&<PackageMeasurements showDimensions={mode==="volumen"} shared={shared} page={piecePage} onPageChange={setPiecePage} pieces={resolvedPieces} prices={piecePrices} manual={mode==="manual"} onChange={(i,field,value)=>setPieces(items=>items.map((item,j)=>j===i?{...item,[field]:value}:item))}/>}
        {!values.reject&&<section aria-label="Total de recepción" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-navy-950 p-4 text-white"><div><p className="text-xs font-semibold uppercase tracking-wider">{pricedCount===quantity?"Total de recepción":"Subtotal provisional"}</p><p className="mt-1 text-xs">{pricedCount} de {quantity} unidades calculadas{pricedCount<quantity?" · Completa las piezas pendientes":""}</p></div><strong className="text-2xl tabular-nums">{formatUsd(total)}</strong></section>}
        <details className="rounded-xl border border-stone-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Foto del paquete y ajustes opcionales</summary><div className="mt-4 grid gap-4"><PhotoField key={`photo-${receivedIds.length}`} value={photo} onChange={setPhoto} onBusyChange={setPhotoBusy}/>
          {mode==="fijo"&&<><Select label="Cambiar categoría" options={[{value:"",label:"Usar categoría calculada"},...rates.map(item=>({value:item.id,label:`${item.name} · ${formatUsd(item.priceUsd)}`}))]} {...register("overrideCategory")}/>{values.overrideCategory&&<Textarea label="Motivo del cambio" error={errors.overrideReason?.message} {...register("overrideReason")}/>}</>}
        </div></details>
        <div className={`rounded-xl border p-4 ${values.reject?"border-red-200 bg-red-50":"border-stone-200"}`}><Checkbox label="Rechazar este paquete" {...register("reject")}/>{values.reject&&<div className="mt-4"><Textarea label="Motivo del rechazo" error={errors.rejectionReason?.message} {...register("rejectionReason")}/></div>}</div>
      </section>
    </div>
    <aside className="lg:sticky lg:top-4 grid min-w-0 gap-4 rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-lg font-bold">{quantity} paquete(s) · {formatUsd(total)}</p><StepHeading number="03" title={values.reject?"Confirmar rechazo":"Forma de pago"} description={values.reject?"No se registrará un cobro para este paquete.":"Selecciona método y ubicación. El folio se genera al guardar."}/>
      {!values.reject&&<PaymentCapture locations={locations} value={payment} onChange={setPayment} total={total}/>}
      <div className="border-t border-stone-200 pt-5"><Button type="submit" className="w-full" loading={isSubmitting} disabled={photoBusy||selectingPrealert||!values.recipientId||(!values.reject&&!billing)}><PackageCheck className="size-4"/>{photoBusy?"Comprimiendo foto…":isSubmitting&&photo?"Guardando recepción y foto…":values.reject?"Guardar rechazo":"Guardar recepción"}</Button><p className="mt-3 text-center text-xs leading-5 text-navy-500">{values.reject?"El motivo quedará en el historial del cliente.":"Al guardar podrás imprimir la etiqueta del paquete."}</p></div>

    </aside>
  </form>;
}
function StepHeading({number,title,description}:{number:string;title:string;description:string}){return <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-orange-50 font-display text-sm font-bold text-orange-700">{number}</span><div><h2 className="font-display text-base font-bold text-navy-950">{title}</h2><p className="mt-1 text-xs leading-5 text-navy-500">{description}</p></div></div>;}
