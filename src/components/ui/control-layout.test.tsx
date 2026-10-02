import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { Input } from "./input";
import { Select } from "./select";
import { Textarea } from "./textarea";
import { Checkbox } from "./checkbox";

vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const mounts: Array<{ root: ReturnType<typeof createRoot>; node: HTMLElement }> = [];
function mount(children: React.ReactNode) {
  const node = document.createElement("div"); document.body.append(node);
  const root = createRoot(node); mounts.push({ root, node });
  act(() => root.render(children)); return node;
}
afterEach(() => { for (const { root, node } of mounts.splice(0)) { act(() => root.unmount()); node.remove(); } });

it("allows fields and their wrappers to shrink within narrow grid columns", () => {
  const node = mount(<><Input label="Peso" /><Select label="Almacén" options={[{value:"mx",label:"México · Valle de Juárez"}]} /><Textarea label="Referencia" /></>);
  for (const field of node.querySelectorAll("input, select, textarea")) {
    expect(field.classList.contains("min-w-0")).toBe(true);
    expect(field.classList.contains("w-full")).toBe(true);
    expect(field.closest("label, div")?.classList.contains("min-w-0")).toBe(true);
  }
  expect(node.querySelector("select")?.classList.contains("pr-10")).toBe(true);
});

it("gives unnamed select and textarea fields unique accessible labels and error descriptions", () => {
  const node = mount(<><Select label="Origen" error="Revisa el origen" options={[]} /><Select label="Destino" options={[]} /><Textarea label="Nota" hint="Opcional" /></>);
  const controls = Array.from(node.querySelectorAll("select, textarea"));
  expect(new Set(controls.map(field=>field.id)).size).toBe(3);
  for (const field of controls) expect(field.id).toBeTruthy();
  const select = controls[0];
  expect(select.parentElement?.parentElement?.querySelector("label")?.htmlFor).toBe(select.id);
  expect(document.getElementById(select.getAttribute("aria-describedby")!)?.textContent).toBe("Revisa el origen");
});

it("centers the password toggle at every field height without submitting the form", () => {
  const node = mount(<form><Input label="Contraseña" type="password" className="min-h-10" /></form>);
  const toggle = node.querySelector("button")!;
  expect(toggle.type).toBe("button");
  expect(toggle.classList.contains("top-1/2")).toBe(true);
  expect(toggle.classList.contains("-translate-y-1/2")).toBe(true);
  act(()=>toggle.click()); expect(node.querySelector("input")?.type).toBe("text");
});

it("keeps checkbox indicators from collapsing when their label wraps", () => {
  const node = mount(<Checkbox label="Confirmo el mismo peso real en todas las piezas" />);
  expect(node.querySelector("input")?.parentElement?.classList.contains("shrink-0")).toBe(true);
});

it("keeps control focus and selectable card rings inside clipped surfaces", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  expect(css).toContain("outline-offset: -3px");
  for (const path of ["src/components/admin/payment-capture.tsx", "src/components/marketing/quote-calculator.tsx"])
    expect(readFileSync(path,"utf8")).toContain("focus-within:ring-inset");
  for (const path of ["src/components/admin/invoice-editor.tsx", "src/components/admin/reception-recipient.tsx", "src/components/cliente/crud-manager.tsx"])
    expect(readFileSync(path,"utf8")).not.toMatch(/className="grid max-h-\[6[05]vh\].*overflow-y-auto/);
});
