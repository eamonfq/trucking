import React,{act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PackageQuantity,PackageMeasurements} from './package-batch-controls';
import {CustomerSearch} from './customer-search';
import type {User} from '@/lib/types';
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement('div');document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return node;}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}});
it('bounds the compact quantity control and increments without submitting',()=>{
 const change=vi.fn(),node=mount(<PackageQuantity value={1} onChange={change}/>);
 expect(node.querySelector<HTMLButtonElement>('[aria-label="Quitar un paquete"]')!.disabled).toBe(true);
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Agregar un paquete"]')!.click());expect(change).toHaveBeenCalledWith(2);
 expect(node.querySelector('button')!.type).toBe('button');
});
it('keeps measurements across pages and never renders a nested vertical scrolling fieldset',()=>{
 function Harness(){const [page,setPage]=useState(0);const [pieces,setPieces]=useState(Array.from({length:12},()=>({length:10,width:10,height:10,weightLb:20,customPriceUsd:30})));return <PackageMeasurements page={page} onPageChange={setPage} pieces={pieces} prices={pieces.map(()=>30)} manual onChange={(i,field,value)=>setPieces(rows=>rows.map((p,j)=>j===i?{...p,[field]:value}:p))}/>;}
 const node=mount(<Harness/>);
 expect(node.querySelectorAll('tbody tr')).toHaveLength(5);
 const input=node.querySelector<HTMLInputElement>('[aria-label="Paquete 2 · Peso (lb)"]')!;
 act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'45');input.dispatchEvent(new Event('input',{bubbles:true}));});
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Paquetes siguientes"]')!.click());expect(node.querySelector('[aria-label="Paquete 7 · Peso (lb)"]')).toBeTruthy();
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Paquetes anteriores"]')!.click());expect(node.querySelector<HTMLInputElement>('[aria-label="Paquete 2 · Peso (lb)"]')!.value).toBe('45');
});
it('shows only the compact customer summary and preserves it when a change is canceled',()=>{
 const user={id:'u',role:'cliente',active:true,firstName:'Ana',paternalLastName:'López',email:'ana@example.invalid',phone:'5512345678',lockerCode:'AL-MX-0020'} as User,change=vi.fn();
 const node=mount(<CustomerSearch users={[user]} value="u" onChange={change}/>);
 expect(node.querySelector('[role="combobox"]')).toBeNull();expect(node.textContent).toContain('Ana López');
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Cambiar cliente"]')!.click());expect(node.querySelector('[role="combobox"]')).toBeTruthy();
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Cancelar cambio de cliente"]')!.click());expect(change).not.toHaveBeenCalled();expect(node.textContent).toContain('Ana López');
});
