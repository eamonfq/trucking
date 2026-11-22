import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {afterEach,expect,it,vi} from "vitest";
import {CustomerDetail} from "./customer-detail";
import {PaymentHistory} from "./payment-history";
import {ToastProvider} from "@/components/ui/toast";
import {I18nProvider} from "@/lib/i18n/provider";
import type {Locale} from "@/lib/i18n/config";
import type {Invoice,User} from "@/lib/types";

vi.mock("next/navigation",()=>({useRouter:()=>({refresh:vi.fn(),push:vi.fn()})}));
vi.mock("@/lib/auth/admin-actions",()=>({addCustomerNote:vi.fn(),changeCustomerLocker:vi.fn(),deleteCustomerAddress:vi.fn(),deleteCustomerRecipient:vi.fn(),resetCustomerPassword:vi.fn(),toggleCustomerStatus:vi.fn(),updateCustomerProfile:vi.fn(),upsertCustomerAddress:vi.fn(),upsertCustomerRecipient:vi.fn()}));
vi.mock("@/lib/auth/customer-archive-actions",()=>({previewCustomerArchive:vi.fn(),archiveCustomerBoxes:vi.fn(),restoreCustomerBoxes:vi.fn()}));
vi.stubGlobal("React",React);vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);

const customer:User={id:"c1",role:"cliente",firstName:"Mariana",paternalLastName:"Demo",email:"mariana@example.invalid",phone:"+525500000001",lockerCode:"AL-MX-0001",active:true,
  internalNotes:[{id:"n1",body:"Prefiere entrega a domicilio.",actor:"Operaciones A&L",at:"2026-11-20T15:00:00.000Z"}],
  activity:[
    {id:"a1",type:"correccion",description:"3 caja(s) retirada(s) del inventario; restaurables. Facturas y pagos conservados. Error de registro",actor:"Ana López",at:"2026-11-20T12:00:00.000Z"},
    {id:"a2",type:"dirección",description:"Dirección agregada al expediente.",actor:"Operaciones A&L",at:"2026-11-19T12:00:00.000Z"},
    {id:"a3",type:"alta",description:"Cuenta creada y casillero asignado.",actor:"Sistema",at:"2026-11-18T12:00:00.000Z"},
  ]};
const invoice:Invoice={id:"i1",number:"AL-26-0258",userId:"c1",shipmentId:"",status:"emitida",issuedAt:"2026-11-20T12:00:00.000Z",dueAt:"2026-11-25T23:59:59.000Z",lines:[{categoryId:"small",categoryName:"Small",quantity:1,unitPriceUsd:80}],insuranceUsd:0,homeDeliveryUsd:0,timeline:[],
  payments:[{folio:"PAG-2026-000001",status:"confirmado",amountUsd:80,method:"efectivo",recordedAt:"2026-11-20T12:00:00.000Z",actorId:"a",actorName:"Ana López",customerId:"c1",invoiceId:"i1",boxIds:["b1"],boxCodes:["BX-1"]}]};

const mounts:Array<{root:ReturnType<typeof createRoot>;node:HTMLElement}>=[];
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}});
function mount(element:React.ReactNode,locale:Locale){const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(<I18nProvider locale={locale}><ToastProvider>{element}</ToastProvider></I18nProvider>));return node;}
const detail=()=><CustomerDetail initialUser={customer} initialAddresses={[]} initialRecipients={[]} boxes={[]} shipments={[]} invoices={[invoice]}/>;
const tab=(node:HTMLElement,label:string)=>act(()=>Array.from(node.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find(b=>b.textContent===label)!.click());

it("shows the customer record in English",()=>{
  const node=mount(detail(),"en");
  expect(Array.from(node.querySelectorAll('[role="tab"]')).map(b=>b.textContent)).toEqual(["Details","Addresses","Recipients","Boxes","Shipments","Invoices","Internal notes","Activity"]);
  expect(node.querySelector('[role="tablist"]')?.getAttribute("aria-label")).toBe("Customer record");
  expect(node.textContent).toContain("Active");
  expect(node.textContent).toContain("Create box");
  expect(node.textContent).toContain("Outstanding balance");
  expect(node.textContent).toContain("Boxes: 0");
  expect(node.textContent).toContain("Contact details");
  expect(node.textContent).toContain("Second last name");
  tab(node,"Invoices");
  expect(node.textContent).toContain("Account statement");
  expect(node.textContent).toContain("Nov 20, 2026");
});

it("translates stored activity and system authors at display time, keeping typed notes",()=>{
  const node=mount(detail(),"en");
  tab(node,"Activity");
  expect(node.textContent).toContain("3 box(es) removed from inventory; restorable. Invoices and payments kept. Error de registro");
  expect(node.textContent).toContain("Address added to the record.");
  expect(node.textContent).toContain("Account created and locker assigned.");
  expect(node.textContent).toContain("A&L Operations · ");
  expect(node.textContent).toContain("System · ");
  tab(node,"Internal notes");
  expect(node.textContent).toContain("Prefiere entrega a domicilio.");
  expect(node.textContent).toContain("Add internal note");
});

it("keeps the Spanish record unchanged",()=>{
  const node=mount(detail(),"es");
  expect(node.textContent).toContain("Crear caja");
  tab(node,"Actividad");
  expect(node.textContent).toContain("Dirección agregada al expediente.");
  expect(node.textContent).toContain("Operaciones A&L · ");
});

it("shows payment records with English labels and method names",()=>{
  const node=mount(<PaymentHistory invoice={invoice}/>,"en");
  expect(node.textContent).toContain("Payment numbers and transactions");
  expect(node.textContent).toContain("Payment confirmed · cash");
  expect(node.textContent).toContain("Recorded by: Ana López");
  expect(node.textContent).toContain("Shipment: Not yet assigned · Packages: BX-1");
  expect(node.textContent).toContain("Invoice: AL-26-0258 · Linked packages: 1");
});
