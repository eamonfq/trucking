import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {CloverCheckout} from './clover-checkout';
import {prepareCloverPayment,submitCloverPayment,reconcileCloverPayment} from '@/lib/auth/clover-actions';
vi.mock('@/lib/auth/clover-actions',()=>({prepareCloverPayment:vi.fn(),submitCloverPayment:vi.fn(),reconcileCloverPayment:vi.fn()}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const nodes:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){const node=document.createElement('div');document.body.append(node);const root=createRoot(node);nodes.push({root,node});act(()=>root.render(element));return node;}
afterEach(()=>{for(const {root,node} of nodes.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
async function click(node:HTMLElement,label:string){const button=Array.from(node.querySelectorAll('button')).find(b=>b.textContent?.includes(label))!;expect(button).toBeTruthy();await act(async()=>button.click());}
const quote={ok:true as const,invoiceIds:['one','two'],amountUsd:118.56,invoiceNumbers:['INV1','INV2'],canReconcile:true,config:{publicKey:'public-test',merchantId:'merchant',sdkUrl:'https://checkout.sandbox.dev.clover.com/sdk.js',environment:'sandbox' as const}};
it('requires location before starting an administrative checkout',()=>{
 const node=mount(<CloverCheckout invoiceIds={['one']} requireLocation/>);expect(node.querySelector('button')?.disabled).toBe(true);expect(prepareCloverPayment).not.toHaveBeenCalled();
});
it('shows unavailable configuration without rendering unsafe card inputs',async()=>{
 vi.mocked(prepareCloverPayment).mockResolvedValue({ok:false,error:'Clover no está habilitado.'});const node=mount(<CloverCheckout invoiceIds={['one']}/>);await click(node,'Abrir');expect(node.textContent).toContain('no está habilitado');expect(node.querySelector('input')).toBeNull();
});
it('renders four hosted fields, confirms server total and submits only one tokenized request for the entire group',async()=>{
 const tokenize=vi.fn(async()=>({token:'clv_browser_token'}));
 const create=vi.fn((name:string,style:unknown)=>{expect(name).toMatch(/^CARD_/);expect(style).toBeTruthy();return {mount:(selector:string)=>{const frame=document.createElement('iframe');frame.title='Clover hosted field';document.querySelector(selector)!.append(frame);}};});
 window.Clover=class {elements(){return {create};}createToken=tokenize;};
 vi.mocked(prepareCloverPayment).mockResolvedValueOnce(quote).mockResolvedValue({ok:true,invoiceIds:quote.invoiceIds,invoiceNumbers:quote.invoiceNumbers,amountUsd:118.56,canReconcile:true,attempt:{id:'attempt1',status:'paid',amountUsd:118.56,chargeId:'CHARGE1'}});
 vi.mocked(submitCloverPayment).mockResolvedValue({ok:true,attempt:{id:'attempt1',status:'paid',amountUsd:118.56,chargeId:'CHARGE1'}});
 const node=mount(<CloverCheckout invoiceIds={['one']} warehouseId="warehouse1" requireLocation/>);await click(node,'Abrir');
 await act(async()=>{document.querySelector(`script[src="${quote.config.sdkUrl}"]`)!.dispatchEvent(new Event('load'));});
 expect(node.querySelectorAll('iframe')).toHaveLength(4);expect(node.textContent).toContain('118.56');expect(node.querySelector('input')).toBeNull();
 for(const [,style] of create.mock.calls)expect(style).toMatchObject({body:{margin:'0'},input:{height:'32px',lineHeight:'24px',padding:'4px 0',boxSizing:'border-box'}});
 const pay=Array.from(node.querySelectorAll('button')).find(b=>b.textContent?.includes('Pagar $'))!;expect(pay).toBeTruthy();await act(async()=>{pay.click();pay.click();});
 expect(tokenize).toHaveBeenCalledTimes(1);expect(submitCloverPayment).toHaveBeenCalledExactlyOnceWith(['one','two'],'clv_browser_token',118.56,'warehouse1');expect(node.textContent).toContain('Pago confirmado');expect(node.querySelectorAll('iframe')).toHaveLength(0);
});
it('does not offer another charge during an ambiguous result and exposes reconciliation to admins',async()=>{
 vi.mocked(prepareCloverPayment).mockResolvedValue({ok:true,invoiceIds:['one'],invoiceNumbers:['INV1'],amountUsd:50,canReconcile:true,attempt:{id:'attempt2',status:'review',amountUsd:50,chargeId:undefined}});
 const node=mount(<CloverCheckout invoiceIds={['one']}/>);await click(node,'Abrir');expect(node.textContent).toContain('No vuelvas a cobrar');expect(node.querySelectorAll('iframe')).toHaveLength(0);expect(submitCloverPayment).not.toHaveBeenCalled();expect(node.textContent).toContain('Verificar cargo con Clover');expect(reconcileCloverPayment).not.toHaveBeenCalled();
});
