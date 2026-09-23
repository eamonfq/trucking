import React,{act,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PhotoField} from './photo-field';
import {compressPhoto} from '@/lib/files/compress-photo';
vi.mock('@/lib/files/compress-photo',()=>({compressPhoto:vi.fn()}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const roots:Array<{node:HTMLElement;root:ReturnType<typeof createRoot>}>=[];
afterEach(()=>{for(const {node,root} of roots.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
it('signals compression, submits only the reduced image and offers camera and gallery',async()=>{
 let finish!:(file:File)=>void;
 vi.mocked(compressPhoto).mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 URL.createObjectURL=vi.fn(()=>'blob:preview');URL.revokeObjectURL=vi.fn();
 const busy=vi.fn(),changed=vi.fn();
 function Harness(){const [value,setValue]=useState<File|null>(null);return <PhotoField value={value} onChange={f=>{changed(f);setValue(f);}} onBusyChange={busy}/>;}
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);roots.push({node,root});act(()=>root.render(<Harness/>));
 expect(node.querySelector('[capture="environment"]')).toBeTruthy();expect(node.querySelector('[aria-label="Elegir foto de la galería"]')).toBeTruthy();
 const original=new File(['original'],'tablet.png',{type:'image/png'}),input=node.querySelector<HTMLInputElement>('input')!;
 Object.defineProperty(input,'files',{value:[original]});
 await act(async()=>input.dispatchEvent(new Event('change',{bubbles:true})));
 expect(busy).toHaveBeenLastCalledWith(true);expect(node.textContent).toContain('Comprimiendo');expect(changed).toHaveBeenLastCalledWith(null);
 const reduced=new File(['jpeg'],'tablet.jpg',{type:'image/jpeg'});await act(async()=>finish(reduced));
 expect(changed).toHaveBeenLastCalledWith(reduced);expect(busy).toHaveBeenLastCalledWith(false);expect(node.textContent).toContain('Lista para subir al guardar');
});
