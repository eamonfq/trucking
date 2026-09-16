import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {ReceptionRecipient} from './reception-recipient';
import {ReceptionForm} from './reception-form';
import {getReceptionContacts} from '@/lib/auth/reception-contacts';
import {upsertCustomerRecipient} from '@/lib/auth/admin-actions';
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
