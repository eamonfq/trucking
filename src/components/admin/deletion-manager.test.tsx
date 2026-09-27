import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,it,expect,vi} from "vitest";
import {DeletionManager} from "./deletion-manager";
const preview=vi.hoisted(()=>vi.fn(async()=>({ok:false,error:"Cuenta protegida"})));
const remove=vi.hoisted(()=>vi.fn());
vi.mock("@/lib/auth/deletion-actions",()=>({previewDeletion:preview,deleteTestRecord:remove}));
vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
let root:ReturnType<typeof createRoot>,node:HTMLDivElement;
afterEach(()=>{act(()=>root?.unmount());node?.remove();vi.clearAllMocks();});
it("opens the selected user from staff lists, never automatically deleting",async()=>{
 node=document.createElement("div");document.body.append(node);root=createRoot(node);
 act(()=>root.render(<DeletionManager initialUserId="operator-2" data={{orders:[],people:[{kind:"user",id:"operator-1",reference:"one@example.invalid",name:"Primer operador",detail:"Operador"},{kind:"user",id:"operator-2",reference:"two@example.invalid",name:"Segundo operador",detail:"Operador"}]}}/>));
 expect(node.querySelectorAll("article")).toHaveLength(1);expect(node.textContent).toContain("Segundo operador");expect(node.textContent).not.toContain("Primer operador");
 expect(preview).not.toHaveBeenCalled();expect(remove).not.toHaveBeenCalled();
 await act(async()=>Array.from(node.querySelectorAll("button")).find(b=>b.textContent?.includes("Revisar eliminación"))!.click());
 expect(preview).toHaveBeenCalledWith({kind:"user",id:"operator-2"});expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Cuenta protegida");expect(remove).not.toHaveBeenCalled();
});
