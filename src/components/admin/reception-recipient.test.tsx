import React,{act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {ReceptionRecipient} from './reception-recipient';
import {ReceptionForm} from './reception-form';
import {getReceptionContacts} from '@/lib/auth/reception-contacts';
import {upsertCustomerRecipient} from '@/lib/auth/admin-actions';
import {receivePackageGroup} from '@/lib/auth/file-actions';
vi.mock('@/lib/auth/reception-contacts',()=>({getReceptionContacts:vi.fn()}));
vi.mock('@/lib/auth/admin-actions',()=>({upsertCustomerRecipient:vi.fn(),deleteCustomerRecipient:vi.fn()}));
vi.mock('@/lib/auth/file-actions',()=>({receivePackageGroup:vi.fn()}));
vi.mock('@/lib/auth/warehouse-actions',()=>({selectPrealertAtWarehouse:vi.fn()}));
vi.mock('@/components/ui/toast',()=>({useToast:()=>({showToast:vi.fn()})}));
vi.mock('./customer-quick-create',()=>({CustomerQuickCreate:()=>null}));
vi.mock('./customer-search',()=>({CustomerSearch:({onChange}:{onChange:(id:string)=>void})=><div>{['one','two','three'].map(id=><button key={id} type="button" data-client={id} onClick={()=>onChange(id)}>{id}</button>)}</div>}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement('div');document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return {root,node};}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
const addr={id:'a',userId:'u',label:'Casa',street:'Reforma',exteriorNumber:'10',neighborhood:'Centro',postalCode:'49540',municipality:'Valle de Juárez',state:'Jalisco'};
const person={id:'r',userId:'u',name:'Juan Perez',phone:'5512345678',addressId:'a'};
it('submits equal dimensions with different weights and starts a clean next reception without refresh',async()=>{
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[person],addresses:[addr]});
 vi.mocked(receivePackageGroup).mockResolvedValue({ok:true,results:[{box:{id:'b1',status:'en-bodega'}},{box:{id:'b2',status:'en-bodega'}}],total:761.6} as never);
 const {node}=mount(<ReceptionForm users={[]} defaultCustomerId="u" rates={[]} origins={[{id:'origin',name:'Origen'}]} excessPolicy="recargo"/>);await act(async()=>{});
 await fill('length','16');await fill('width','26');await fill('height','15');await fill('weightLb','55');
 act(()=>node.querySelector<HTMLButtonElement>('[aria-label="Agregar un paquete"]')!.click());
 expect(Array.from(node.querySelectorAll('input[type="checkbox"]')).find(e=>e.closest("label")?.textContent?.includes('Confirmo el mismo peso'))).toHaveProperty('checked',false);
 await act(async()=>{const el=node.querySelector<HTMLInputElement>('[aria-label="Paquete 2 · Peso (lb)"]')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'140');el.dispatchEvent(new Event('input',{bubbles:true}));});
 await act(async()=>node.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 const batch=vi.mocked(receivePackageGroup).mock.calls[0][0] as Array<{length:number;weightLb:number}>;
 expect(batch.map(p=>p.weightLb)).toEqual([55,140]);expect(batch.map(p=>p.length)).toEqual([16,16]);
 expect(node.textContent).toContain('2 paquetes registrados');expect(node.querySelector('form')).toBeNull();
 await act(async()=>Array.from(node.querySelectorAll('button')).find(b=>b.textContent?.includes('Registrar otro paquete'))!.click());
 expect(node.querySelector<HTMLInputElement>('[name="length"]')!.value).toBe('');expect(node.querySelector<HTMLInputElement>('[name="weightLb"]')!.value).toBe('');expect(node.querySelector<HTMLInputElement>('[aria-label="Cantidad de paquetes"]')!.value).toBe('1');expect(node.textContent).toContain('Juan Perez');
});
it('defaults to the initial recipient, hides search, and lets the operator switch without overwriting the choice',async()=>{
 const second={...person,id:'second',name:'María López'};
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[person,second],addresses:[addr]});
 function Harness(){const [value,setValue]=useState('');return <ReceptionRecipient userId="u" value={value} onChange={setValue}/>;}
 const {node}=mount(<Harness/>);await act(async()=>{});
 expect(node.textContent).toContain('Juan Perez');expect(node.textContent).toContain('Principal');expect(node.textContent).toContain('Reforma 10');expect(node.querySelector('input')).toBeNull();
 act(()=>Array.from(node.querySelectorAll('button')).find(b=>b.textContent==='Cambiar destinatario')!.click());
 const dialog=document.querySelector('[role="dialog"]')!;
 act(()=>Array.from(dialog.querySelectorAll('button')).find(b=>b.textContent?.includes('María López'))!.click());
 expect(node.textContent).toContain('María López');expect(node.textContent).not.toContain('Juan Perez');expect(document.querySelector('[role="dialog"]')).toBeNull();
});
async function fill(name:string,value:string){await act(async()=>{const el=document.querySelector<HTMLInputElement>('[name="'+name+'"]')!;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
it('uses distinct sibling keys for recipients and prealerts',()=>{const source=readFileSync('src/components/admin/reception-form.tsx','utf8');expect(source).toContain('key={`recipient:${values.customer}`}');expect(source).toContain('key={`prealert:${values.customer??""}`}');});
it('keeps exactly one recipient block in the actual reception form through repeated client changes',async()=>{
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[],addresses:[]});
 const errors=vi.spyOn(console,'error');
 try{
  const {node}=mount(<ReceptionForm users={[]} rates={[]} excessPolicy="recargo"/>);
  for(const id of ['one','two','three','one','two','three']){
   await act(async()=>node.querySelector<HTMLButtonElement>('[data-client="'+id+'"]')!.click());
   expect(node.querySelectorAll('[data-testid="reception-recipient"]')).toHaveLength(1);
   expect(node.textContent?.match(/Quién recibe en México/g)).toHaveLength(1);
  }
  expect(errors.mock.calls.flat().join(' ')).not.toContain('same key');
 }finally{errors.mockRestore();}
});
it('creates recipient and new address from an empty client without submitting reception',async()=>{
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[],addresses:[]});
 vi.mocked(upsertCustomerRecipient).mockResolvedValue({ok:true,user:{} as never,recipient:person,address:addr});
 const onChange=vi.fn(),outer=vi.fn(e=>e.preventDefault());
 const {node}=mount(<form onSubmit={outer}><ReceptionRecipient userId="u" value="" onChange={onChange}/></form>);
 await act(async()=>{});expect(node.textContent).toContain('todavía no tiene destinatarios');
 act(()=>node.querySelector('button')!.click());
 await fill('recipientName',person.name);await fill('recipientPhone',person.phone);
 for(const key of ['label','street','exteriorNumber','neighborhood','postalCode','municipality','state'] as const)await fill('address-'+key,addr[key]);
 await act(async()=>{document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 expect(outer).not.toHaveBeenCalled();expect(upsertCustomerRecipient).toHaveBeenCalledWith('u',expect.objectContaining({name:person.name}),undefined,expect.objectContaining({street:'Reforma',postalCode:'49540'}));expect(onChange).toHaveBeenCalledWith('r');expect(node.textContent).toContain('guardado y seleccionado');expect(node.querySelectorAll('[data-testid="reception-recipient"]')).toHaveLength(1);
});
it('ignores stale requests after switching clients and allows retry after failure',async()=>{
 let resolve!:(v:{recipients:typeof person[];addresses:typeof addr[]})=>void;
 vi.mocked(getReceptionContacts).mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockRejectedValueOnce(new Error('offline')).mockResolvedValue({recipients:[],addresses:[]});
 const {root,node}=mount(<ReceptionRecipient userId="old" value="" onChange={vi.fn()}/>);
 await act(async()=>root.render(<ReceptionRecipient userId="new" value="" onChange={vi.fn()}/>));
 await act(async()=>resolve({recipients:[person],addresses:[addr]}));
 expect(node.textContent).not.toContain(person.name);expect(node.textContent).toContain('No se pudieron');
 await act(async()=>Array.from(node.querySelectorAll('button')).find(b=>b.textContent==='Reintentar')!.click());
 expect(node.textContent).toContain('todavía no tiene');expect(node.querySelectorAll('[data-testid="reception-recipient"]')).toHaveLength(1);
});
it('selects a saved address and keeps server validation visible in the dialog',async()=>{
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[],addresses:[addr]});vi.mocked(upsertCustomerRecipient).mockResolvedValue({ok:false,error:'Revisa el teléfono.'});
 const {node}=mount(<ReceptionRecipient userId="u" value="" onChange={vi.fn()}/>);await act(async()=>{});act(()=>node.querySelector('button')!.click());
 expect(document.querySelector('[role="dialog"]')!.textContent).toContain('Dirección guardada');
 await act(async()=>document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 expect(upsertCustomerRecipient).toHaveBeenCalledWith('u',expect.objectContaining({addressId:'a'}),undefined,undefined);
 expect(document.querySelector('[role="dialog"] [role="alert"]')!.textContent).toBe('Revisa el teléfono.');
});
it('does not select a recipient on the new client when an earlier save finishes late',async()=>{
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[],addresses:[addr]});
 let resolve!:(v:Awaited<ReturnType<typeof upsertCustomerRecipient>>)=>void;
 vi.mocked(upsertCustomerRecipient).mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const onChange=vi.fn(),{node,root}=mount(<ReceptionRecipient userId="u" value="" onChange={onChange}/>);
 await act(async()=>{});act(()=>node.querySelector('button')!.click());
 await act(async()=>{document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
 await act(async()=>root.render(<ReceptionRecipient userId="other" value="" onChange={onChange}/>));
 await act(async()=>resolve({ok:true,user:{} as never,recipient:person,address:addr}));
 expect(onChange).not.toHaveBeenCalled();expect(document.querySelector('[role="dialog"]')).toBeNull();
});
