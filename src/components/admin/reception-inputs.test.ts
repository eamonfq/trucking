import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { PaymentCapture } from "./payment-capture";
import {cloverAvailability} from '@/lib/auth/clover-actions';
import { ReceptionPrealertPicker } from "./reception-prealert-picker";
import type { Box } from "@/lib/types";
vi.mock('@/lib/auth/clover-actions',()=>({cloverAvailability:vi.fn(async()=>({enabled:false}))}));
vi.stubGlobal("React",React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return node;}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.mocked(cloverAvailability).mockReset().mockResolvedValue({enabled:false,issues:[]});});
it("keeps all six methods visible including unconfigured Clover without requiring an external cash reference",async()=>{
 const change=vi.fn();
 const node=mount(React.createElement(PaymentCapture,{value:{method:"destino",amount:"",reference:"REC-1"},onChange:change,total:45}));
 expect(node.querySelector('input[type="file"]')).toBeNull();
 expect(node.querySelector('[name="paymentReference"]')).toBeNull();
 expect(node.querySelectorAll('input[type="radio"]')).toHaveLength(6);
 expect(node.querySelector<HTMLInputElement>('input[value="clover"]')?.disabled).toBe(true);
 act(()=>node.querySelector<HTMLInputElement>('input[value="tarjeta"]')!.click());
 expect(change).toHaveBeenCalledWith({method:"tarjeta",amount:"",reference:""});
 expect(node.textContent).toContain("Pendiente de pago en destino");
 await act(async()=>{});
});
it('explains missing Clover configuration and enables the method after rechecking',async()=>{
 vi.mocked(cloverAvailability).mockResolvedValueOnce({enabled:false,issues:['Activa CLOVER_ENABLED=true.','Falta CLOVER_MERCHANT_ID en el proceso del servidor.']}).mockResolvedValueOnce({enabled:true,environment:'production',issues:[]});
 const change=vi.fn();const node=mount(React.createElement(PaymentCapture,{value:{method:'destino',amount:'',reference:''},onChange:change,total:45}));await act(async()=>{});
 expect(node.textContent).toContain('CLOVER_ENABLED=true');expect(node.textContent).toContain('CLOVER_MERCHANT_ID');expect(node.querySelector<HTMLInputElement>('input[value="clover"]')?.disabled).toBe(true);
 await act(async()=>node.querySelector<HTMLButtonElement>('button')!.click());
 const radio=node.querySelector<HTMLInputElement>('input[value="clover"]')!;expect(radio.disabled).toBe(false);expect(node.querySelector('#clover-availability')).toBeNull();act(()=>radio.click());expect(change).toHaveBeenCalledWith({method:'clover',amount:'',reference:''});
});
it('shows a recoverable error instead of hiding Clover when the server query fails',async()=>{
 vi.mocked(cloverAvailability).mockRejectedValueOnce(new Error('connection lost'));
 const node=mount(React.createElement(PaymentCapture,{value:{method:'efectivo',amount:'',reference:''},onChange:vi.fn(),total:45}));await act(async()=>{});
 expect(node.querySelector('input[value="clover"]')).not.toBeNull();expect(node.textContent).toContain('No se pudo consultar Clover');expect(node.textContent).toContain('Volver a verificar');
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
