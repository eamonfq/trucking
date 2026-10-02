import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { WarehouseBoard } from "./warehouse-board";
import { AdminAccessProvider } from "./admin-access";
import { scanLoad, loadSelectedPackages } from "@/lib/auth/warehouse-actions";
import { transitionTruckState } from "@/lib/auth/admin-actions";
import type { Box, Truck, Warehouse } from "@/lib/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/warehouse-actions", () => ({ scanLoad: vi.fn(), loadSelectedPackages: vi.fn() }));
vi.mock("@/lib/auth/admin-actions", () => ({ transitionTruckState: vi.fn() }));
vi.mock("./camera-barcode-reader", () => ({ CameraBarcodeReader: () => null }));
vi.stubGlobal("React", React);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const truck: Truck = { id: "t", code: "TR-001", status: "cargando", originWarehouseName: "Chicago", route: "Chicago · México", boxIds: ["old"], stops: [{ warehouseId: "w", city: "México", arrivalDate: "2099-01-01" }], plate: "QA", driverName: "Prueba", driverId: "d", departureDate: "2099-01-01", destinationCity: "México", capacity: {}, timeline: [] };
const warehouses: Warehouse[] = [{ id: "w", name: "Valle de Juárez", city: "México", active: true, arrivalMessage: "Llegó tu paquete." }];
const box: Box = { id: "b", code: "BX-001", status: "en-bodega", userId: "u", categoryId: "small", weightLb: 25, dimensions: { length: 10, width: 10, height: 10 }, timeline: [] };
const props = { initialBoxes: [box, { ...box, id: "b2", code: "BX-002" as const }], initialLoadedBoxes: [{ ...box, id: "old", code: "BX-OLD" as const, truckId: "t", weightLb: 50 }], initialTrucks: [truck], users: [], warehouses };
const mounts: Array<{ root: ReturnType<typeof createRoot>; node: HTMLElement }> = [];
function mount(element = <WarehouseBoard {...props} />) {
  const node = document.createElement("div"); document.body.append(node);
  const root = createRoot(node); mounts.push({ root, node }); act(() => root.render(element));
  return { root, node };
}
function click(text: string) { act(() => Array.from(document.querySelectorAll("button")).find(button => button.textContent === text)!.click()); }
async function scan(value: string) {
  act(() => { const input = document.querySelector<HTMLInputElement>('[role="dialog"] input')!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => { document.querySelector('[role="dialog"] form')!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
}
afterEach(() => { for (const { root, node } of mounts.splice(0)) { act(() => root.unmount()); node.remove(); } window.history.replaceState(null, "", "/"); vi.clearAllMocks(); });

it("opens loading directly in Bodega without requiring a selection", () => {
  mount(); click("Escanear carga");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("TR-001");
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("50 lb");
  expect(document.activeElement).toBe(document.querySelector('[role="dialog"] input'));
  expect(scanLoad).not.toHaveBeenCalled();
  click("Volver a bodega"); expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("loads the selected boxes directly without opening the scanner", async () => {
  const { node } = mount(); act(() => node.querySelector<HTMLInputElement>('[aria-label="Seleccionar todas las cajas disponibles"]')!.click());
  vi.mocked(loadSelectedPackages).mockResolvedValue({ ok: true, count: 2, truck: { ...truck, boxIds: ["old", "b", "b2"] }, assigned: props.initialBoxes.map(box=>({...box,status:"cargada-en-camion",truckId:"t"})) });
  await act(async()=>click("Cargar 2 paquetes"));
  expect(loadSelectedPackages).toHaveBeenCalledWith("t", ["b","b2"], "w");
  expect(scanLoad).not.toHaveBeenCalled();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(node.querySelector('[aria-label="Seleccionar BX-001"]')).toBeNull();
  expect(node.querySelector('[aria-label="Seleccionar BX-002"]')).toBeNull();
  expect(node.textContent).toContain("100 lb");
  expect(node.textContent).toContain("0 seleccionadas");
  expect(node.querySelector('[role="status"]')?.textContent).toContain("2 paquete(s) cargados");
});
it("preserves selection on a failed direct load",async()=>{
  const {node}=mount();act(()=>node.querySelector<HTMLInputElement>('[aria-label="Seleccionar BX-001"]')!.click());
  vi.mocked(loadSelectedPackages).mockResolvedValue({ok:false,error:"La carga superaría el límite de peso real."});
  await act(async()=>click("Cargar 1 paquete"));
  expect(node.querySelector('[role="alert"]')?.textContent).toContain("peso real");
  expect(node.querySelector<HTMLInputElement>('[aria-label="Seleccionar BX-001"]')?.checked).toBe(true);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("keeps a rejected package in inventory with its server validation visible", async () => {
  const { node } = mount(); click("Escanear carga");
  vi.mocked(scanLoad).mockResolvedValue({ ok: false, error: "El paquete pertenece a otro almacén de origen." });
  await scan("BX-001");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("otro almacén");
  expect(node.querySelector('[aria-label="Seleccionar BX-001"]')).toBeTruthy();
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain("50 lb");
});
it("starts a planned truck from Bodega before allowing scans", async () => {
  mount(<WarehouseBoard {...props} initialTrucks={[{ ...truck, status: "planificado" }]} />); click("Escanear carga");
  expect(document.querySelector('[role="dialog"] form')).toBeNull();
  vi.mocked(transitionTruckState).mockResolvedValue({ ok: true, truck, changedBoxes: 0, changedShipments: 0, generatedInvoices: [] });
  await act(async () => { Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Iniciar carga")!.click(); });
  expect(transitionTruckState).toHaveBeenCalledWith("t");
  expect(document.querySelector('[role="dialog"] form')).toBeTruthy();
});
it("does not offer loading to inventory-only administrators", () => {
  const { node } = mount(<AdminAccessProvider user={{ role: "admin", active: true, adminPermissions: ["bodega"] }}><WarehouseBoard {...props} /></AdminAccessProvider>);
  expect(node.textContent).not.toContain("Cargar al camión");
  expect(node.querySelector<HTMLInputElement>('[aria-label="Seleccionar BX-001"]')?.disabled).toBe(true);
});
it("handles no available trucks and refreshes from authoritative inventory", () => {
  const { root, node } = mount(<WarehouseBoard {...props} initialTrucks={[]} />);
  expect(node.textContent).toContain("No hay camiones disponibles");
  expect(node.querySelector('#carga-escaneada')).toBeNull();
  act(() => root.render(<WarehouseBoard {...props} initialBoxes={[props.initialBoxes[1]]} />));
  expect(node.querySelector('[aria-label="Seleccionar BX-001"]')).toBeNull();
  expect(node.querySelector('[aria-label="Seleccionar BX-002"]')).toBeTruthy();
});
