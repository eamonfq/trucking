import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {PushSettings} from './push-settings';
import {pushSettings,subscribePush} from '@/lib/auth/push-actions';
vi.mock('@/lib/auth/push-actions',()=>({pushSettings:vi.fn(async()=>({publicKey:'public-key',active:false})),subscribePush:vi.fn(async()=>({ok:true})),unsubscribePush:vi.fn(async()=>({ok:true}))}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
let root:ReturnType<typeof createRoot>,node:HTMLDivElement;
afterEach(()=>{act(()=>root?.unmount());node?.remove();vi.restoreAllMocks();vi.unstubAllGlobals();});
it('requests permission only after a click and persists the browser subscription',async()=>{
 vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);vi.stubGlobal('isSecureContext',true);vi.stubGlobal('PushManager',class {});
 const requestPermission=vi.fn(async()=> 'granted');vi.stubGlobal('Notification',{permission:'default',requestPermission});
 const subscribe=vi.fn(async()=>({toJSON:()=>({endpoint:'https://fcm.googleapis.com/test',keys:{}})}));
 vi.stubGlobal('navigator',{serviceWorker:{getRegistration:async()=>({active:true,pushManager:{getSubscription:async()=>null,subscribe}})}});
 node=document.createElement('div');document.body.append(node);root=createRoot(node);await act(async()=>root.render(<PushSettings/>));
 expect(pushSettings).toHaveBeenCalled();expect(requestPermission).not.toHaveBeenCalled();await act(async()=>node.querySelector('button')!.click());expect(requestPermission).toHaveBeenCalledOnce();expect(subscribe).toHaveBeenCalledWith({userVisibleOnly:true,applicationServerKey:'public-key'});expect(subscribePush).toHaveBeenCalled();expect(node.textContent).toContain('Desactivar avisos');
});
