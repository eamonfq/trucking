import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PackageDelivery} from './package-delivery';
import {savePackageDelivery} from '@/lib/auth/package-delivery-actions';
import type {getPackageDelivery} from '@/lib/auth/package-delivery-actions';

const refresh=vi.hoisted(()=>vi.fn());
vi.mock('next/navigation',()=>({useRouter:()=>({refresh})}));
vi.mock('@/lib/auth/package-delivery-actions',()=>({savePackageDelivery:vi.fn()}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const address={id:'a',userId:'u',label:'Casa',street:'Patriotismo',exteriorNumber:'18',neighborhood:'Centro',postalCode:'49400',municipality:'Tizapán',state:'Jalisco'};
const data:NonNullable<Awaited<ReturnType<typeof getPackageDelivery>>>={revision:'a'.repeat(64),recipientId:'',recipient:{name:'Guadalupe Torres',phone:'3332388900',address:undefined},recipients:[{id:'r',userId:'u',name:'Guadalupe Torres',phone:'3332388900',addressId:'a'}],addresses:[address],canEdit:true,warehouseName:'Valle de Juárez'};
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(props=data){const node=document.createElement('div');document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(<PackageDelivery boxId="b" code="BX-208" data={props}/>));return node;}
function click(text:string){act(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===text)!.click());}
function field(label:string){const item=Array.from(document.querySelectorAll('label')).find(e=>e.textContent===label)!;return document.getElementById(item.htmlFor) as HTMLInputElement;}
function fill(label:string,value:string){act(()=>{const input=field(label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});}
function select(label:string,value:string){act(()=>{const input=field(label);input.value=value;input.dispatchEvent(new Event('change',{bubbles:true}));});}
async function submit(){await act(async()=>document.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});

it('shows an unassigned address and never silently assigns the first saved address',()=>{
 const node=mount();expect(node.textContent).toContain('No hay una dirección o referencia asignada');
 click('Asignar entrega');expect(field('Dirección de este paquete').value).toBe('new');
 expect(field('Nombre de quien recibe').value).toBe('Guadalupe Torres');
 expect(savePackageDelivery).not.toHaveBeenCalled();
});
it('selects a saved customer address and saves explicitly for this piece',async()=>{
 mount();click('Asignar entrega');select('Destinatario','r');
 expect(field('Dirección de este paquete').value).toBe('a');
 expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Patriotismo');
 fill('Motivo de asignación o corrección','Completar dirección pendiente');
 vi.mocked(savePackageDelivery).mockResolvedValue({ok:true});await submit();
 expect(savePackageDelivery).toHaveBeenCalledWith('b',expect.objectContaining({revision:data.revision,recipientId:'r',addressId:'a',newAddress:undefined}));
 expect(document.querySelector('[role="dialog"]')).toBeNull();expect(refresh).toHaveBeenCalledOnce();
 expect(document.body.textContent).toContain('Reimprime la etiqueta');
});
it('accepts a pickup reference without requiring a full address and preserves failures',async()=>{
 mount();click('Asignar entrega');fill('Nombre de bodega o referencia de entrega','Bodega Valle de Juárez');fill('Motivo de asignación o corrección','Retiro acordado con cliente');
 expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('Código postal');
 vi.mocked(savePackageDelivery).mockResolvedValue({ok:false,error:'El paquete cambió.'});await submit();
 expect(savePackageDelivery).toHaveBeenCalledWith('b',expect.objectContaining({addressId:'',newAddress:expect.objectContaining({label:'Bodega Valle de Juárez',street:'',state:''})}));
 expect(document.querySelector('[role="alert"]')?.textContent).toContain('El paquete cambió');expect(field('Nombre de bodega o referencia de entrega').value).toBe('Bodega Valle de Juárez');
 expect(refresh).not.toHaveBeenCalled();
});
it('shows the assigned address but offers no editor to a read-only administrator',()=>{
 const node=mount({...data,recipient:{...data.recipient!,address},canEdit:false});
 expect(node.textContent).toContain('Patriotismo');expect(node.textContent).toContain('Tizapán');
 expect(node.querySelector('button')).toBeNull();
});
