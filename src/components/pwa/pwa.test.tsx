import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import manifest from '@/app/manifest';
import {PwaProvider} from './pwa-provider';
import {AppPromotion} from './app-promotion';
vi.mock('@/lib/auth/push-actions',()=>({pushSettings:vi.fn(async()=>({publicKey:null,active:false})),subscribePush:vi.fn(),unsubscribePush:vi.fn()}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
let root:ReturnType<typeof createRoot>,node:HTMLDivElement;
beforeEach(()=>{vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));node=document.createElement('div');document.body.append(node);root=createRoot(node);});
afterEach(()=>{act(()=>root.unmount());node.remove();vi.restoreAllMocks();});
function render(compact=false){act(()=>root.render(<PwaProvider><AppPromotion compact={compact}/></PwaProvider>));}
it('offers honest manual instructions when native installation is unavailable',()=>{render();expect(node.textContent).toContain('Cómo instalar');expect(node.textContent).toContain('Requiere conexión');expect(node.textContent).toContain('Safari');expect(node.querySelector('button')).toBeNull();});
it('prompts only on user click and handles dismissal without claiming installation',async()=>{render();const prompt=vi.fn(async()=>{});const event=Object.assign(new Event('beforeinstallprompt',{cancelable:true}),{prompt,userChoice:Promise.resolve({outcome:'dismissed'})});act(()=>window.dispatchEvent(event));expect(event.defaultPrevented).toBe(true);expect(prompt).not.toHaveBeenCalled();await act(async()=>node.querySelector('button')!.click());expect(prompt).toHaveBeenCalledOnce();expect(node.textContent).toContain('más adelante');expect(node.textContent).not.toContain('App instalada');act(()=>window.dispatchEvent(new Event('appinstalled')));expect(node.textContent).toContain('App instalada');expect(node.querySelector('details')).toBeNull();});
it('does not offer reinstall in standalone mode',()=>{vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));render();expect(node.textContent).toContain('App instalada');expect(node.querySelector('details')).toBeNull();});
it('ships install icons and never caches private data or replays POST requests',()=>{const m=manifest();expect(m.start_url).toBe('/cliente');expect(m.display).toBe('standalone');for(const icon of m.icons!)expect(readFileSync('public'+icon.src).length).toBeGreaterThan(100);const sw=readFileSync('public/sw.js','utf8');expect(sw).toContain("event.request.method!=='GET'");expect(sw).not.toContain('caches.');expect(sw).not.toContain('sync');});
