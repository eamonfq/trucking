"use client";
import {Plus,Trash2,Package} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select} from '@/components/ui/select';
import {Checkbox} from '@/components/ui/checkbox';
import {formatUsd} from '@/lib/utils/format';
import {prepareReceptionConcepts,type ReceptionConceptInput} from '@/lib/utils/reception-concepts';
import type {WeightPricing} from '@/lib/utils/billing';
import type {BoxCategory} from '@/lib/config/box-categories';

export function newReceptionConcept():ReceptionConceptInput{return {id:crypto.randomUUID(),description:'',quantity:1,mode:'manual',weightScope:'grupo',weightLb:0,weightUnknown:false,priceUsd:0,rateUsd:3.2,length:0,width:0,height:0,categoryId:''};}
export function ReceptionConceptEditor({value,onChange,rates,pricing}:{value:ReceptionConceptInput[];onChange:(v:ReceptionConceptInput[])=>void;rates:BoxCategory[];pricing:WeightPricing}){
 const update=(id:string,change:Partial<ReceptionConceptInput>)=>onChange(value.map(c=>c.id===id?{...c,...change}:c));
 return <section className="grid min-w-0 gap-4" aria-label="Conceptos de la recepción"><p className="text-sm leading-6 text-navy-500">Separa artículos con cobros o pesajes distintos. Por ejemplo: una moto con precio acordado y cinco cajas con peso conjunto. Una recepción, una etiqueta por pieza.</p>{value.map((c,index)=>{
  let total:number|undefined;try{total=prepareReceptionConcepts([c],pricing,rates).total;}catch{}
  const numberField=(field:'weightLb'|'priceUsd'|'rateUsd'|'length'|'width'|'height',label:string)=><Input key={field} label={label} type="number" min="0" step={field==='weightLb'?'0.001':'0.01'} inputMode="decimal" value={Number(c[field])||''} onChange={e=>update(c.id,{[field]:Number(e.target.value)})}/>;
  return <article key={c.id} className="grid min-w-0 gap-4 rounded-2xl border border-stone-200 bg-white p-4"><header className="flex items-center justify-between gap-3"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-500"><Package className="size-4"/>Concepto {index+1}</span>{value.length>1&&<Button type="button" variant="ghost" aria-label={`Eliminar concepto ${index+1}`} onClick={()=>onChange(value.filter(item=>item.id!==c.id))}><Trash2 className="size-4"/></Button>}</header><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px]"><Input label={`Contenido del concepto ${index+1}`} placeholder="Ej. Moto Honda · VIN, o cajas de ropa" maxLength={300} value={c.description} onChange={e=>update(c.id,{description:e.target.value})}/><Input label="Piezas" type="number" min="1" max="50" step="1" value={Number(c.quantity)} onChange={e=>update(c.id,{quantity:Number(e.target.value)})}/></div>
   <Select label="Cómo se cobra este concepto" value={c.mode} onChange={e=>update(c.id,{mode:e.target.value as ReceptionConceptInput['mode'],weightScope:['fijo','volumen'].includes(e.target.value)?'iguales':'grupo',weightUnknown:false})} options={[{value:'manual',label:'Precio acordado'},{value:'peso-real',label:'Peso · tarifa general por libra'},{value:'peso-personalizado',label:'Peso · tarifa acordada por libra'},{value:'fijo',label:'Precio fijo por caja · catálogo'},{value:'volumen',label:'Volumen · medidas por pieza'}]}/>
   {Number(c.quantity)>1&&<Select label="Alcance del peso y del precio acordado" value={c.weightScope} onChange={e=>update(c.id,{weightScope:e.target.value as 'grupo'|'iguales',weightLb:0,priceUsd:0})} options={['fijo','volumen'].includes(c.mode)?[{value:'iguales',label:'Mismas medidas y peso por pieza'}]:[{value:'grupo',label:'Peso conjunto / precio por todo este concepto'},{value:'iguales',label:'Mismo peso / precio por cada pieza'}]}/>}
   {c.mode==='fijo'&&<Select label="Caja del catálogo" value={c.categoryId} onChange={e=>update(c.id,{categoryId:e.target.value})} options={[{value:'',label:'Selecciona tamaño'},...rates.map(r=>({value:r.id,label:`${r.name} · ${formatUsd(r.priceUsd)} / caja`}))]}/>}
   {c.mode==='volumen'&&<div className="grid grid-cols-3 gap-3">{numberField('length','Largo (in)')}{numberField('width','Ancho (in)')}{numberField('height','Alto (in)')}</div>}
   <div className="grid gap-3 sm:grid-cols-2">{!c.weightUnknown&&numberField('weightLb',c.weightScope==='grupo'&&Number(c.quantity)>1?'Peso conjunto de este concepto (lb)':'Peso real por pieza (lb)')}{c.mode==='manual'&&numberField('priceUsd',c.weightScope==='grupo'?'Precio total de este concepto (USD)':'Precio por pieza (USD)')}{c.mode==='peso-personalizado'&&numberField('rateUsd','Tarifa por libra (USD)')}</div>
   {c.mode==='manual'&&<Checkbox label="Todavía no se conoce el peso de este artículo" checked={!!c.weightUnknown} onChange={e=>update(c.id,{weightUnknown:e.target.checked,weightLb:0})}/>}
   <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3"><p className="max-w-md text-xs leading-5 text-navy-500">{c.weightUnknown?'Peso no registrado: no se sustituye por el peso de otros artículos.':c.weightScope==='grupo'?'Este peso pertenece solo a este concepto, no a toda la recepción.':'Confirma que cada pieza tenga el mismo peso. Si difieren, crea otro concepto.'}</p><strong className="text-lg tabular-nums text-navy-950">{total===undefined?'Por completar':formatUsd(total)}</strong></footer>
  </article>;
 })}<Button type="button" variant="secondary" onClick={()=>onChange([...value,{...newReceptionConcept(),rateUsd:pricing.pricePerLbUsd}])} disabled={value.length>=50}><Plus className="size-4"/>Añadir otro concepto</Button></section>;
}
