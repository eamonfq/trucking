import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {PrivatePhoto} from './private-photo';
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
it('uses the authenticated route for preview and keeps the private download with retry',()=>{
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);
 try{
  act(()=>root.render(<PrivatePhoto id="photo-id" name="Recepción.jpg"/>));
  expect(node.querySelector('img')?.getAttribute('src')).toBe('/api/files/photo-id?inline=1');
  expect(node.querySelector('a[href="/api/files/photo-id"]')).toBeTruthy();
  act(()=>node.querySelector('img')!.dispatchEvent(new Event('error')));
  expect(node.querySelector('[role="alert"]')).toBeTruthy();
  act(()=>node.querySelector('button')!.click());
  expect(node.querySelector('img')).toBeTruthy();
  act(()=>node.querySelector('img')!.dispatchEvent(new Event('load')));
  expect(node.querySelector('[role="status"]')).toBeNull();
 }finally{act(()=>root.unmount());node.remove();}
});
