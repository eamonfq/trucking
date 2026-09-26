"use server";
import {z} from "zod";
import {ADMIN_SECTIONS, type AdminSection, isFullAdmin} from "./admin-permissions";
import {requireAdminUser} from "./actions";
import {runMutation} from "@/lib/db/mutation";
import {users} from "@/lib/db/collections";
import {withStore} from "@/lib/db/store";
import {sql,audit,findAccount,revokeSessions} from "./repository";
import {hashPassword,randomToken} from "./crypto";
import {sendAccountLink} from "./account-email";

const schema=z.object({
 id:z.string().optional(),firstName:z.string().trim().min(2).max(80),paternalLastName:z.string().trim().min(2).max(80),
 email:z.email().max(254).transform(v=>v.toLowerCase()),phone:z.string().trim().max(40).default(""),
 active:z.boolean(),fullAccess:z.boolean(),
 permissions:z.array(z.enum(ADMIN_SECTIONS.map(s=>s.id) as [AdminSection,...AdminSection[]])).max(ADMIN_SECTIONS.length),
}).refine(v=>v.fullAccess||v.permissions.length>0,{message:"Selecciona al menos una sección."});

export async function getAdministrativeStaff(){
 await requireAdminUser();
 return withStore(async()=>users.filter(u=>u.role==="admin").map(u=>({id:u.id,firstName:u.firstName,paternalLastName:u.paternalLastName,email:u.email,phone:u.phone,active:u.active,fullAccess:isFullAdmin({...u,active:true}),permissions:[...(u.adminPermissions??[])]})));
}
export async function saveAdministrativeStaff(input:unknown){
 return runMutation("admin",async()=>{
  const actor=await requireAdminUser(),parsed=schema.safeParse(input);
  if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message??"Revisa los datos."};
  const data=parsed.data;
  let user=data.id?users.find(u=>u.id===data.id&&u.role==="admin"):undefined;
  if(data.id&&!user)return {ok:false as const,error:"El usuario administrativo no existe."};
  if(user?.id===actor.id&&(!data.active||!data.fullAccess))return {ok:false as const,error:"No puedes desactivar ni reducir tu propio acceso."};
  if(user&&user.email!==data.email)return {ok:false as const,error:"El correo de acceso se conserva. Crea otra cuenta si necesitas cambiarlo."};
  if(user&&isFullAdmin(user)&&(!data.active||!data.fullAccess)&&users.filter(u=>isFullAdmin(u)).length<=1)return {ok:false as const,error:"Debe quedar al menos un administrador completo activo."};
  const created=!user;
  if(!user){
   if(await findAccount(data.email)||users.some(u=>u.email.toLowerCase()===data.email))return {ok:false as const,error:"Ya existe una cuenta con este correo."};
   const id=crypto.randomUUID();
   await sql().execute("INSERT INTO accounts(user_id,email,password_hash,role,active) VALUES (?,?,?,'admin',?)",[id,data.email,await hashPassword(randomToken()),data.active]);
   user={id,role:"admin",firstName:data.firstName,paternalLastName:data.paternalLastName,email:data.email,phone:data.phone,active:data.active,lockerCode:"",internalNotes:[],activity:[]};
   users.push(user);
  }
  Object.assign(user,{firstName:data.firstName,paternalLastName:data.paternalLastName,phone:data.phone,active:data.active});
  if(data.fullAccess)delete user.adminPermissions;else user.adminPermissions=[...new Set(data.permissions)];
  await sql().execute("UPDATE accounts SET active=? WHERE user_id=?",[data.active,user.id]);
  if(!created&&user.id!==actor.id)await revokeSessions(user.id);
  if(created&&user.active)await sendAccountLink(user,"invite");
  user.activity.unshift({id:crypto.randomUUID(),type:"permisos",actor:actor.id,at:new Date().toISOString(),description:data.fullAccess?"Administración completa":`Secciones: ${user.adminPermissions?.join(", ")}`});
  await audit(actor.id,`staff.permissions.updated:${user.id}`);
  return {ok:true as const,message:created?(data.active?"Usuario creado. La invitación de acceso quedó en cola.":"Usuario creado inactivo. Actívalo y envía su invitación cuando corresponda."):"Permisos guardados. Las sesiones anteriores del usuario fueron cerradas."};
 });
}
export async function inviteAdministrativeStaff(id:string){
 return runMutation("admin",async()=>{
  const actor=await requireAdminUser(),user=users.find(u=>u.id===id&&u.role==="admin"&&u.active);
  if(!user)return {ok:false as const,error:"Selecciona un usuario administrativo activo."};
  await sendAccountLink(user,"invite");await audit(actor.id,`staff.invited:${user.id}`);
  return {ok:true as const,message:"Invitación enviada a la cola de correo."};
 });
}
