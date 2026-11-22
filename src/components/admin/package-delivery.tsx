"use client";

import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {MapPin,Phone,Pencil,Check} from 'lucide-react';
import {getPackageDelivery,savePackageDelivery} from '@/lib/auth/package-delivery-actions';
import {formatDeliveryAddress} from '@/lib/utils/address-display';
import {Card} from '@/components/ui/card';
import {Dialog} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Select} from '@/components/ui/select';
import {trucksPackageDelivery} from '@/lib/i18n/catalogs/trucks-package-delivery';
import {useT} from '@/lib/i18n/provider';

const emptyAddress={label:'',street:'',exteriorNumber:'',interiorNumber:'',neighborhood:'',postalCode:'',municipality:'',state:'',references:''};
const addressFields:Array<[keyof typeof emptyAddress,keyof typeof trucksPackageDelivery]>=[['street','Calle'],['exteriorNumber','Número exterior'],['interiorNumber','Número interior'],['neighborhood','Colonia'],['postalCode','Código postal'],['municipality','Municipio / ciudad'],['state','Estado'],['references','Referencias adicionales']];
type Delivery=NonNullable<Awaited<ReturnType<typeof getPackageDelivery>>>;

export function PackageDelivery({boxId,code,data}:{boxId:string;code:string;data:Delivery}){
 const router=useRouter(),t=useT(trucksPackageDelivery);
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const [recipientId,setRecipientId]=useState(''),[name,setName]=useState(''),[phone,setPhone]=useState(''),[query,setQuery]=useState('');
 const [addressId,setAddressId]=useState(''),[address,setAddress]=useState(emptyAddress),[showFields,setShowFields]=useState(false),[reason,setReason]=useState('');
 const addressText=formatDeliveryAddress(data.recipient?.address);
 function start(){
  setRecipientId(data.recipientId);setName(data.recipient?.name??'');setPhone(data.recipient?.phone??'');
  const current=data.recipient?.address;
  const linked=current?.id?data.addresses.find(a=>a.id===current.id&&formatDeliveryAddress(a)===formatDeliveryAddress(current)):undefined;
  setAddressId(linked?.id??'new');setAddress({...emptyAddress,...current});
  setShowFields(!!current?.street);setReason('');setQuery('');setError('');setSaved(false);setOpen(true);
 }
 const selected=data.recipients.find(r=>r.id===recipientId);
 const matches=data.recipients.filter(r=>(r.name+' '+r.phone).toLowerCase().includes(query.toLowerCase()));
 const options=[...new Map([...(selected?[selected]:[]),...matches.slice(0,30)].map(r=>[r.id,r])).values()];
 return <Card className="shadow-none">
  <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-orange-50 text-orange-700"><MapPin className="size-5"/></span><div><h2 className="font-display text-xl font-bold">{t("Entrega de este paquete")}</h2><p className="mt-1 text-xs text-navy-500">{t("Destinatario y dirección que aparecen en la etiqueta")}</p></div></div>{data.canEdit&&<Button type="button" variant="secondary" onClick={start}><Pencil className="size-4"/>{addressText?t('Editar entrega'):t('Asignar entrega')}</Button>}</div>
  <div className="mt-5 grid gap-4 sm:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-medium text-navy-500">{t("Quién recibe")}</p><p className="mt-2 font-semibold text-navy-950">{data.recipient?.name??t('Destinatario sin asignar')}</p>{data.recipient?.phone&&<a href={`tel:${data.recipient.phone}`} className="mt-2 inline-flex items-center gap-2 text-sm text-navy-500"><Phone className="size-3.5"/>{data.recipient.phone}</a>}</div><div className="rounded-xl border border-stone-200 bg-cream-50 p-4"><p className="text-xs font-medium text-navy-500">{t("Dirección / referencia de entrega")}</p><p className={`mt-2 break-words text-sm leading-6 ${addressText?'text-navy-900':'text-amber-800'}`}>{addressText||t('No hay una dirección o referencia asignada a este paquete.')}</p>{data.warehouseName&&<p className="mt-3 text-xs text-navy-500">{t("Almacén del viaje: {name}",{name:data.warehouseName})}</p>}</div></div>
  {saved&&<p role="status" className="mt-4 flex items-center gap-2 text-sm text-emerald-800"><Check className="size-4"/>{t("Entrega guardada. Reimprime la etiqueta para usar los nuevos datos.")}</p>}
  <Dialog open={open} onClose={()=>{if(!busy)setOpen(false);}} title={t("Asignar o corregir entrega")} description={t("{code} · El cambio aplica solo a esta pieza, no a otras cajas ni al directorio del cliente.",{code})} size="large" footer={<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>{t("Cancelar")}</Button><Button type="submit" form="package-delivery-form" loading={busy}>{t("Guardar entrega")}</Button></div>}>
   <form id="package-delivery-form" className="grid gap-5" onSubmit={async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{const result=await savePackageDelivery(boxId,{revision:data.revision,recipientId,name,phone,addressId:addressId==='new'?'':addressId,newAddress:addressId==='new'?address:undefined,reason});if(!result.ok){setError(result.error);return;}setOpen(false);setSaved(true);router.refresh();}catch{setError(t('No se confirmó el guardado. Actualiza el detalle antes de reintentar.'));}finally{setBusy(false);}
   }}><fieldset disabled={busy} className="grid min-w-0 gap-5">
    <section className="grid gap-3"><h3 className="text-sm font-bold">{t("1. Quién recibe")}</h3>{data.recipients.length>0&&<><Input label={t("Buscar contacto del cliente")} value={query} onChange={event=>setQuery(event.target.value)}/><Select label={t("Destinatario")} value={recipientId} options={[{value:'',label:t('Capturar contacto para esta pieza')},...options.map(person=>({value:person.id,label:person.name+' · '+person.phone}))]} onChange={event=>{const id=event.target.value,person=data.recipients.find(r=>r.id===id);setRecipientId(id);if(person){setName(person.name);setPhone(person.phone);setAddressId(data.addresses.some(a=>a.id===person.addressId)?person.addressId:'new');setAddress({...emptyAddress});}}}/>{matches.length>30&&<p className="text-xs text-navy-500">{t("Refina la búsqueda para encontrar otros contactos.")}</p>}</>}<div className="grid gap-3 sm:grid-cols-2"><Input label={t("Nombre de quien recibe")} required maxLength={180} value={name} onChange={event=>setName(event.target.value)}/><Input label={t("Teléfono de quien recibe")} type="tel" required value={phone} onChange={event=>setPhone(event.target.value)}/></div></section>
    <section className="grid gap-3 border-t border-stone-100 pt-4"><h3 className="text-sm font-bold">{t("2. Dónde se entrega")}</h3><Select label={t("Dirección de este paquete")} value={addressId} options={[{value:'new',label:t('Escribir dirección o referencia para esta pieza')},...data.addresses.map(a=>({value:a.id,label:formatDeliveryAddress(a)||t('Dirección vacía')}))]} onChange={event=>setAddressId(event.target.value)}/>{addressId!=='new'?<p className="rounded-xl bg-cream-50 p-4 text-sm leading-6">{formatDeliveryAddress(data.addresses.find(a=>a.id===addressId))||t('Selecciona una dirección con datos de entrega.')}</p>:<><Input label={t("Nombre de bodega o referencia de entrega")} required maxLength={180} placeholder={t("Ej. Bodega Valle de Juárez")} value={address.label} onChange={event=>setAddress({...address,label:event.target.value})}/><p className="text-xs text-navy-500">{t("Una referencia es suficiente para retiro en bodega. Los campos del domicilio son opcionales.")}</p><button type="button" aria-expanded={showFields} className="min-h-10 w-fit rounded-lg px-2 text-xs font-semibold text-orange-700 hover:bg-orange-50" onClick={()=>setShowFields(value=>!value)}>{showFields?t('Ocultar domicilio completo'):t('Agregar domicilio completo (opcional)')}</button>{showFields&&<div className="grid gap-3 sm:grid-cols-2">{addressFields.map(([field,label])=><Input key={field} label={t(label)} value={address[field]} maxLength={field==='postalCode'?5:field==='references'?300:180} inputMode={field==='postalCode'?'numeric':undefined} onChange={event=>setAddress({...address,[field]:event.target.value})}/>)}</div>}</>}</section>
    <Input label={t("Motivo de asignación o corrección")} required minLength={5} maxLength={500} placeholder={t("Ej. Completar dirección pendiente")} value={reason} onChange={event=>setReason(event.target.value)}/><p className="text-xs leading-5 text-navy-500">{t("Se conserva una copia de la entrega y queda registro del cambio. No modifica pagos, precios ni el almacén del viaje. Reimprime la etiqueta después de guardar.")}</p>
   </fieldset>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}</form>
  </Dialog>
 </Card>;
}
