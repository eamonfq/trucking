import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { BOX_CATEGORIES } from "@/lib/config/box-categories";
import { FixedBoxCatalog, type CatalogPiece } from "./fixed-box-catalog";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const mounts: Array<{ root: ReturnType<typeof createRoot>; node: HTMLElement }> = [];
afterEach(() => { for (const { root, node } of mounts.splice(0)) { act(() => root.unmount()); node.remove(); } });

function mount(initial: CatalogPiece[]) {
  const node = document.createElement("div");document.body.append(node);
  const root = createRoot(node);mounts.push({ root, node });
  function Harness() {
    const [pieces, setPieces] = useState(initial), [page, setPage] = useState(0);
    return <><FixedBoxCatalog rates={[...BOX_CATEGORIES]} pieces={pieces} page={page} onPageChange={setPage} onChange={setPieces}/><output>{JSON.stringify(pieces)}</output></>;
  }
  act(() => root.render(<Harness/>));
  return node;
}
const button = (node: HTMLElement, label: string) => node.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

it("copies weight only on request, preserves category choices and prevents copying an empty weight", () => {
  const node = mount([{categoryId:"small",weightLb:0},{categoryId:"medium",weightLb:40}]);
  const copy = Array.from(node.querySelectorAll("button")).find(item=>item.textContent?.includes("Usar peso"))!;
  expect(copy.disabled).toBe(true);
  const weight = node.querySelector<HTMLInputElement>('[aria-label="Paquete 1 · Peso (lb)"]')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(weight,"25");weight.dispatchEvent(new Event("input",{bubbles:true})); });
  expect(node.querySelector<HTMLInputElement>('[aria-label="Paquete 2 · Peso (lb)"]')?.value).toBe("40");
  act(() => copy.click());
  expect(JSON.parse(node.querySelector("output")!.textContent!)).toEqual([{categoryId:"small",weightLb:25},{categoryId:"medium",weightLb:25}]);
});

it("keeps independent weights through pagination and clamps the last page after removal", () => {
  const node = mount([...Array.from({length:5},(_,i)=>({categoryId:"small",weightLb:i+1})),{categoryId:"medium",weightLb:30}]);
  act(() => button(node,"Cajas siguientes").click());
  expect(node.querySelector<HTMLInputElement>('[aria-label="Paquete 6 · Peso (lb)"]')?.value).toBe("30");
  act(() => button(node,"Quitar caja Small").click());
  expect(node.querySelector<HTMLInputElement>('[aria-label="Paquete 5 · Peso (lb)"]')?.value).toBe("30");
  expect(node.querySelector('[aria-label="Páginas de cajas del catálogo"]')).toBeNull();
  expect(JSON.parse(node.querySelector("output")!.textContent!)).toEqual([...Array.from({length:4},(_,i)=>({categoryId:"small",weightLb:i+1})),{categoryId:"medium",weightLb:30}]);
});

it("enforces the 50-piece limit and disables removal of an absent size", () => {
  const node = mount(Array.from({length:50},()=>({categoryId:"small",weightLb:1})));
  expect(button(node,"Añadir caja Medium").disabled).toBe(true);
  expect(button(node,"Quitar caja Medium").disabled).toBe(true);
  act(() => button(node,"Quitar caja Small").click());
  expect(button(node,"Añadir caja Medium").disabled).toBe(false);
  act(() => button(node,"Añadir caja Medium").click());
  expect(JSON.parse(node.querySelector("output")!.textContent!).at(-1)).toEqual({categoryId:"medium",weightLb:0});
  expect(node.textContent).toContain("máximo de 50 cajas");
});
