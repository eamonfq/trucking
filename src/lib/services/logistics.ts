import "server-only";
import { addresses, recipients, boxes, invoices, notifications, shipments, supportTickets, trucks, users, drivers } from "@/lib/db/collections";
import { withStore } from "@/lib/db/store";
import { getCurrentUser, requireAdminUser } from "@/lib/auth/actions";
import {deliveryPaymentError} from "@/lib/utils/delivery-payment";
import { canAnyAdmin, canReadInvoice, isFullAdmin, type AdminSection } from "@/lib/auth/admin-permissions";
import { clone } from "./delay";
const operational:AdminSection[]=["resumen","recepcion","prealertas","clientes","bodega","camiones","entregas","facturas"];
async function all<T>(items:T[],sections:AdminSection[],adminOnly=false):Promise<T[]> {
 return withStore(async()=>{
  const user=await getCurrentUser();
  if(!user)throw new Error("No autorizado");
  if(user.role==="operador"){if(adminOnly)throw new Error("No autorizado");return [];}
  if(isFullAdmin(user))return clone(items);
  if(user.role==="admin"){
   if(items===(invoices as unknown))return clone(items.filter(item=>canReadInvoice(user,item as typeof invoices[number])));
   if(!canAnyAdmin(user,sections))return [];
   if(items===(users as unknown))return clone(items.filter(item=>(item as typeof users[number]).role==="cliente"));
   return clone(items);
  }
  if(adminOnly)throw new Error("No autorizado");
  return clone(items.filter(item=>(item as {userId?:string}).userId===user.id));
 });
}
export const logisticsService={
 getDeliveryClearance:()=>withStore(async()=>{await requireAdminUser(["entregas"]);return boxes.filter(b=>["en-destino","entregada"].includes(b.status)).map(b=>({id:b.id,blocked:deliveryPaymentError(b,invoices,boxes)}));}),
 getUsers:()=>all(users,[...operational,"soporte"],true),
 getBoxes:()=>all(boxes,operational),
 getShipments:()=>all(shipments,operational),
 getInvoices:()=>all(invoices,["facturas","resumen","recepcion"]),
 getNotifications:()=>all(notifications,["resumen"]),
 getAddresses:()=>all(addresses,["clientes","recepcion","entregas"]),
 getRecipients:()=>all(recipients,["clientes","recepcion","entregas","camiones"]),
 getDrivers:()=>all(drivers,["camiones"],true),
 getSupportTickets:()=>all(supportTickets,["soporte","resumen"]),
 getTrucks:()=>withStore(async()=>{
  const user=await getCurrentUser();
  if(!user||user.role==="operador")throw new Error("No autorizado");
  if(user.role==="admin")return canAnyAdmin(user,operational)?clone(trucks):[];
  const ids=new Set(boxes.filter(box=>box.userId===user.id).map(box=>box.truckId));
  return clone(trucks.filter(truck=>ids.has(truck.id)).map(truck=>({...truck,notes:undefined,driverName:"",driverId:"",plate:"",boxIds:truck.boxIds.filter(id=>boxes.some(box=>box.id===id&&box.userId===user.id)),timeline:truck.timeline.map(event=>({...event,actor:"A&L",note:undefined}))})));
 }),
 async getTruckById(id:string){return (await all(trucks,["camiones"],true)).find(item=>item.id===id)??null;},
 async getUserById(id:string){return (await all(users,["clientes","recepcion","bodega","camiones"],true)).find(item=>item.id===id)??null;},
 async getBoxByCode(code:string){return (await all(boxes,operational)).find(item=>item.code.toLowerCase()===code.toLowerCase())??null;},
 async getBoxById(id:string){return (await all(boxes,operational)).find(item=>item.id===id)??null;},
};
