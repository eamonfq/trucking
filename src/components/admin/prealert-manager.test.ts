import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {PrealertManager} from "./prealert-manager";
import {saveAdminPrealert} from "@/lib/auth/warehouse-actions";
import type {Box,User} from "@/lib/types";
vi.mock("next/navigation",()=>({useRouter:()=>({push:vi.fn(),refresh:vi.fn()})}));
vi.mock("@/lib/auth/warehouse-actions",()=>({saveAdminPrealert:vi.fn(),selectPrealertAtWarehouse:vi.fn()}));
vi.mock("./customer-quick-create",()=>({CustomerQuickCreate:()=>null}));
vi.mock("@/components/ui/catalog-provider",()=>({useCatalog:()=>[{id:"small",name:"Small",active:true}]}));
vi.stubGlobal("React",React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const user:User={id:"u1",role:"cliente",firstName:"Ana",paternalLastName:"López",email:"qa@example.invalid",phone:"12345678",lockerCode:"AL-001",active:true,activity:[],internalNotes:[]};
const box:Box={id:"p1",code:"BX-123",userId:user.id,status:"pre-alertada",categoryId:"small",dimensions:{length:10,width:16,height:12},weightLb:0,originTracking:"TRACK-123",prealertDetails:{store:"Tienda",description:"Zapatos",declaredValue:30},timeline:[]};
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(boxes:Box[]=[box]){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(React.createElement(PrealertManager,{users:[user],boxes})));return node;}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
it("prioritizes the list and only opens the form after Create",()=>{
 const node=mount();expect(node.textContent).toContain("TRACK-123");
 expect(document.querySelector('[role="dialog"]')).toBeNull();
 const create=Array.from(node.querySelectorAll("button")).find(b=>b.textContent==="Crear prealerta")!;
 act(()=>create.click());
 expect(document.querySelector('[role="dialog"] form')).toBeTruthy();
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Valor declarado");
 act(()=>Array.from(document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')).find(b=>b.textContent==="Cancelar")!.click());
 expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("opens an existing prealert and returns to the updated list after saving",async()=>{
 const node=mount();
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Editar prealerta BX-123"]')!.click());
 expect(Array.from(document.querySelectorAll<HTMLInputElement>('[role="dialog"] input')).some(input=>input.value==="TRACK-123")).toBe(true);
 vi.mocked(saveAdminPrealert).mockResolvedValue({ok:true,box:{...box,timeline:[{from:"pre-alertada",to:"pre-alertada",at:"2099-01-01T00:00:00Z",actor:"admin"}]}});
 await act(async()=>{document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
 expect(saveAdminPrealert).toHaveBeenCalled();
 expect(document.querySelector('[role="dialog"]')).toBeNull();
 expect(node.querySelector('[role="status"]')?.textContent).toContain("BX-123 guardada");
});
it("paginates the list instead of silently hiding records beyond 100",()=>{
 const boxes=Array.from({length:105},(_,i)=>({...box,id:String(i),code:`BX-${i}` as Box["code"]}));
 const node=mount(boxes);
 expect(node.querySelectorAll("article")).toHaveLength(20);
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Página siguiente"]')!.click());
 expect(node.textContent).toContain("21–40 de 105");
});
