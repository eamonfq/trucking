import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentCapture } from "./payment-capture";
import { ReceptionPrealertPicker } from "./reception-prealert-picker";
import type { Box } from "@/lib/types";
vi.stubGlobal("React",React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return node;}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}});
it("generates internal folios and exposes five methods without requiring an external cash reference",()=>{
 const change=vi.fn();
 const node=mount(React.createElement(PaymentCapture,{value:{method:"destino",amount:"",reference:"REC-1"},onChange:change,total:45}));
 expect(node.querySelector('input[type="file"]')).toBeNull();
 expect(node.querySelector('[name="paymentReference"]')).toBeNull();
 expect(node.querySelectorAll('input[type="radio"]')).toHaveLength(5);
 act(()=>node.querySelector<HTMLInputElement>('input[value="tarjeta"]')!.click());
 expect(change).toHaveBeenCalledWith({method:"tarjeta",amount:"",reference:""});
 expect(node.textContent).toContain("Pendiente de pago en destino");
});
it("explains that there are no pending prealerts instead of showing an empty select",()=>{
 const node=mount(React.createElement(ReceptionPrealertPicker,{items:[],value:"",onChange:vi.fn(),disabled:false,busy:false}));
 expect(node.querySelector("select")).toBeNull();
 expect(node.textContent).toContain("no tiene prealertas pendientes");
});
it("lists tracking and prealert details and selects the existing package code",()=>{
 const box={id:"p1",code:"BX-123",userId:"u1",categoryId:"small",status:"pre-alertada",dimensions:{length:10,width:16,height:12},weightLb:0,timeline:[],originTracking:"TRACK-123",prealertDetails:{store:"Tienda",description:"Ropa",declaredValue:20}} as Box;
 const change=vi.fn();
 const node=mount(React.createElement(ReceptionPrealertPicker,{items:[box],value:"",onChange:change,disabled:false,busy:false}));
 expect(node.textContent).toContain("TRACK-123");
 expect(node.textContent).toContain("Tienda");
 act(()=>node.querySelectorAll<HTMLInputElement>('input[type="radio"]')[1].click());
 expect(change).toHaveBeenCalledWith("p1");
});
