"use client";

import { calculateBilling, DEFAULT_WEIGHT_PRICING, type WeightPricing } from "@/lib/utils/billing";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import styles from "./reception-pos.module.css";
import { CheckCircle2, PackageCheck } from "lucide-react";
import { z } from "zod";
import { receiveBoxWithPhoto } from "@/lib/auth/file-actions";
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

type ReceptionInput = z.input<typeof receptionSchema>;

export function ReceptionForm({ users, prealerts = [], excessPolicy, excessFeeUsd = 0, rates, defaultCustomerId, defaultPrealertId, weightPricing = DEFAULT_WEIGHT_PRICING, locations=[] }: { locations?:{id:string;name:string}[]; weightPricing?: WeightPricing; users: User[]; prealerts?: Box[]; excessPolicy: string; excessFeeUsd?: number; rates: BoxCategory[]; defaultCustomerId?: string; defaultPrealertId?: string }) {
  const [receivedIds, setReceivedIds] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentChoice>({method:"destino",amount:"",reference:""});
  const [selectingPrealert,setSelectingPrealert]=useState(false);
  const [lastReceived, setLastReceived] = useState<{id:string;code:string} | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [customers, setCustomers] = useState(users);
  const { showToast } = useToast();
  const { register, handleSubmit, control, reset, setValue, getValues, formState: { errors, isSubmitting } } = useForm<ReceptionInput>({ resolver: zodResolver(receptionSchema), defaultValues: { billingMode:"peso", customer: defaultCustomerId ?? "", prealertId: defaultPrealertId ?? "", reject: false, overrideCategory: "", overrideReason: "", rejectionReason: "" } });
  const values = useWatch({ control });
  const dims = { length: Number(values.length) || 0, width: Number(values.width) || 0, height: Number(values.height) || 0 };
  const hasMeasurements = Boolean(dims.length && dims.width && dims.height && Number(values.weightLb));
  const suggestion = hasMeasurements ? suggestCategory(dims, Number(values.weightLb), rates) : null;
  const prealert = prealerts.find(item => item.id === values.prealertId);
  const mode=values.billingMode??"peso";
  const surcharge = mode==="fijo" && !values.reject && excessPolicy === "recargo" && prealert && hasMeasurements && !suggestCategory(dims, Number(values.weightLb), rates.filter(rate => rate.id === prealert.categoryId)).category ? excessFeeUsd : 0;
  const customPrice=Number(values.customPriceUsd)||0;
  const isExceeded = mode==="manual";
  let billing: ReturnType<typeof calculateBilling> | undefined;
  try { if(hasMeasurements) billing=calculateBilling(mode,dims,Number(values.weightLb),weightPricing,mode==="manual"?customPrice:rates.find(rate=>rate.id===values.overrideCategory)?.priceUsd??suggestion?.category?.priceUsd??0); } catch {}
  const total=(billing?.amountUsd??0)+surcharge;
  const reasonLabel = suggestion?.reason === "peso-y-medida" ? "peso y medidas" : suggestion?.reason === "peso" ? "peso" : suggestion?.reason === "medida" ? "medidas" : null;

  return <form onSubmit={handleSubmit(async (data) => {
    const upload = new FormData(); if (photo) upload.set("file",photo);
    let result;
    try { result = await receiveBoxWithPhoto({...data,customPriceUsd:isExceeded&&!data.reject?data.customPriceUsd:undefined}, upload, data.reject ? undefined : {method:payment.method, warehouseId:payment.warehouseId, reference:payment.reference, ...(["tarjeta","transferencia","deposito"].includes(payment.method) ? {amount:payment.amount} : {})}); }
    catch { return showToast({title:"No se confirmó la recepción",description:"Revisa la conexión y actualiza la bodega antes de reintentar para evitar duplicados.",variant:"error"}); }
    if (!result.ok) return showToast({ title: "No se pudo registrar la recepción", description: result.error, variant: "error" });
    showToast({ title: result.box.status === "rechazada" ? "Rechazo registrado" : "Caja enviada a bodega", description: result.invoice ? `${result.code} quedó registrada y se generó ${result.invoice.number}.` : `${result.code} quedó registrada y el cliente fue notificado.` });
    setReceivedIds(current => [...current, result.box.id]);
    reset({ billingMode:mode, customer: data.customer, prealertId: "", reject: false, overrideCategory: "", overrideReason: "", rejectionReason: "" });
    setPhoto(null); setPayment({method:"destino",amount:"",reference:"",warehouseId:payment.warehouseId}); setLastReceived({id:result.box.id,code:result.code});
  })} className={`${styles.pos} grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]`}>
    <div className="grid min-w-0 gap-4">
      <section className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <StepHeading number="01" title="Cliente y prealerta" description="Identifica al propietario y vincula su compra, si la anticipó."/>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <CustomerSearch users={customers} value={values.customer} error={errors.customer?.message} onChange={id=>{setValue("customer",id,{shouldValidate:true});setValue("prealertId","");}}/>
          <CustomerQuickCreate onCreated={user=>{setCustomers(current=>[...current.filter(item=>item.id!==user.id),user]);setValue("prealertId","");setValue("customer",user.id,{shouldValidate:true});}}/>
        </div>
        <ReceptionPrealertPicker key={values.customer??""} items={prealerts.filter(box=>box.status==="pre-alertada"&&box.userId===values.customer&&!receivedIds.includes(box.id))} value={values.prealertId??""} disabled={!values.customer} busy={selectingPrealert} onChange={async id=>{
          if(!id){setValue("prealertId","");return;}
          const customerId=values.customer;if(!customerId)return;
          setSelectingPrealert(true);
          try{const result=await selectPrealertAtWarehouse(id,customerId);if(!result.ok){showToast({title:"No se pudo vincular",description:result.error,variant:"error"});return;}if(getValues("customer")===customerId)setValue("prealertId",id);}
          catch{showToast({title:"No se pudo vincular la prealerta",description:"Vuelve a seleccionarla para reintentar.",variant:"error"});}
          finally{setSelectingPrealert(false);}
        }}/>
      </section>
      <section className="grid gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <StepHeading number="02" title="Paquete y medidas" description="Elige una caja como referencia o captura las medidas reales."/>
        <Select label="Tipo de cobro" options={[{value:"peso",label:"Por libra · mayor entre peso real y dimensional"},{value:"fijo",label:"Precio fijo por categoría"},{value:"manual",label:"Carga especial · cotización manual"}]} {...register("billingMode")} /><div className="flex gap-2 overflow-x-auto pb-1" aria-label="Medidas de las cajas disponibles">
          {rates.map(rate=><button type="button" key={rate.id} onClick={()=>{setValue("length",rate.dimensions.length,{shouldValidate:true});setValue("width",rate.dimensions.width,{shouldValidate:true});setValue("height",rate.dimensions.height,{shouldValidate:true});setValue("overrideCategory","");}} className={`min-w-32 flex-1 rounded-xl border p-3 text-left ${suggestion?.category?.id===rate.id?"border-orange-500 bg-orange-50 ring-1 ring-orange-500":"border-stone-200 bg-white hover:border-orange-300"}`}><strong className="block font-display text-base text-navy-950">{rate.name}</strong><span className="mt-1 block whitespace-nowrap text-xs text-navy-500">{rate.dimensions.length} × {rate.dimensions.width} × {rate.dimensions.height} in</span><span className="block text-xs text-navy-500">Hasta {rate.maxWeightLb} lb</span><span className="mt-1 block text-sm font-bold text-orange-700">{mode==="peso"?`${formatUsd(weightPricing.pricePerLbUsd)} / lb`:formatUsd(rate.priceUsd)}</span></button>)}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Largo (in)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.length?.message} {...register("length")}/>
          <Input label="Ancho (in)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.width?.message} {...register("width")}/>
          <Input label="Alto (in)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.height?.message} {...register("height")}/>
          <Input label="Peso (lb)" type="number" inputMode="decimal" min="0.1" step="0.1" placeholder="0.0" error={errors.weightLb?.message} {...register("weightLb")}/>
        </div>
        <p className="-mt-2 text-xs text-navy-500">Dimensiones en pulgadas · Peso en libras · Se admiten decimales.</p>
        <div className={`rounded-2xl p-5 text-white ${isExceeded?"bg-navy-950":"bg-navy-950"}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-white/65">{isExceeded?"Cotización especial":"Categoría calculada"}</p>
          {mode==="peso"?<div className="mt-3 grid gap-2"><h3 className="font-display text-xl font-bold">Cobro por libra</h3><p className="text-sm">Real: {Number(values.weightLb)||0} lb · Dimensional: {billing?.dimensionalWeightLb.toFixed(2)??"—"} lb</p><strong className="text-xl text-orange-400">{billing?`${billing.billableWeightLb} lb × ${formatUsd(weightPricing.pricePerLbUsd)} = ${formatUsd(total)}`:"Completa medidas y peso"}</strong><p className="text-xs text-white/70">Se redondea hacia arriba el mayor peso. Medidas en pulgadas.</p></div>:mode!=="manual"&&suggestion?.category?<><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 font-display text-2xl font-bold"><CheckCircle2 className="size-5 text-emerald-400"/>{rates.find(rate=>rate.id===values.overrideCategory)?.name??suggestion.category.name}</h3><strong className="font-display text-2xl text-orange-400">{formatUsd((rates.find(rate=>rate.id===values.overrideCategory)?.priceUsd??suggestion.category.priceUsd)+surcharge)}</strong></div><p className="mt-2 text-xs text-white/70">{reasonLabel?`Categoría ajustada por ${reasonLabel}.`:"Las medidas y el peso caben en esta categoría."}</p>{surcharge>0&&<p className="mt-2 text-sm text-orange-200">Incluye {formatUsd(surcharge)} de recargo por excedente.</p>}</>:isExceeded?<div className="mt-2 flex flex-wrap items-center justify-between gap-2"><h3 className="font-display text-xl font-bold">Carga personalizada</h3><strong className="text-xl text-orange-400">{customPrice?formatUsd(customPrice):"Por cotizar"}</strong><p className="w-full text-sm text-white/70">Vehículos, motos, maquinaria, mudanzas u otra carga especial. Registra la cotización acordada.</p></div>:<p className="mt-2 text-xs text-white/70">Completa las medidas. Si no cabe en una categoría, selecciona cobro por libra o cotización manual.</p>}
        </div>
        {isExceeded&&!values.reject&&<Input label="Precio de carga personalizada (USD)" type="number" inputMode="decimal" min="0.01" step="0.01" required placeholder="0.00" error={errors.customPriceUsd?.message} {...register("customPriceUsd",{shouldUnregister:true,setValueAs:value=>value===""?undefined:Number(value)})}/>}
        <details className="rounded-xl border border-stone-200 p-4"><summary className="cursor-pointer text-sm font-semibold">Foto del paquete y ajustes opcionales</summary><div className="mt-4 grid gap-4"><PhotoField key={`photo-${receivedIds.length}`} value={photo} onChange={setPhoto}/>
          {!isExceeded&&<><Select label="Cambiar categoría" options={[{value:"",label:"Usar categoría calculada"},...rates.map(item=>({value:item.id,label:`${item.name} · ${formatUsd(item.priceUsd)}`}))]} {...register("overrideCategory")}/>{values.overrideCategory&&<Textarea label="Motivo del cambio" error={errors.overrideReason?.message} {...register("overrideReason")}/>}</>}
        </div></details>
        <div className={`rounded-xl border p-4 ${values.reject?"border-red-200 bg-red-50":"border-stone-200"}`}><Checkbox label="Rechazar este paquete" {...register("reject")}/>{values.reject&&<div className="mt-4"><Textarea label="Motivo del rechazo" error={errors.rejectionReason?.message} {...register("rejectionReason")}/></div>}</div>
      </section>
    </div>
    <aside className="grid min-w-0 gap-4 rounded-2xl border border-stone-200 bg-white p-4">
      <StepHeading number="03" title={values.reject?"Confirmar rechazo":"Forma de pago"} description={values.reject?"No se registrará un cobro para este paquete.":"Selecciona método y ubicación. El folio se genera al guardar."}/>
      {!values.reject&&<PaymentCapture locations={locations} value={payment} onChange={setPayment} total={total}/>}
      <div className="border-t border-stone-200 pt-5"><Button type="submit" className="w-full" loading={isSubmitting} disabled={selectingPrealert||(!values.reject&&!billing)}><PackageCheck className="size-4"/>{values.reject?"Guardar rechazo":"Guardar recepción"}</Button><p className="mt-3 text-center text-xs leading-5 text-navy-500">{values.reject?"El motivo quedará en el historial del cliente.":"Al guardar podrás imprimir la etiqueta del paquete."}</p></div>
      {lastReceived&&<div role="status" className="grid gap-3 rounded-xl bg-success-50 p-4 text-sm"><strong>{lastReceived.code} registrada correctamente.</strong><Link target="_blank" href={`/etiquetas/${lastReceived.id}`} className="font-bold underline">Imprimir etiqueta</Link><div className="flex flex-wrap gap-4"><Link href="/admin/bodega" className="underline">Ver bodega</Link><Link href="/admin/facturas" className="underline">Ver factura</Link></div></div>}
    </aside>
  </form>;
}
function StepHeading({number,title,description}:{number:string;title:string;description:string}){return <div className="flex items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-orange-50 font-display text-sm font-bold text-orange-700">{number}</span><div><h2 className="font-display text-base font-bold text-navy-950">{title}</h2><p className="mt-1 text-xs leading-5 text-navy-500">{description}</p></div></div>;}
