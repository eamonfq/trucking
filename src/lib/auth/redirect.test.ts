import { describe, expect, it } from "vitest";
import { resolvePostLoginPath } from "@/lib/auth/redirect";

describe("resolvePostLoginPath", () => {
  it("manda a cada rol a su panel cuando no hay destino pedido", () => {
    expect(resolvePostLoginPath("admin")).toBe("/admin");
    expect(resolvePostLoginPath("operador")).toBe("/almacen");
    expect(resolvePostLoginPath("operador","/admin/facturas")).toBe("/almacen");
    expect(resolvePostLoginPath("cliente", null)).toBe("/cliente");
  });

  it("respeta el destino pedido cuando el rol puede entrar", () => {
    expect(resolvePostLoginPath("cliente", "/cliente/facturas")).toBe("/cliente/facturas");
    expect(resolvePostLoginPath("admin", "/admin/camiones")).toBe("/admin/camiones");
    expect(resolvePostLoginPath("admin", "/admin")).toBe("/admin");
  });

  it("ignora el destino de otro rol en vez de dejar al usuario rebotando", () => {
    expect(resolvePostLoginPath("admin", "/cliente/facturas")).toBe("/admin");
    expect(resolvePostLoginPath("cliente", "/admin/bodega")).toBe("/cliente");
  });

  it("no permite salir del sitio ni rutas ajenas", () => {
    expect(resolvePostLoginPath("cliente", "//evil.example")).toBe("/cliente");
    expect(resolvePostLoginPath("cliente", "https://evil.example")).toBe("/cliente");
    expect(resolvePostLoginPath("cliente", "/clientefalso")).toBe("/cliente");
    expect(resolvePostLoginPath("admin", "/")).toBe("/admin");
  });
});
