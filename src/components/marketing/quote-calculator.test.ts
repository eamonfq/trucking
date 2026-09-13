import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {QuoteCalculator} from "./quote-calculator";
import {BOX_CATEGORIES} from "@/lib/config/box-categories";
import {DEFAULT_WEIGHT_PRICING} from "@/lib/utils/billing";
vi.stubGlobal("React",React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
let root:ReturnType<typeof createRoot>|undefined;
let node:HTMLDivElement;
afterEach(()=>{if(root)act(()=>root!.unmount());node?.remove();});
function mount(){
 node=document.createElement("div");document.body.append(node);root=createRoot(node);
 act(()=>root!.render(React.createElement(QuoteCalculator,{rates:[...BOX_CATEGORIES],weightPricing:DEFAULT_WEIGHT_PRICING,client:true})));
}
function measurements(values:number[]){
 act(()=>node.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach((input,index)=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,String(values[index]));
  input.dispatchEvent(new Event("input",{bubbles:true}));
 }));
}
it("matches reception dimensional billing and rounds the greater weight up",()=>{
 mount();measurements([10,10,10,50.2]);
 expect(node.textContent).toContain("163.20");
 expect(node.textContent).toContain("19.00 lb");
 expect(node.textContent).toContain("51 lb");
 expect(node.querySelector("a")?.getAttribute("href")).toBe("/cliente/soporte");
});
it("keeps fixed pricing and accepts oversized cargo for weight estimates",()=>{
 mount();measurements([30,30,30,50]);
 expect(node.textContent).toContain("1,641.60");
 act(()=>node.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click());
 expect(node.textContent).toContain("no significa que la carga sea rechazada");
 measurements([10,16,12,20]);
 expect(node.textContent).toContain("80.00");
});
it("does not invent a price for special cargo or incomplete measurements",()=>{
 mount();expect(node.textContent).toContain("Ingresa las dimensiones");
 act(()=>node.querySelectorAll<HTMLInputElement>('input[type="radio"]')[2].click());
 expect(node.textContent).toContain("Por cotizar");
 expect(node.querySelectorAll('input[type="number"]')).toHaveLength(0);
 expect(node.textContent).toContain("maquinaria");
});
