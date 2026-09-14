import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {WarehouseSettings} from "./warehouse-settings";
import {saveWarehouseOperator} from "@/lib/auth/warehouse-actions";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/lib/auth/warehouse-actions",()=>({saveWarehouse:vi.fn(),saveWarehouseOperator:vi.fn()}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const warehouses=Array.from({length:105},(_,i)=>({id:String(i),name:`Almacén ${i}`,city:"México",country:"México",state:"Jalisco",kind:i%2?"origen" as const:"destino" as const,active:true,arrivalMessage:"Paquete recibido en almacén."}));
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(React.createElement(WarehouseSettings,{data:{warehouses,operators:[]}})));return node;}
function click(text:string){act(()=>Array.from(document.querySelectorAll("button")).find(b=>b.textContent===text)!.click());}
function input(label:string,value:string){const field=Array.from(document.querySelectorAll("label")).find(l=>l.textContent?.includes(label))!;const el=document.getElementById(field.htmlFor) as HTMLInputElement;act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(el,value);el.dispatchEvent(new Event("input",{bubbles:true}));});}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
it("shows a paginated directory and opens forms only on demand",()=>{
 const node=mount();expect(node.querySelectorAll("article")).toHaveLength(12);expect(document.querySelector("form")).toBeNull();
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Página siguiente de Ubicaciones operativas"]')!.click());
 expect(node.textContent).toContain("13–24 de 105");
 input("Buscar almacenes","almacen 104");expect(node.querySelectorAll("article")).toHaveLength(1);expect(node.textContent).toContain("Almacén 104");
 click("Crear almacén");expect(document.querySelector('[role="dialog"] form')).toBeTruthy();click("Cancelar");expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("preserves selected permissions while searching and sends only explicit grants",async()=>{
 mount();click("Crear operador");
 const group=document.querySelector('[role="group"][aria-label="Almacén 0"]')!;
 act(()=>group.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
 input("Buscar almacén para asignar permisos","almacen 104");
 expect(document.querySelector('[role="group"][aria-label="Almacén 0"]')).toBeNull();
 input("Buscar almacén para asignar permisos","");
 expect(document.querySelector<HTMLInputElement>('[role="group"][aria-label="Almacén 0"] input')!.checked).toBe(true);
 vi.mocked(saveWarehouseOperator).mockResolvedValue({ok:false,error:"Revisa los datos"});
 await act(async()=>{document.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
 expect(saveWarehouseOperator).toHaveBeenCalledWith(expect.objectContaining({grants:[{warehouseId:"0",receive:true,viewContacts:false}]}));
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Revisa los datos");
});
