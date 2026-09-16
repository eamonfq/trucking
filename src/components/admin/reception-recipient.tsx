"use client";
import {useEffect,useRef,useState} from "react";
import {getReceptionContacts} from "@/lib/auth/reception-contacts";
import {upsertCustomerRecipient,deleteCustomerRecipient} from "@/lib/auth/admin-actions";
import {Dialog} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Select} from "@/components/ui/select";
import {Button} from "@/components/ui/button";

const emptyAddress={label:"Principal",street:"",exteriorNumber:"",interiorNumber:"",neighborhood:"",postalCode:"",municipality:"",state:"",references:""};
const fields: Array<[keyof typeof emptyAddress,string,boolean]>=[["label","Nombre de la dirección",true],["street","Calle",true],["exteriorNumber","Número exterior",true],["interiorNumber","Número interior",false],["neighborhood","Colonia",true],["postalCode","Código postal",true],["municipality","Municipio / ciudad",true],["state","Estado",true],["references","Referencias",false]];
type Props={userId:string;value:string;onChange:(id:string)=>void};
export function ReceptionRecipient(props:Props){return <RecipientEditor key={props.userId} {...props}/>;}
function RecipientEditor({userId,value,onChange}:Props){
 const active=useRef(true);
 useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
 const [data,setData]=useState<Awaited<ReturnType<typeof getReceptionContacts>>>({recipients:[],addresses:[]});
 const [loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 const [query,setQuery]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [person,setPerson]=useState({id:"",name:"",phone:"",addressId:""});
 const [newAddress,setNewAddress]=useState(false),[address,setAddress]=useState(emptyAddress);
 useEffect(()=>{let alive=true;getReceptionContacts(userId).then(d=>{if(alive){setData(d);setLoading(false);setFailed(false);}}).catch(()=>{if(alive){setFailed(true);setLoading(false);}});return()=>{alive=false;};},[userId,retry]);
 const selected=data.recipients.find(r=>r.id===value);
 const selectedAddress=data.addresses.find(a=>a.id===selected?.addressId);
 const found=data.recipients.filter(r=>(r.name+" "+r.phone).toLowerCase().includes(query.toLowerCase()));
 const options=selected&&!found.slice(0,30).some(r=>r.id===selected.id)?[selected,...found.slice(0,30)]:found.slice(0,30);
 function start(edit=false){setMessage("");setPerson(edit&&selected?selected:{id:"",name:"",phone:"",addressId:data.addresses[0]?.id??""});setAddress({...emptyAddress});setNewAddress(!data.addresses.length);setOpen(true);}
 return <div data-testid="reception-recipient" className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4">
 <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">Quién recibe en México</strong><Button type="button" variant="ghost" disabled={loading||failed} onClick={()=>start()}>Agregar destinatario</Button></div>
 {loading?<p role="status">Cargando destinatarios de este cliente…</p>:failed?<div role="alert"><p>No se pudieron consultar los destinatarios.</p><Button type="button" onClick={()=>{setLoading(true);setRetry(n=>n+1);}}>Reintentar</Button></div>:!data.recipients.length?<p className="text-sm text-navy-500">Este cliente todavía no tiene destinatarios. Agrega quién recibe y su dirección para continuar.</p>:<>
 <Input label="Buscar destinatario por nombre o teléfono" value={query} onChange={e=>setQuery(e.target.value)}/>
 <Select label="Destinatario de estos paquetes" value={value} options={[{value:"",label:"Selecciona quién recibe"},...options.map(r=>({value:r.id,label:r.name+" · "+r.phone}))]} onChange={e=>{setMessage("");onChange(e.target.value);}}/>
 {!found.length&&<p>No hay coincidencias.</p>}{found.length>30&&<p className="text-xs">Mostrando 30 resultados. Refina la búsqueda.</p>}
 {selected&&<div className="grid gap-2 rounded-lg bg-stone-50 p-3"><p className="text-sm">{selectedAddress?[selectedAddress.street+" "+selectedAddress.exteriorNumber,selectedAddress.interiorNumber,selectedAddress.neighborhood,selectedAddress.municipality,selectedAddress.state,"CP "+selectedAddress.postalCode].filter(Boolean).join(", "):"Sin dirección válida. Edita el destinatario."}</p><div className="flex flex-wrap gap-2"><Button type="button" variant="ghost" onClick={()=>start(true)}>Editar destinatario</Button><Button type="button" variant="ghost" onClick={()=>onChange("")}>Quitar selección</Button><Button type="button" variant="ghost" disabled={busy} onClick={async()=>{if(!window.confirm("¿Eliminar este destinatario? Se conservará si tiene paquetes o envíos vinculados."))return;setBusy(true);try{const r=await deleteCustomerRecipient(userId,selected.id);if(!active.current)return;if(!r.ok){setMessage(r.error);return;}setData(d=>({...d,recipients:d.recipients.filter(p=>p.id!==selected.id)}));onChange("");}catch{setMessage("No se confirmó la eliminación.");}finally{setBusy(false);}}}>Eliminar del cliente</Button></div></div>}
 </>}
 {message&&!open&&<p role="status" className="text-sm text-orange-700">{message}</p>}
 <Dialog open={open} onClose={()=>{if(!busy)setOpen(false);}} title={person.id?"Editar destinatario":"Agregar destinatario"} description="Guarda la persona y su dirección sin salir de recepción." size="large">
 <form className="grid max-h-[65vh] gap-4 overflow-y-auto pr-2" onSubmit={async e=>{e.preventDefault();e.stopPropagation();if(busy)return;setBusy(true);setMessage("");try{const r=await upsertCustomerRecipient(userId,person,person.id||undefined,newAddress?address:undefined);if(!active.current)return;if(!r.ok){setMessage(r.error);return;}setData(d=>({...d,recipients:[...d.recipients.filter(p=>p.id!==r.recipient.id),r.recipient],addresses:r.address?[...d.addresses.filter(a=>a.id!==r.address!.id),r.address]:d.addresses}));onChange(r.recipient.id);setQuery("");setOpen(false);setMessage("Destinatario guardado y seleccionado para estos paquetes.");}catch{setMessage("No se pudo confirmar el guardado. Revisa la conexión antes de reintentar.");}finally{setBusy(false);}}}>
 <fieldset disabled={busy} className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><Input name="recipientName" label="Nombre completo de quien recibe" required value={person.name} onChange={e=>setPerson({...person,name:e.target.value})}/><Input name="recipientPhone" label="Teléfono de quien recibe" type="tel" required value={person.phone} onChange={e=>setPerson({...person,phone:e.target.value})}/></div>
 <Select label="Dirección de entrega" value={newAddress?"new":"existing"} options={[...(data.addresses.length?[{value:"existing",label:"Seleccionar dirección guardada"}]:[]),{value:"new",label:"Registrar una nueva dirección"}]} onChange={e=>setNewAddress(e.target.value==="new")}/>
 {newAddress?<div className="grid gap-3 sm:grid-cols-2">{fields.map(([name,label,required])=><Input key={name} name={"address-"+name} label={label} required={required} value={address[name]} maxLength={name==="postalCode"?5:name==="references"?300:undefined} inputMode={name==="postalCode"?"numeric":undefined} onChange={e=>setAddress({...address,[name]:e.target.value})}/>)}</div>:<Select label="Dirección guardada" required value={person.addressId} options={[{value:"",label:"Selecciona dirección"},...data.addresses.map(a=>({value:a.id,label:a.label+" · "+a.street+" "+a.exteriorNumber+", "+a.municipality+", "+a.state}))]} onChange={e=>setPerson({...person,addressId:e.target.value})}/>}
 </fieldset>{message&&<p role="alert" className="text-sm text-orange-700">{message}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" disabled={busy} onClick={()=>setOpen(false)}>Cancelar</Button><Button type="submit" loading={busy}>Guardar destinatario</Button></div>
 </form></Dialog></div>;
}
