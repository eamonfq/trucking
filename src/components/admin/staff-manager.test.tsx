import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,describe,it,expect,vi} from "vitest";
import {StaffManager} from "./staff-manager";
import AdminLink,{AdminAccessProvider} from "./admin-access";
const save=vi.hoisted(()=>vi.fn(async()=>({ok:true,message:"Guardado"})));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/lib/auth/staff-actions",()=>({saveAdministrativeStaff:save,inviteAdministrativeStaff:vi.fn(async()=>({ok:true,message:"Enviado"}))}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
let root:ReturnType<typeof createRoot>,node:HTMLDivElement;
function render(element:React.ReactNode){node=document.createElement("div");document.body.append(node);root=createRoot(node);act(()=>root.render(element));}
function click(text:string){act(()=>Array.from(document.querySelectorAll("button")).find(b=>b.textContent===text)!.click());}
function input(label:string,value:string){const field=Array.from(document.querySelectorAll("label")).find(l=>l.textContent===label)!;const el=document.getElementById(field.htmlFor) as HTMLInputElement;act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));});}
afterEach(()=>{act(()=>root?.unmount());node?.remove();vi.clearAllMocks();});
const staff=Array.from({length:24},(_,i)=>({id:String(i),firstName:`Persona ${i}`,paternalLastName:"Equipo",email:`equipo${i}@example.invalid`,phone:"",active:true,fullAccess:false,permissions:["recepcion"] as ("recepcion")[]}));
describe("Staff management UX",()=>{
 it("starts with a paginated searchable directory, not an open form",()=>{
  render(<StaffManager staff={staff} actorId="owner"/>);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(node.querySelectorAll("article")).toHaveLength(10);
  click("Siguiente");expect(node.textContent).toContain("Persona 10 Equipo");
  input("Buscar en el equipo","equipo23@");expect(node.querySelectorAll("article")).toHaveLength(1);
 });
 it("creates with reception permissions but without full administrative access",async()=>{
  render(<StaffManager staff={[]} actorId="owner"/>);click("Crear usuario");
  input("Nombre","Rayza");input("Apellido","Morales");input("Correo de acceso","staff@example.invalid");
  await act(async()=>{document.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  expect(save).toHaveBeenCalledWith(expect.objectContaining({fullAccess:false,permissions:["recepcion","prealertas","clientes","pendientes"]}));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
 });
 it("does not show links to unauthorized sections inside the administrative panel",()=>{
  render(<AdminAccessProvider user={{role:"admin",adminPermissions:["recepcion"]}}><AdminLink href="/admin/recepcion">Recepción</AdminLink><AdminLink href="/admin/facturas">Facturas</AdminLink><AdminLink href="/etiquetas/1">Etiqueta</AdminLink></AdminAccessProvider>);
  expect(node.querySelector('a[href="/admin/recepcion"]')).toBeTruthy();expect(node.querySelector('a[href="/admin/facturas"]')).toBeNull();expect(node.querySelector('a[href="/etiquetas/1"]')).toBeTruthy();
 });
});
