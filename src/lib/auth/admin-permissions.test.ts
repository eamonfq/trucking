import {describe,it,expect} from "vitest";
import {ADMIN_SECTIONS,canAdmin,canAdminPath,adminLanding,isFullAdmin} from "./admin-permissions";
describe("Administrative section policy",()=>{
  const reception={role:"admin",active:true,adminPermissions:["recepcion","prealertas","clientes","pendientes"] as const};
  const staff={...reception,adminPermissions:[...reception.adminPermissions]};
  it("preserves existing full administrators",()=>{expect(isFullAdmin({role:"admin"})).toBe(true);for(const s of ADMIN_SECTIONS)expect(canAdmin({role:"admin"},s.id)).toBe(true);});
  it("does not interpret empty grants as full access",()=>{expect(isFullAdmin({role:"admin",adminPermissions:[]})).toBe(false);expect(adminLanding({role:"admin",adminPermissions:[]})).toBe("/sin-acceso");});
  it("permits assigned sections and their exact children",()=>{expect(canAdminPath(staff,"/admin/clientes/customer-id")).toBe(true);expect(canAdminPath(staff,"/admin/recepcion?customer=1")).toBe(true);expect(canAdminPath(staff,"/admin/clientes-malicioso")).toBe(false);});
  it("denies unassigned money, settings, user management and unknown routes",()=>{for(const path of ["/admin","/admin/facturas","/admin/configuracion","/admin/usuarios","/admin/edicion","/admin/desconocido"])expect(canAdminPath(staff,path)).toBe(false);});
  it("never grants warehouse operators, customers or inactive admins administrative access",()=>{for(const user of [{role:"cliente"},{role:"operador"},{role:"admin",active:false}])for(const s of ADMIN_SECTIONS)expect(canAdmin(user,s.id)).toBe(false);});
});
