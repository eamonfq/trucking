/** Shared policy, never trust permissions supplied by a browser. */
export const ADMIN_SECTIONS = [
  {id:"resumen",label:"Resumen",href:"/admin",description:"Indicadores operativos y financieros."},
  {id:"pendientes",label:"Pendientes",href:"/admin/pendientes",description:"Pendientes de las secciones autorizadas."},
  {id:"recepcion",label:"Recepción",href:"/admin/recepcion",description:"Registrar clientes, destinatarios, paquetes y cobrar recepciones propias."},
  {id:"prealertas",label:"Prealertas",href:"/admin/prealertas",description:"Crear, editar y asignar prealertas."},
  {id:"clientes",label:"Clientes",href:"/admin/clientes",description:"Datos, contactos, direcciones y acceso de clientes."},
  {id:"bodega",label:"Bodega",href:"/admin/bodega",description:"Consultar paquetes e inventario."},
  {id:"camiones",label:"Camiones",href:"/admin/camiones",description:"Rutas, carga escaneada, despacho y manifiestos."},
  {id:"recepcion-destino",label:"Recepción en destino",href:"/admin/recepcion-destino",description:"Descarga y contactos en todos los destinos. Para un solo almacén, usa un operador de almacén."},
  {id:"entregas",label:"Entregas",href:"/admin/entregas",description:"Confirmar entregas de mercancía liquidada."},
  {id:"facturas",label:"Facturas y cobros",href:"/admin/facturas",description:"Consultar importes, cobrar y validar pagos de todos los clientes."},
  {id:"soporte",label:"Soporte",href:"/admin/soporte",description:"Atender conversaciones y solicitudes."},
  {id:"almacenes",label:"Almacenes y operadores",href:"/admin/almacenes",description:"Administrar ubicaciones y accesos de almacén."},
  {id:"correos",label:"Correos",href:"/admin/correos",description:"Consultar y gestionar comunicaciones del sistema."},
  {id:"configuracion",label:"Configuración",href:"/admin/configuracion",description:"Modificar tarifas y reglas operativas."},
] as const;
export type AdminSection = typeof ADMIN_SECTIONS[number]["id"];
export type AdminPrincipal = {role:string;active?:boolean;adminPermissions?:AdminSection[]};
export function isFullAdmin(user:AdminPrincipal|null|undefined){return !!user&&user.role==="admin"&&user.active!==false&&user.adminPermissions===undefined;}
export function canAdmin(user:AdminPrincipal|null|undefined,section:AdminSection){return isFullAdmin(user)||!!user&&user.role==="admin"&&user.active!==false&&Array.isArray(user.adminPermissions)&&user.adminPermissions.includes(section);}
export function canAnyAdmin(user:AdminPrincipal|null|undefined,sections:readonly AdminSection[]){return sections.some(section=>canAdmin(user,section));}
export function canReadInvoice(user:AdminPrincipal & {id:string},invoice:{receptionActorId?:string;userId:string}){return user.role==="cliente"?invoice.userId===user.id:canAnyAdmin(user,["facturas","resumen"])||canAdmin(user,"recepcion")&&invoice.receptionActorId===user.id;}
export function canCollectInvoice(user:AdminPrincipal & {id:string},invoice:{receptionActorId?:string;userId:string}){return user.role==="cliente"?invoice.userId===user.id:canAdmin(user,"facturas")||canAdmin(user,"recepcion")&&invoice.receptionActorId===user.id;}
export function adminLanding(user:AdminPrincipal){return ADMIN_SECTIONS.find(section=>canAdmin(user,section.id))?.href??"/sin-acceso";}
export function canAdminPath(user:AdminPrincipal|null|undefined,path:string){
  if(isFullAdmin(user))return true;
  const pathname=path.split(/[?#]/)[0];
  if(pathname.startsWith("/admin/cajas/"))return canAnyAdmin(user,["bodega","recepcion","clientes","camiones"]);
  const section=ADMIN_SECTIONS.find(item=>item.href===pathname||item.href!=="/admin"&&pathname.startsWith(item.href+"/"));
  return !!section&&canAdmin(user,section.id);
}
