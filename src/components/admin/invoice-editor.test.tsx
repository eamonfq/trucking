import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {InvoiceEditor} from "./invoice-editor";
import type {Invoice} from "@/lib/types";
import {correctInvoice} from "@/lib/auth/invoice-actions";
vi.mock("@/lib/auth/invoice-actions",()=>({correctInvoice:vi.fn()}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const fixture:Invoice={id:"i",number:"AL-1",userId:"c",shipmentId:"",status:"emitida",issuedAt:"2026-09-20T12:00:00.000Z",dueAt:"2026-09-25T23:59:59.000Z",lines:[{categoryId:"small",categoryName:"Small",quantity:1,unitPriceUsd:80}],insuranceUsd:0,homeDeliveryUsd:0,timeline:[]};
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
function mount(invoice=fixture){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});const saved=vi.fn();act(()=>root.render(<InvoiceEditor invoice={invoice} expected={"a".repeat(64)} locations={[{id:"w",name:"Chicago"}]} onClose={vi.fn()} onSaved={saved}/>));return {dialog:document.querySelector('[role="dialog"]')!,saved};}
const button=(node:Element,label:string)=>Array.from(node.querySelectorAll("button")).find(b=>b.textContent?.includes(label))!;
const inputFor=(node:Element,text:string)=>{
 const label=Array.from(node.querySelectorAll("label")).find(label=>label.textContent===text)!;
 return document.getElementById(label.htmlFor) as HTMLInputElement;
};
it("adds and removes editable invoice items and shows the live total",()=>{
 const {dialog}=mount();expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Eliminar partida 1"]')?.disabled).toBe(true);
 act(()=>button(dialog,"Agregar partida").click());expect(dialog.textContent).toContain("Partidas · 2");
 const input=inputFor(dialog,"Partida 2 · precio USD");
 act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"20");input.dispatchEvent(new Event("input",{bubbles:true}));});
 expect(dialog.querySelector('[aria-label="Total de factura"]')?.textContent).toContain("100.00");
 act(()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Eliminar partida 1"]')!.click());expect(dialog.querySelector('[aria-label="Total de factura"]')?.textContent).toContain("20.00");
});
it("submits a reason and revision and keeps validation errors in the editor",async()=>{
 vi.mocked(correctInvoice).mockResolvedValue({ok:false,error:"El total cambió"});
 const {dialog,saved}=mount();
 const input=inputFor(dialog,"Motivo de la corrección");
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"Corregir importe acordado");input.dispatchEvent(new Event("input",{bubbles:true}));});
 await act(async()=>dialog.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 expect(correctInvoice).toHaveBeenCalledWith(expect.objectContaining({id:"i",expected:"a".repeat(64),reason:"Corregir importe acordado"}));expect(dialog.querySelector('[role="alert"]')?.textContent).toBe("El total cambió");expect(saved).not.toHaveBeenCalled();
});
