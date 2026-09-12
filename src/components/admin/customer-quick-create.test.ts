import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CustomerQuickCreate } from "./customer-quick-create";
import { CustomerSearch } from "./customer-search";
import { createCustomerAtReception } from "@/lib/auth/admin-actions";
import type { User } from "@/lib/types";

vi.mock("@/lib/auth/admin-actions", () => ({createCustomerAtReception:vi.fn()}));
vi.mock("@/components/ui/toast", () => ({useToast:()=>({showToast:vi.fn()})}));
vi.stubGlobal("React",React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT",true);
const mounts: Array<{root:ReturnType<typeof createRoot>; node:HTMLElement}> = [];
function mount(element:React.ReactNode) { const node=document.createElement("div");document.body.append(node);const root=createRoot(node);mounts.push({root,node});act(()=>root.render(element));return node; }
afterEach(()=>{for(const {root,node} of mounts.splice(0)){act(()=>root.unmount());node.remove();}});

it("opens customer creation outside the reception form and prevents submit bubbling", async () => {
  const outerSubmit=vi.fn((event:React.FormEvent)=>event.preventDefault());
  const node=mount(React.createElement("form",{onSubmit:outerSubmit,"data-testid":"reception"},React.createElement(CustomerQuickCreate,{onCreated:vi.fn()})));
  act(()=>node.querySelector("button")!.click());
  const inner=document.querySelector('[role="dialog"] form')!;
  expect(inner).toBeTruthy();
  expect(node.querySelector("form form")).toBeNull();
  expect(node.contains(inner)).toBe(false);
  await act(async()=>{inner.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  expect(outerSubmit).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"] [aria-invalid="true"]')).toBeTruthy();
});

it("limits hundreds of customers to twelve results and selects with the keyboard", () => {
  const users=Array.from({length:500},(_,index)=>({id:String(index),role:"cliente",active:true,firstName:"Cliente",paternalLastName:String(index),email:`cliente${index}@example.invalid`,phone:"5512345678",lockerCode:`AL-MX-${index}`,internalNotes:[],activity:[]} as User));
  const onChange=vi.fn();
  const node=mount(React.createElement(CustomerSearch,{users,value:"",onChange}));
  const input=node.querySelector("input")!;
  act(()=>input.focus());
  expect(node.querySelectorAll('[role="option"]')).toHaveLength(12);
  act(()=>input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true})));
  expect(onChange).toHaveBeenCalledWith("0");
});

it("confirms a successful creation and returns the new customer to reception", async () => {
  const user={id:"new-client",role:"cliente",active:true,firstName:"Ana",paternalLastName:"López",email:"ana@example.invalid",phone:"5512345678",lockerCode:"AL-MX-0501",internalNotes:[],activity:[]} as User;
  const address={id:"address",userId:user.id,label:"Principal",street:"Reforma",exteriorNumber:"10",neighborhood:"Centro",postalCode:"06000",municipality:"Cuauhtémoc",state:"Ciudad de México"};
  vi.mocked(createCustomerAtReception).mockResolvedValue({ok:true,user,address,invitationStatus:"Invitación en cola"});
  const onCreated=vi.fn();
  const node=mount(React.createElement(CustomerQuickCreate,{onCreated}));
  act(()=>node.querySelector("button")!.click());
  const fields={firstName:user.firstName,paternalLastName:user.paternalLastName,email:user.email,phone:user.phone,street:address.street,exteriorNumber:address.exteriorNumber,neighborhood:address.neighborhood,postalCode:address.postalCode,municipality:address.municipality,state:address.state};
  for(const [name,value] of Object.entries(fields)) {
    const input=document.querySelector(`[role="dialog"] [name="${name}"]`)!;
    const prototype=input.tagName==="SELECT" ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    await act(async()=>{Object.getOwnPropertyDescriptor(prototype,"value")!.set!.call(input,value);input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));});
  }
  await act(async()=>{document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  expect(onCreated).toHaveBeenCalledWith(user,address);
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Cliente creado");
});
