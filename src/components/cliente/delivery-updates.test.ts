import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {ClientBoxList} from "./box-list";
import {AddressManager} from "./crud-manager";
import {conflictingDeliverySnapshots} from "@/lib/utils/recipient-snapshot";
import type {Address,Box} from "@/lib/types";
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock("@/lib/auth/client-actions",()=>({}));
vi.mock("@/components/ui/toast",()=>({useToast:()=>({showToast:vi.fn()})}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const address:Address={id:"a",userId:"u",label:"Casa México",street:"Principal",exteriorNumber:"20",neighborhood:"Centro",postalCode:"49540",municipality:"Valle de Juárez",state:"Jalisco"};
const box:Box={id:"b",code:"BX-TEST",userId:"u",categoryId:"small",status:"en-bodega",dimensions:{length:10,width:10,height:10},weightLb:20,timeline:[],originWarehouseName:"Chicago",receptionGroup:{id:"g",index:1,total:2},recipientId:"r",recipientSnapshot:{name:"Ana López",phone:"+525512345678",address}};
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return node;}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}});
it("shows reception numbering, origin and receiver in the client's box list",()=>{
 const node=mount(React.createElement(ClientBoxList,{boxes:[box],rates:[]}));expect(node.textContent).toContain("Pieza 1/2");expect(node.textContent).toContain("Chicago");expect(node.textContent).toContain("Ana López");expect(node.textContent).toContain("+525512345678");
});
it("paginates delivery addresses and connects to recipients",()=>{
 const node=mount(React.createElement(AddressManager,{initialItems:Array.from({length:25},(_,i)=>({...address,id:String(i),label:`Casa ${i}`}))}));expect(node.querySelectorAll("article")).toHaveLength(12);expect(node.querySelector('a[href="/cliente/destinatarios"]')).toBeTruthy();act(()=>Array.from(node.querySelectorAll("button")).find(b=>b.textContent==="Siguiente")!.click());expect(node.textContent).toContain("página 2/3");
});
it("rejects combining different historical delivery addresses",()=>{
 expect(conflictingDeliverySnapshots([box,{...box,id:"b2"}])).toBe(false);
 expect(conflictingDeliverySnapshots([box,{...box,id:"b2",recipientSnapshot:{...box.recipientSnapshot!,address:{...address,street:"Otra calle"}}}])).toBe(true);
});
