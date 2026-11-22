import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {ReceptionForm} from './reception-form';
import {BOX_CATEGORIES} from '@/lib/config/box-categories';
import {getReceptionContacts} from '@/lib/auth/reception-contacts';
import {I18nProvider} from '@/lib/i18n/provider';
import {translateMessage} from '@/lib/i18n/translate';
import {receptionMessages} from '@/lib/i18n/messages/reception';
vi.mock('@/components/payments/clover-card-fields',()=>({CloverCardFields:()=>null}));
vi.mock('@/lib/auth/reception-contacts',()=>({getReceptionContacts:vi.fn()}));
vi.mock('@/lib/auth/admin-actions',()=>({upsertCustomerRecipient:vi.fn(),deleteCustomerRecipient:vi.fn()}));
vi.mock('@/lib/auth/file-actions',()=>({receivePackageGroup:vi.fn(),completeReceptionPayment:vi.fn()}));
vi.mock('@/lib/auth/clover-actions',()=>({cloverAvailability:vi.fn(async()=>({enabled:false,issues:[]})),prepareCloverPayment:vi.fn(),submitCloverPayment:vi.fn(),reconcileCloverPayment:vi.fn()}));
vi.mock('@/lib/auth/warehouse-actions',()=>({selectPrealertAtWarehouse:vi.fn()}));
vi.mock('@/components/ui/toast',()=>({useToast:()=>({showToast:vi.fn()})}));
vi.mock('./customer-quick-create',()=>({CustomerQuickCreate:()=>null}));
vi.mock('./customer-search',()=>({CustomerSearch:()=>null}));
vi.stubGlobal('React',React);vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}vi.clearAllMocks();});
const addr={id:'a',userId:'u',label:'Casa',street:'Reforma',exteriorNumber:'10',neighborhood:'Centro',postalCode:'49540',municipality:'Valle de Juárez',state:'Jalisco'};
const person={id:'r',userId:'u',name:'Juan Perez',phone:'5512345678',addressId:'a'};

it('shows the counter receiving screen in English when the operator chose English',async()=>{
 vi.mocked(getReceptionContacts).mockResolvedValue({recipients:[person],addresses:[addr]});
 const node=document.createElement('div');document.body.append(node);const root=createRoot(node);mounts.push({root,node});
 act(()=>root.render(<I18nProvider locale="en"><ReceptionForm users={[]} defaultCustomerId="u" rates={[...BOX_CATEGORIES]} origins={[{id:'origin',name:'El Paso'}]} excessPolicy="recargo"/></I18nProvider>));
 await act(async()=>{});
 for(const text of ['Customer and pre-alert','Who receives in Mexico','Juan Perez','Customer pre-alert','Packages and charge','Pricing method','Weight · actual pounds only','Number of packages','Payment method','Save receipt','After saving, you can print the package label.'])expect(node.textContent).toContain(text);
 expect(node.querySelector('[aria-label="Receipt total"]')).toBeTruthy();
 await act(async()=>Array.from(node.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.textContent==='Several line items · mixed cargo')!.click());
 expect(node.textContent).toContain('Line item 1');
 expect(node.textContent).toContain('Add another line item');
 expect(node.querySelector('[aria-label="Receipt line items"]')).toBeTruthy();
 expect(node.textContent).not.toMatch(/Guardar recepción|Paquetes y cobro|Quién recibe|Concepto 1/);
});

it('translates server messages for receiving, including amounts and line item errors',()=>{
 expect(translateMessage(receptionMessages,'en','El monto debe cubrir el total del grupo: USD 45.00.')).toBe('The amount must cover the group total: USD 45.00.');
 expect(translateMessage(receptionMessages,'en','Cubo: el peso excede el límite de la caja seleccionada.')).toBe('Cubo: the weight exceeds the limit of the selected box.');
 expect(translateMessage(receptionMessages,'en','Esta recepción ya se guardó con otros datos. Revisa la bodega antes de continuar.')).toBe('This receipt was already saved with different data. Check the warehouse before continuing.');
 expect(translateMessage(receptionMessages,'es','Revisa los conceptos.')).toBe('Revisa los conceptos.');
});
