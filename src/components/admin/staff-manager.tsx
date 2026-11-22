"use client";
import {useState,useTransition} from "react";
import {useRouter} from "next/navigation";
import {Plus,ShieldCheck,UserRound,Mail,SlidersHorizontal} from "lucide-react";
import {Button} from "@/components/ui/button";
import {DeleteUserLink} from "./delete-user-link";
import {Input} from "@/components/ui/input";
import {Dialog} from "@/components/ui/dialog";
import {ADMIN_SECTIONS,type AdminSection} from "@/lib/auth/admin-permissions";
import {saveAdministrativeStaff,inviteAdministrativeStaff,type getAdministrativeStaff} from "@/lib/auth/staff-actions";
import {adminStaff} from "@/lib/i18n/catalogs/admin-staff";
import {useT} from "@/lib/i18n/provider";
type Staff=Awaited<ReturnType<typeof getAdministrativeStaff>>[number];
type Draft=Omit<Staff,"id">&{id?:string};
const reception:AdminSection[]=["recepcion","prealertas","clientes","pendientes"];
const empty=():Draft=>({firstName:"",paternalLastName:"",email:"",phone:"",active:true,fullAccess:false,permissions:[...reception]});
export function StaffManager({staff,actorId}:{staff:Staff[];actorId:string}){
 const t=useT(adminStaff);
 const router=useRouter(),[query,setQuery]=useState(""),[filter,setFilter]=useState("todos"),[page,setPage]=useState(0);
 const [draft,setDraft]=useState<Draft|null>(null),[message,setMessage]=useState(""),[error,setError]=useState(""),[pending,start]=useTransition();
 const filtered=staff.filter(u=>(filter==="todos"||u.active===(filter==="activos"))&&`${u.firstName} ${u.paternalLastName} ${u.email}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
 const activeCount=staff.filter(u=>u.active).length;
 const pages=Math.max(1,Math.ceil(filtered.length/10)),current=Math.min(page,pages-1),visible=filtered.slice(current*10,current*10+10);
 function open(user?:Staff){setDraft(user?{...user,permissions:[...user.permissions]}:empty());setError("");}
 function update(values:Partial<Draft>){setDraft(d=>d?{...d,...values}:d);}
 function save(){if(!draft)return;setError("");start(async()=>{try{const result=await saveAdministrativeStaff(draft);if(!result.ok){setError(result.error);return;}setDraft(null);setMessage(result.message);router.refresh();}catch{setError(t("No se pudo guardar. Revisa tu conexión y permisos antes de reintentar."));}});}
 function invite(user:Staff){start(async()=>{try{const result=await inviteAdministrativeStaff(user.id);setMessage(result.ok?result.message:result.error);}catch{setMessage(t("No se pudo enviar la invitación. Intenta nuevamente."));}});}
 return <section className="mt-7">
  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy-950 p-6 text-white"><div className="flex items-center gap-4"><ShieldCheck className="size-8 text-orange-400"/><div><p className="font-semibold">{activeCount===1?t("1 usuarios activos"):t("{count} usuarios activos",{count:activeCount})}</p><p className="mt-1 text-sm text-white/65">{t("Permisos aplicados en cada operación, no solo en el menú.")}</p></div></div><Button onClick={()=>open()}><Plus className="size-4"/>{t("Crear usuario")}</Button></div>
  {message&&<p role="status" className="mt-4 rounded-xl border border-line-300 bg-white p-4 text-sm">{message}</p>}
  <div className="mt-5 rounded-2xl border border-line-300 bg-white">
   <div className="grid items-end gap-4 border-b border-line-300 p-5 sm:grid-cols-[1fr_auto]"><Input label={t("Buscar en el equipo")} placeholder={t("Nombre o correo electrónico")} value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/><label className="grid gap-2 text-xs">{t("Estado")}<select className="h-14 rounded-md border border-line-300 bg-white px-4 text-sm" value={filter} onChange={e=>{setFilter(e.target.value);setPage(0);}}><option value="todos">{t("Todos")}</option><option value="activos">{t("Activos")}</option><option value="inactivos">{t("Inactivos")}</option></select></label></div>
   <div className="divide-y divide-line-300">{visible.map(user=><article key={user.id} className="flex flex-wrap items-center gap-4 p-5"><span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream-100 text-navy-700"><UserRound className="size-5"/></span><div className="min-w-0 flex-1 basis-48"><h2 className="font-semibold text-navy-950">{user.firstName} {user.paternalLastName}{user.id===actorId&&<span className="ml-2 text-xs text-navy-500">{t("(tú)")}</span>}</h2><p className="mt-1 break-all text-sm text-navy-500">{user.email}</p><p className="mt-2 text-xs text-navy-600">{user.fullAccess?t("Administrador completo"):ADMIN_SECTIONS.filter(s=>user.permissions.includes(s.id)).map(s=>t(s.label)).join(" · ")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${user.active?"bg-emerald-50 text-emerald-800":"bg-stone-100 text-stone-600"}`}>{user.active?t("Activo"):t("Inactivo")}</span><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={()=>open(user)}><SlidersHorizontal className="size-4"/>{t("Editar acceso")}</Button><Button variant="ghost" disabled={pending||!user.active} onClick={()=>invite(user)} aria-label={t("Enviar invitación a {name}",{name:user.firstName})}><Mail className="size-4"/><span className="sr-only">{t("Enviar invitación")}</span></Button>{user.id!==actorId&&<DeleteUserLink id={user.id} name={`${user.firstName} ${user.paternalLastName}`}/>}</div></article>)}</div>
   {!visible.length&&<p className="px-6 py-12 text-center text-sm text-navy-500">{t("No hay usuarios que coincidan con tu búsqueda.")}</p>}
   <div className="flex items-center justify-between gap-3 border-t border-line-300 p-4 text-xs text-navy-500"><span>{filtered.length===1?t("1 usuarios · Página {page} de {pages}",{page:current+1,pages}):t("{count} usuarios · Página {page} de {pages}",{count:filtered.length,page:current+1,pages})}</span><div className="flex gap-2"><Button variant="ghost" disabled={current===0} onClick={()=>setPage(current-1)}>{t("Anterior")}</Button><Button variant="ghost" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>{t("Siguiente")}</Button></div></div>
  </div>
  <Dialog open={!!draft} onClose={()=>{if(!pending)setDraft(null);}} title={draft?.id?t("Editar acceso del equipo"):t("Crear usuario administrativo")} description={t("La contraseña la establece cada persona mediante una invitación segura por correo.")} size="large">
   {draft&&<form onSubmit={e=>{e.preventDefault();save();}}><div className="min-w-0 space-y-6">
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2"><Input required label={t("Nombre")} value={draft.firstName} onChange={e=>update({firstName:e.target.value})}/><Input required label={t("Apellido")} value={draft.paternalLastName} onChange={e=>update({paternalLastName:e.target.value})}/><Input required type="email" label={t("Correo de acceso")} disabled={!!draft.id} value={draft.email} onChange={e=>update({email:e.target.value})}/><Input type="tel" label={t("Teléfono (opcional)")} value={draft.phone} onChange={e=>update({phone:e.target.value})}/></fieldset>
    <fieldset disabled={pending||draft.id===actorId} className="space-y-4"><legend className="mb-3 font-semibold">{t("Nivel de acceso")}</legend>
     <label className="flex items-start gap-3 rounded-xl border border-line-300 p-4"><input type="checkbox" className="mt-1 size-4 accent-orange-600" checked={draft.fullAccess} onChange={e=>update({fullAccess:e.target.checked})}/><span><span className="block text-sm font-semibold">{t("Administrador completo")}</span><span className="mt-1 block text-xs leading-5 text-navy-500">{t("Acceso a todo el sistema, incluyendo cobros, configuración y permisos de otros usuarios.")}</span></span></label>
     {!draft.fullAccess&&<><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">{draft.permissions.length===1?t("1 secciones seleccionadas"):t("{count} secciones seleccionadas",{count:draft.permissions.length})}</p><Button type="button" variant="ghost" onClick={()=>update({permissions:[...reception]})}>{t("Usar perfil de recepción")}</Button></div><div className="grid gap-3 sm:grid-cols-2">{ADMIN_SECTIONS.map(section=><label key={section.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${draft.permissions.includes(section.id)?"border-orange-400 bg-orange-50/50":"border-line-300 hover:bg-cream-50"}`}><input type="checkbox" className="mt-1 size-4 shrink-0 accent-orange-600" checked={draft.permissions.includes(section.id)} onChange={e=>update({permissions:e.target.checked?[...draft.permissions,section.id]:draft.permissions.filter(s=>s!==section.id)})}/><span><span className="block text-sm font-semibold">{t(section.label)}</span><span className="mt-1 block text-xs leading-5 text-navy-500">{t(section.description)}</span></span></label>)}</div></>}
     <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-orange-600" checked={draft.active} onChange={e=>update({active:e.target.checked})}/>{t("Usuario activo")}</label>
    </fieldset>
    {draft.id===actorId&&<p className="text-xs text-navy-500">{t("Por seguridad, no puedes reducir ni desactivar tu propio acceso.")}</p>}
   </div><div className="mt-5 border-t border-line-300 pt-4">{error&&<p role="alert" className="mb-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-3"><Button type="button" variant="ghost" disabled={pending} onClick={()=>setDraft(null)}>{t("Cancelar")}</Button><Button loading={pending}>{draft.id?t("Guardar permisos"):t("Crear y enviar invitación")}</Button></div></div></form>}
  </Dialog>
 </section>;
}
