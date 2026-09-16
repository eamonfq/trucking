import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {TruckScanner} from './truck-scanner';
import {TruckRoute} from './truck-route';
import {scanLoad} from '@/lib/auth/warehouse-actions';
import {transitionTruckState} from '@/lib/auth/admin-actions';
import type {Truck,Box,Warehouse} from '@/lib/types';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
vi.mock('@/lib/auth/warehouse-actions',()=>({scanLoad:vi.fn(),saveTruckStops:vi.fn()}));
vi.mock('@/lib/auth/admin-actions',()=>({transitionTruckState:vi.fn()}));
vi.mock('./camera-barcode-reader',()=>({CameraBarcodeReader:({onRead}:{onRead:(v:string)=>void})=><button type="button" onClick={()=>onRead('BX-CAMERA')}>Simular lectura de cámara</button>}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement('div');document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return node;}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}window.history.replaceState(null,'','/');vi.clearAllMocks();});
const truck={id:'t',code:'TR-001',status:'cargando',boxIds:[],stops:[{warehouseId:'w',city:'Destino',arrivalDate:'2099-01-01'}]} as unknown as Truck;
const warehouses=[{id:'w',name:'Almacén destino'}] as Warehouse[];
const box={id:'b',code:'BX-001',weightLb:25,dimensions:{length:10,width:10,height:10}} as unknown as Box;
it('places a single visible scanner before the route form and opens it from the main action',()=>{
 const node=mount(<TruckRoute truck={truck} boxes={[]} warehouses={warehouses}/>);
 const station=node.querySelector('#carga-escaneada')!,route=node.querySelector('#ruta-del-camion')!;
 expect(node.querySelectorAll('#carga-escaneada')).toHaveLength(1);
 expect(station.compareDocumentPosition(route)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 const button=Array.from(station.querySelectorAll('button')).find(b=>b.textContent==='Escanear cajas')!;
 expect(button).toBeTruthy();act(()=>button.click());
 expect(document.querySelector('[role="dialog"] input')).toBe(document.activeElement);
});
async function scan(value:string){await act(async()=>{const input=document.querySelector<HTMLInputElement>('[role="dialog"] input')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});await act(async()=>document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
it('opens the hash directly into a focused scanner and updates physical totals after success',async()=>{
 window.history.replaceState(null,'','/#carga-escaneada');vi.mocked(scanLoad).mockResolvedValue({ok:true,truck:{...truck,boxIds:['b']},box});
 mount(<TruckScanner truck={truck} boxes={[]} warehouses={warehouses}/>);await act(async()=>{});
 expect(document.querySelector('[role="dialog"]')).toBeTruthy();expect(document.activeElement).toBe(document.querySelector('[role="dialog"] input'));
 await scan(' bx-001 ');expect(scanLoad).toHaveBeenCalledWith('t','BX-001','w');
 expect(document.querySelector('[role="dialog"]')!.textContent).toContain('25 lb');expect(document.querySelector('[role="status"]')!.textContent).toContain('BX-001 registrado');expect(document.querySelector<HTMLInputElement>('[role="dialog"] input')!.value).toBe('');
});
it('keeps errors visible and never increments the accepted history for rejected scans',async()=>{
 vi.mocked(scanLoad).mockResolvedValue({ok:false,error:'Ya está cargado.'});const node=mount(<TruckScanner truck={truck} boxes={[]} warehouses={warehouses}/>);
 act(()=>node.querySelector('button')!.click());await scan('BX-001');
 expect(document.querySelector('[role="alert"]')!.textContent).toContain('Ya está cargado');expect(document.querySelector('ul')).toBeNull();expect(document.querySelector<HTMLInputElement>('[role="dialog"] input')!.value).toBe('BX-001');
});
it('serializes submissions and keeps camera off until requested',async()=>{
 let resolve!:(v:Awaited<ReturnType<typeof scanLoad>>)=>void;vi.mocked(scanLoad).mockImplementation(()=>new Promise(r=>{resolve=r;}));
 const node=mount(<TruckScanner truck={truck} boxes={[]} warehouses={warehouses}/>);act(()=>node.querySelector('button')!.click());expect(document.body.textContent).not.toContain('Simular lectura');
 await scan('BX-001');await act(async()=>document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));expect(scanLoad).toHaveBeenCalledTimes(1);
 await act(async()=>resolve({ok:true,truck:{...truck,boxIds:['b']},box}));
});
it('starts a planned trip explicitly',async()=>{
 vi.mocked(transitionTruckState).mockResolvedValue({ok:true,truck,changedBoxes:0,changedShipments:0,generatedInvoices:[]});
 const node=mount(<TruckScanner truck={{...truck,status:'planificado'}} boxes={[]} warehouses={warehouses}/>);act(()=>node.querySelector('button')!.click());expect(document.querySelector('[role="dialog"] form')).toBeNull();
 await act(async()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Iniciar carga')!.click());expect(transitionTruckState).toHaveBeenCalledWith('t');expect(document.querySelector('[role="dialog"] form')).toBeTruthy();
});
it('blocks scans after departure',()=>{
 const node=mount(<TruckScanner truck={{...truck,status:'despachado'}} boxes={[]} warehouses={warehouses}/>);
 act(()=>node.querySelector('button')!.click());
 expect(document.querySelector('[role="dialog"]')!.textContent).toContain('La carga está cerrada');
 expect(document.querySelector('[role="dialog"] input')).toBeNull();
 expect(scanLoad).not.toHaveBeenCalled();
});
