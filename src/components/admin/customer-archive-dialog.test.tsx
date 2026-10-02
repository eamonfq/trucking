import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {CustomerArchiveDialog} from "./customer-archive-dialog";
import {previewCustomerArchive,archiveCustomerBoxes} from "@/lib/auth/customer-archive-actions";
const refresh=vi.hoisted(()=>vi.fn());
vi.mock("next/navigation",()=>({useRouter:()=>({refresh})}));
vi.mock("@/lib/auth/customer-archive-actions",()=>({previewCustomerArchive:vi.fn(),archiveCustomerBoxes:vi.fn()}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
function mount(){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});const close=vi.fn();act(()=>root.render(<CustomerArchiveDialog box={{id:"box",code:"BX-1-01"}} onClose={close}/>));return {dialog:document.querySelector('[role="dialog"]')!,close};}
const button=(node:Element,label:string)=>Array.from(node.querySelectorAll("button")).find(b=>b.textContent?.includes(label))!;
function fill(node:Element,labelText:string,value:string){const label=Array.from(node.querySelectorAll("label")).find(l=>l.textContent===labelText)!;const input=document.getElementById(label.htmlFor)!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));}
const preview={ok:true as const,count:4,reference:"BX-1",revision:"a".repeat(64),invoicesKept:4,paidInvoicesKept:4};
it("requires a preview, reason and confirmation before removing the complete reception",async()=>{
 vi.mocked(previewCustomerArchive).mockResolvedValue(preview);vi.mocked(archiveCustomerBoxes).mockResolvedValue({ok:true,archiveId:"archive"});
 const {dialog,close}=mount();expect(archiveCustomerBoxes).not.toHaveBeenCalled();
 expect(dialog.querySelector("h2")?.textContent).toBe("Retirar caja o recepción");
 await act(async()=>button(dialog,"Revisar impacto").click());expect(previewCustomerArchive).toHaveBeenCalledWith({id:"box",scope:"reception"});expect(dialog.textContent).toContain("4 factura(s) se conservan");
 expect(dialog.textContent).not.toMatch(/duplicad/i);
 expect(dialog.querySelector('input[placeholder]')?.getAttribute("placeholder")).toContain("cancelación del cliente");
 const remove=button(dialog,"Retirar del inventario");expect(remove.disabled).toBe(true);
 const body=dialog.querySelector('[data-dialog-body]')!,footer=dialog.querySelector('[data-dialog-footer]')!;
 expect(body.classList.contains("overflow-y-auto")).toBe(true);
 expect(dialog.className).toContain("max-h-[calc(100dvh-2rem)]");
 expect(footer.contains(remove)).toBe(true);expect(body.contains(remove)).toBe(false);
 expect(body.contains(dialog.querySelector('input[placeholder]'))).toBe(true);
 act(()=>{fill(dialog,"Motivo del retiro","Cancelación a solicitud del cliente");fill(dialog,"Escribe RETIRAR para confirmar","RETIRAR");});expect(remove.disabled).toBe(false);
 await act(async()=>remove.click());expect(archiveCustomerBoxes).toHaveBeenCalledWith({id:"box",scope:"reception",revision:preview.revision,reason:"Cancelación a solicitud del cliente",confirmation:"RETIRAR"});expect(close).toHaveBeenCalledOnce();expect(refresh).toHaveBeenCalledOnce();
});
it("clears the preview and confirmation when changing from reception to one package",async()=>{
 vi.mocked(previewCustomerArchive).mockResolvedValue(preview);
 const {dialog}=mount();await act(async()=>button(dialog,"Revisar impacto").click());
 act(()=>{fill(dialog,"Escribe RETIRAR para confirmar","RETIRAR");const select=dialog.querySelector("select")!;select.value="piece";select.dispatchEvent(new Event("change",{bubbles:true}));});
 expect(dialog.textContent).not.toContain("4 caja(s) se retirarán");expect(button(dialog,"Retirar del inventario")).toBeUndefined();expect(archiveCustomerBoxes).not.toHaveBeenCalled();
 await act(async()=>button(dialog,"Revisar impacto").click());expect(previewCustomerArchive).toHaveBeenLastCalledWith({id:"box",scope:"piece"});expect(button(dialog,"Retirar del inventario").disabled).toBe(true);
});
