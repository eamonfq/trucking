import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CameraBarcodeReader} from './camera-barcode-reader';
const decode=vi.hoisted(()=>vi.fn());
vi.mock('@zxing/browser',()=>({BrowserMultiFormatOneDReader:class{decodeFromStream=decode;}}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement('div');document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return {root,node};}
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
it('stops the stream and decoder after reading exactly one barcode',async()=>{
 const trackStop=vi.fn(),stop=vi.fn(),onRead=vi.fn(),getUserMedia=vi.fn().mockResolvedValue({getTracks:()=>[{stop:trackStop}]});
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});decode.mockResolvedValue({stop});
 mount(<CameraBarcodeReader onRead={onRead} onError={vi.fn()}/>);await act(async()=>{});
 const callback=decode.mock.calls[0][2];await act(async()=>{callback({getText:()=>"BX-001"},null,{stop});callback({getText:()=>"BX-001"},null,{stop});});
 expect(onRead).toHaveBeenCalledExactlyOnceWith('BX-001');expect(trackStop).toHaveBeenCalled();expect(stop).toHaveBeenCalled();
});
it('releases a late permission stream after the camera view has been closed',async()=>{
 const trackStop=vi.fn();let resolve!:(stream:unknown)=>void;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn(()=>new Promise(r=>{resolve=r;}))}});
 const {root}=mount(<CameraBarcodeReader onRead={vi.fn()} onError={vi.fn()}/>);await act(async()=>{});act(()=>root.render(null));await act(async()=>resolve({getTracks:()=>[{stop:trackStop}]}));
 expect(trackStop).toHaveBeenCalled();expect(decode).not.toHaveBeenCalled();
});
it('explains denied camera access without submitting any code',async()=>{
 const onRead=vi.fn(),onError=vi.fn();Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:vi.fn().mockRejectedValue(new DOMException('denied','NotAllowedError'))}});
 mount(<CameraBarcodeReader onRead={onRead} onError={onError}/>);await act(async()=>{});
 expect(onRead).not.toHaveBeenCalled();expect(onError).toHaveBeenCalledWith(expect.stringContaining('Permiso de cámara denegado'));
});
