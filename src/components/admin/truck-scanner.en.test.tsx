import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {afterEach,expect,it,vi} from 'vitest';
import {TruckRoute} from './truck-route';
import {BillOfLadingEditor} from './bill-of-lading-editor';
import {ToastProvider} from '@/components/ui/toast';
import {I18nProvider} from '@/lib/i18n/provider';
import {blankBillOfLading} from '@/lib/utils/bill-of-lading';
import type {BillOfLading} from '@/lib/schemas/bill-of-lading';
import type {Box,Truck,Warehouse} from '@/lib/types';

vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}));
vi.mock('@/lib/auth/warehouse-actions',()=>({scanLoad:vi.fn(),saveTruckStops:vi.fn()}));
vi.mock('@/lib/auth/admin-actions',()=>({transitionTruckState:vi.fn()}));
vi.mock('@/lib/auth/bill-of-lading-actions',()=>({deleteBillOfLading:vi.fn(),truckCargoForBillOfLading:vi.fn(),updateBillOfLading:vi.fn()}));
vi.mock('./camera-barcode-reader',()=>({CameraBarcodeReader:()=>null}));
vi.stubGlobal('React',React);
vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);
const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
function mount(element:React.ReactNode){
  const node=document.createElement('div');
  document.body.append(node);
  const root=createRoot(node);
  mounts.push({root,node});
  act(()=>root.render(<I18nProvider locale="en"><ToastProvider>{element}</ToastProvider></I18nProvider>));
  return node;
}
afterEach(()=>{
  for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}
  vi.clearAllMocks();
});
const truck={id:'t',code:'TR-260108',status:'cargando',departureDate:'2099-01-01',boxIds:['b'],maxWeightLb:2000,stops:[{warehouseId:'w',city:'Monterrey',arrivalDate:'2099-01-03'}]} as unknown as Truck;
const warehouses=[{id:'w',name:'Bodega Norte',city:'Monterrey',active:true,kinds:['destino']}] as unknown as Warehouse[];
const box={id:'b',code:'BX-001',weightLb:1250.5,dimensions:{length:10,width:10,height:10}} as unknown as Box;

it('shows the route and the loading station in English',()=>{
  const node=mount(<TruckRoute truck={truck} boxes={[box]} warehouses={warehouses}/>);
  expect(node.textContent).toContain('One trip, multiple destinations');
  expect(node.textContent).toContain('Add boxes to the truck');
  expect(node.textContent).toContain('Packages recorded: 1.');
  expect(node.textContent).toContain('Save route');
  const button=Array.from(node.querySelectorAll('button')).find(item=>item.textContent==='Scan boxes')!;
  expect(button).toBeTruthy();
  act(()=>button.click());
  const dialog=document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain('Scan load · TR-260108');
  expect(dialog.textContent).toContain('Packages loaded');
  expect(dialog.textContent).toContain('1,250.5 lb');
  expect(dialog.textContent).toContain('Limit: 2,000 lb · Available: 749.5 lb');
  expect(dialog.textContent).toContain('Record package');
  expect(dialog.textContent).toContain('Back to truck');
  expect(dialog.textContent).not.toMatch(/[áéíóúñ]/);
});

it('translates the Spanish parts of the bill of lading editor and keeps the VICS labels',()=>{
  const bill:BillOfLading={...blankBillOfLading({number:'BOL-260001',date:'2026-11-20'}),id:'bol',code:'BOL-260001',truckId:'t',truckCode:'TR-260108',createdAt:'2026-11-20T10:00:00.000Z',createdBy:'u',createdByName:'Ana Ruiz',updatedAt:'2026-11-20T10:00:00.000Z',updatedBy:'u',updatedByName:'Ana Ruiz'};
  const node=mount(<BillOfLadingEditor initial={bill}/>);
  expect(node.textContent).toContain('Created from truck TR-260108.');
  expect(node.textContent).toContain('Recalculate from TR-260108');
  expect(node.textContent).toContain('Carrier information (cargo)');
  expect(node.textContent).toContain('Freight charge terms');
  expect(node.textContent).toContain('Ship from (name and address)');
  expect(node.textContent).toContain('Saved · ');
  expect(node.textContent).toContain('Download PDF');
  expect(node.textContent).not.toMatch(/[áéíóúñ]/);
});
