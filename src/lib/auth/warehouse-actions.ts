"use server";
import { WAREHOUSE_KINDS, warehouseSupports } from "@/lib/config/warehouses";
import { z } from "zod";
import { runMutation } from "@/lib/db/mutation";
import { withStore } from "@/lib/db/store";
import { boxes, trucks, users, warehouses, shipments, notifications } from "@/lib/db/collections";
import { requireAdminUser, requireWarehouseUser } from "./actions";
import { sql, audit, revokeSessions } from "./repository";
import { hashPassword, randomToken } from "./crypto";
import { sendAccountLink } from "./account-email";
import { mexicanPhoneSchema } from "@/lib/schemas/address";
import { prealertSchema } from "@/lib/schemas/logistics";
import { configService } from "@/lib/services/config";
import { sendEmail, siteUrl } from "@/lib/services/email";
import { transitionBox, transitionShipment } from "@/lib/domain/state-machine";
import { assignBoxToTruck } from "./admin-actions";
import type { Box, WarehouseGrant } from "@/lib/types";

async function notifyClient(userId: string, title: string, body: string) {
  notifications.unshift({id:crypto.randomUUID(),userId,title,body,createdAt:new Date().toISOString(),read:false});
  const user=users.find(item=>item.id===userId);
  if(user) await sendEmail({to:user.email,subject:title,heading:title,body,actionLabel:"Ver mis paquetes",actionUrl:siteUrl()+"/cliente/cajas"});
}

export async function saveAdminPrealert(input: unknown, id?: string) {
  return runMutation("admin:prealertas",async()=>{
    const parsed=prealertSchema.extend({userId:z.string().min(1)}).safeParse(input);
    if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message ?? "Revisa la prealerta."};
    const data=parsed.data;
    const user=users.find(item=>item.id===data.userId&&item.role==="cliente"&&item.active);
    const category=(await configService.getRateTable()).find(item=>item.id===data.estimatedCategory);
    if(!user||!category)return {ok:false as const,error:"Selecciona cliente activo y categoría vigente."};
    const existing=id?boxes.find(item=>item.id===id):undefined;
    if(id&&(!existing||existing.status!=="pre-alertada"))return {ok:false as const,error:"Solo puedes editar o reasignar prealertas no recibidas."};
    const tracking=data.tracking.trim();
    if(boxes.some(item=>item.id!==id&&item.originTracking?.toLowerCase()===tracking.toLowerCase()))return {ok:false as const,error:"Ese tracking ya existe."};
    const actor=await requireAdminUser(["prealertas"]), at=new Date().toISOString();
    const previousUser=existing?.userId;
    const box:Box={id:existing?.id??crypto.randomUUID(),code:existing?.code??`BX-${crypto.randomUUID().slice(0,8).toUpperCase()}`,userId:user.id,categoryId:category.id,categoryName:category.name,status:"pre-alertada",dimensions:{...category.dimensions},weightLb:0,originTracking:tracking,prealertDetails:{store:data.store,description:data.description,declaredValue:data.declaredValue},timeline:[...(existing?.timeline??[]),{from:existing?.status??null,to:"pre-alertada",actor:actor.id,at,note:`${data.store}: ${data.description}. Valor declarado USD ${data.declaredValue}. Asignada a ${user.lockerCode}.`}]};
    if(existing)boxes[boxes.findIndex(item=>item.id===id)]=box;else boxes.push(box);
    if(previousUser&&previousUser!==user.id)await notifyClient(previousUser,"Prealerta reasignada",`Operaciones corrigió la asignación de ${box.code}. Ya no está vinculada a tu cuenta.`);
    await notifyClient(user.id,"Prealerta asignada",`${box.code} · tracking ${tracking}. Operaciones registró o actualizó tu prealerta.`);
    return {ok:true as const,box};
  });
}

export async function selectPrealertAtWarehouse(boxId:string,userId:string) {
  return runMutation("admin:recepcion",async()=>{
    const box=boxes.find(item=>item.id===boxId&&item.userId===userId&&item.status==="pre-alertada");
    if(!box)return {ok:false as const,error:"La prealerta ya no está disponible para este cliente."};
    if(box.prealertSelection)return {ok:true as const};
    const actor=await requireAdminUser(["recepcion"]);
    box.prealertSelection={actorId:actor.id,at:new Date().toISOString()};
    await notifyClient(box.userId,"Prealerta seleccionada en recepción",`El equipo seleccionó ${box.code} (tracking ${box.originTracking}) para revisar su recepción. La confirmación física se notificará por separado.`);
    return {ok:true as const};
  });
}

const warehouseSchema=z.object({kind:z.enum(WAREHOUSE_KINDS).default("destino"),country:z.string().trim().max(80).optional(),state:z.string().trim().max(80).optional(),address:z.string().trim().max(300).optional(),id:z.string().optional(),name:z.string().trim().min(2).max(100),city:z.string().trim().min(2).max(80),active:z.boolean(),arrivalMessage:z.string().trim().min(10).max(300)});
export async function saveWarehouse(input:unknown) {
  return runMutation("admin:almacenes",async()=>{
    const parsed=warehouseSchema.safeParse(input);if(!parsed.success)return {ok:false as const,error:"Revisa el nombre, ciudad y mensaje de llegada."};
    const data=parsed.data,existing=warehouses.find(item=>item.id===data.id);
    if(data.id&&!existing)return {ok:false as const,error:"El almacén no existe."};
    if(existing&&(existing.kind??"destino")!==data.kind&&(trucks.some(t=>t.originWarehouseId===existing.id||t.stops?.some(s=>s.warehouseId===existing.id))||boxes.some(b=>b.originWarehouseId===existing.id||b.destinationWarehouseId===existing.id)))return {ok:false as const,error:"El tipo de un almacén con movimientos debe conservarse. Crea otra ubicación o revisa sus vínculos antes de cambiarlo."};
    if(existing&&existing.city!==data.city&&trucks.some(truck=>truck.stops?.some(stop=>stop.warehouseId===existing.id)))return {ok:false as const,error:"Un almacén con viajes asociados debe conservar su ciudad."};
    if(existing&&!data.active&&trucks.some(truck=>truck.status!=="cerrado"&&(truck.originWarehouseId===existing.id||truck.stops?.some(stop=>stop.warehouseId===existing.id))))return {ok:false as const,error:"Hay viajes abiertos para este almacén. Finalízalos antes de desactivarlo."};
    const value={...data,id:existing?.id??crypto.randomUUID()};
    if(existing)Object.assign(existing,value);else warehouses.push(value);
    if(warehouseSupports(value,"destino")){
      const flow=await configService.getFlowConfig();
      if(!flow.destinationCities.includes(value.city))await configService.updateFlowConfig({destinationCities:[...flow.destinationCities,value.city]});
    }
    await audit((await requireAdminUser(["almacenes"])).id,"warehouse.updated");
    return {ok:true as const,warehouse:value};
  });
}

const grantSchema=z.array(z.object({warehouseId:z.string(),receive:z.boolean(),viewContacts:z.boolean()})).max(100);
export async function saveWarehouseOperator(input:unknown) {
  return runMutation("admin:almacenes",async()=>{
    const parsed=z.object({id:z.string().optional(),firstName:z.string().trim().min(2),paternalLastName:z.string().trim().min(2),email:z.email(),phone:z.union([mexicanPhoneSchema,z.literal("")]).default(""),active:z.boolean(),grants:grantSchema}).safeParse(input);
    if(!parsed.success)return {ok:false as const,error:parsed.error.issues[0]?.message??"Revisa el operador."};
    const data=parsed.data;
    if(new Set(data.grants.map(g=>g.warehouseId)).size!==data.grants.length||data.grants.some(g=>!warehouses.some(w=>w.id===g.warehouseId)))return {ok:false as const,error:"Revisa los almacenes asignados."};
    let user=data.id?users.find(item=>item.id===data.id&&item.role==="operador"):undefined;
    if(data.id&&!user)return {ok:false as const,error:"El operador no existe."};
    if(user&&user.email.toLowerCase()!==data.email.toLowerCase())return {ok:false as const,error:"El correo de acceso se conserva; crea una nueva cuenta para otro operador."};
    if(!user){
      if(users.some(item=>item.email.toLowerCase()===data.email.toLowerCase()))return {ok:false as const,error:"Ya existe una cuenta con ese correo."};
      const id=crypto.randomUUID();
      await sql().execute("INSERT INTO accounts(user_id,email,password_hash,role,active) VALUES (?,?,?,'operador',?)",[id,data.email.toLowerCase(),await hashPassword(randomToken()),data.active]);
      user={id,role:"operador",firstName:data.firstName,paternalLastName:data.paternalLastName,email:data.email.toLowerCase(),phone:data.phone,active:data.active,lockerCode:"",internalNotes:[],activity:[],warehouseGrants:data.grants};
      users.push(user);await sendAccountLink(user,"invite");
    } else {
      Object.assign(user,{firstName:data.firstName,paternalLastName:data.paternalLastName,phone:data.phone,active:data.active,warehouseGrants:data.grants});
      await sql().execute("UPDATE accounts SET active=? WHERE user_id=?",[data.active,user.id]);
      await revokeSessions(user.id);
    }
    await audit((await requireAdminUser(["almacenes"])).id,"warehouse.operator.permissions");
    return {ok:true as const};
  });
}

export async function getWarehouseAdministration() {
  await requireAdminUser(["almacenes"]);
  return withStore(async()=>({warehouses:[...warehouses],operators:users.filter(user=>user.role==="operador").map(({id,firstName,paternalLastName,email,phone,active,warehouseGrants})=>({id,firstName,paternalLastName,email,phone,active,warehouseGrants}))}));
}

export async function getOperationalLocations() {
  await requireAdminUser(["recepcion","facturas","camiones","entregas"]);
  return withStore(async()=>({warehouses:structuredClone([...warehouses])}));
}

function can(grants:WarehouseGrant[]|undefined,id:string,permission:"receive"|"viewContacts") { return grants?.some(g=>g.warehouseId===id&&g[permission])??false; }
export async function getOriginInventory() {
  const actor=await requireWarehouseUser();
  return withStore(async()=>{
    const allowed=warehouses.filter(w=>w.active&&warehouseSupports(w,"origen")&&(actor.role==="admin"||actor.warehouseGrants?.some(g=>g.warehouseId===w.id&&(g.receive||g.viewContacts))));
    return allowed.map(w=>({id:w.id,name:w.name,boxes:boxes.filter(b=>b.originWarehouseId===w.id).map(b=>{
      const user=users.find(u=>u.id===b.userId);
      return {id:b.id,code:b.code,status:b.status,dimensions:b.dimensions,weightLb:b.weightLb,customer:user&&(actor.role==="admin"||can(actor.warehouseGrants,w.id,"viewContacts"))?{name:`${user.firstName} ${user.paternalLastName}`,phone:user.phone,email:user.email}:null};
    })}));
  });
}
export async function getDestinationDesk() {
  const actor=await requireWarehouseUser();
  return withStore(async()=>{
    const allowed=warehouses.filter(w=>w.active&&warehouseSupports(w,"destino")&&(actor.role==="admin"||actor.warehouseGrants?.some(g=>g.warehouseId===w.id&&(g.receive||g.viewContacts))));
    const ids=new Set(allowed.map(w=>w.id));
    const visibleBoxes=boxes.filter(box=>box.destinationWarehouseId&&ids.has(box.destinationWarehouseId));
    return {warehouses:allowed.map(w=>({...w,canReceive:actor.role==="admin"||can(actor.warehouseGrants,w.id,"receive")})),
      trucks:trucks.filter(t=>t.stops?.some(s=>ids.has(s.warehouseId))).map(t=>({id:t.id,code:t.code,plate:t.plate,status:t.status,stops:t.stops!.filter(s=>ids.has(s.warehouseId))})),
      boxes:visibleBoxes.map(box=>{const user=users.find(u=>u.id===box.userId);return {recipient:actor.role==="admin"||can(actor.warehouseGrants,box.destinationWarehouseId!,"viewContacts")?box.recipientSnapshot?{name:box.recipientSnapshot.name,phone:box.recipientSnapshot.phone}:null:null,id:box.id,code:box.code,truckId:box.truckId,warehouseId:box.destinationWarehouseId!,status:box.status,dimensions:box.dimensions,weightLb:box.weightLb,originTracking:box.originTracking,receivedAt:box.unloadScan?.at,customer:actor.role==="admin"||can(actor.warehouseGrants,box.destinationWarehouseId!,"viewContacts")?user?{name:`${user.firstName} ${user.paternalLastName}`,email:user.email,phone:user.phone,lockerCode:user.lockerCode}:null:null};})};
  });
}

export async function scanLoad(truckId:string,code:string,warehouseId:string) {
  return runMutation("admin:camiones",async()=>{
    if(!trucks.some(t=>t.id===truckId&&t.stops?.length))return {ok:false as const,error:"Configura las paradas y fechas del viaje antes de cargar."};
    const box=boxes.find(b=>b.code===code.trim().toUpperCase());
    if(!box)return {ok:false as const,error:"Código de paquete no encontrado."};
    const result=await assignBoxToTruck(truckId,box.id,{code:code.trim().toUpperCase(),warehouseId});
    if(result.ok)await notifyClient(box.userId,"Paquete cargado",`${box.code} fue escaneado al ingresar al camión ${result.truck.code}. Destino: ${warehouses.find(w=>w.id===warehouseId)?.name}.`);
    return result;
  });
}

export async function scanUnload(truckId:string,warehouseId:string,code:string) {
  return runMutation("operador",async()=>{
    const actor=await requireWarehouseUser();
    const warehouse=warehouses.find(w=>w.id===warehouseId&&w.active&&warehouseSupports(w,"destino"));
    if(!warehouse||(actor.role!=="admin"&&!can(actor.warehouseGrants,warehouseId,"receive")))return {ok:false as const,error:"No tienes permiso de recepción en este almacén."};
    const truck=trucks.find(t=>t.id===truckId&&t.stops?.some(s=>s.warehouseId===warehouseId));
    if(!truck||!["despachado","en-frontera","en-destino"].includes(truck.status))return {ok:false as const,error:"Selecciona un camión despachado que visite este almacén."};
    const box=boxes.find(b=>b.code===code.trim().toUpperCase()&&b.truckId===truckId&&b.destinationWarehouseId===warehouseId&&truck.boxIds.includes(b.id));
    if(!box)return {ok:false as const,error:"El paquete no corresponde a este camión y almacén."};
    if(box.unloadScan)return {ok:false as const,error:"Este paquete ya fue descargado; no se duplicó el evento."};
    if(box.status!=="en-transito")return {ok:false as const,error:"El paquete no está en tránsito."};
    const at=new Date().toISOString();
    const note=warehouse.arrivalMessage.replaceAll("{almacen}",warehouse.name).replaceAll("{destino}",warehouse.city).replaceAll("{codigo}",box.code);
    const changed=transitionBox(box,"en-destino",{actor:actor.id,at,note});
    if(!changed.ok)return changed;
    Object.assign(box,changed.value,{unloadScan:{at,actorId:actor.id,warehouseId}});
    const shipment=shipments.find(s=>s.id===box.shipmentId);
    if(shipment&&shipment.status==="en-transito"&&shipment.boxIds.every(id=>boxes.some(b=>b.id===id&&["en-destino","entregada"].includes(b.status)))){
      const next=transitionShipment(shipment,"en-destino",{actor:actor.id,at,note:`Paquetes recibidos en ${warehouse.name}, ${warehouse.city}.`});if(next.ok)Object.assign(shipment,next.value);
    }
    if(truck.boxIds.every(id=>boxes.some(b=>b.id===id&&b.unloadScan))&&truck.status!=="en-destino"){
      truck.timeline.push({from:truck.status,to:"en-destino",actor:actor.id,at,note:"Todas las descargas del viaje fueron confirmadas por escaneo."});truck.status="en-destino";
    }
    await notifyClient(box.userId,`Paquete recibido en ${warehouse.name}`,note);
    return {ok:true as const,code:box.code,message:note};
  });
}

export async function saveTruckStops(truckId:string,input:unknown,originWarehouseId?:string) {
  return runMutation("admin:camiones",async()=>{
    const truck=trucks.find(t=>t.id===truckId);
    if(!truck||!["planificado","cargando"].includes(truck.status))return {ok:false as const,error:"Solo puedes cambiar paradas antes del despacho."};
    const origins=warehouses.filter(w=>w.active&&warehouseSupports(w,"origen"));
    const selectedOrigin=originWarehouseId||truck.originWarehouseId||(origins.length===1?origins[0].id:undefined);
    const origin=origins.find(w=>w.id===selectedOrigin);
    if(origins.length&&!origin)return {ok:false as const,error:"Selecciona un almacén de origen activo."};
    if(selectedOrigin&&!origin)return {ok:false as const,error:"El almacén de salida no está habilitado como origen."};
    if(truck.boxIds.length&&truck.originWarehouseId!==origin?.id)return {ok:false as const,error:"Retira la carga antes de cambiar el origen del viaje."};
    const parsed=z.array(z.object({warehouseId:z.string(),arrivalDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v)})).min(1).max(100).safeParse(input);
    if(!parsed.success)return {ok:false as const,error:"Agrega al menos un almacén con una fecha válida."};
    if(new Set(parsed.data.map(s=>s.warehouseId)).size!==parsed.data.length)return {ok:false as const,error:"No repitas un almacén en la misma ruta."};
    if(parsed.data.some((s,i)=>!warehouses.some(w=>w.id===s.warehouseId&&w.active&&warehouseSupports(w,"destino")&&w.id!==origin?.id)||s.arrivalDate<truck.departureDate||(i>0&&s.arrivalDate<parsed.data[i-1].arrivalDate)))return {ok:false as const,error:"Selecciona almacenes de destino activos, diferentes del origen, y fechas ordenadas posteriores a la salida."};
    if(truck.boxIds.some(id=>{const box=boxes.find(b=>b.id===id);return !box?.destinationWarehouseId||!parsed.data.some(s=>s.warehouseId===box.destinationWarehouseId);}))return {ok:false as const,error:"Retira primero los paquetes asignados a paradas que deseas quitar."};
    truck.stops=parsed.data.map(s=>({...s,city:warehouses.find(w=>w.id===s.warehouseId)!.city}));
    truck.destinationCity=truck.stops[0].city;
    truck.originWarehouseId=origin?.id;truck.originWarehouseName=origin?.name;
    truck.route=(origin?.name??"Origen por confirmar")+" → "+truck.stops.map(s=>warehouses.find(w=>w.id===s.warehouseId)!.name+" ("+s.city+")").join(" → ");
    truck.timeline.push({from:truck.status,to:truck.status,at:new Date().toISOString(),actor:(await requireAdminUser(["camiones"])).id,note:"Paradas y fechas estimadas actualizadas."});
    return {ok:true as const,truck:{...truck}};
  });
}
