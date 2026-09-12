import { describe,it,expect } from "vitest";
import { detectFileType,safeFilename } from "./validation";
describe("validación de archivos privados",()=>{
  it("no confía en la extensión ni acepta SVG/HTML",()=>{expect(detectFileType(new TextEncoder().encode("<svg></svg>"))).toBeNull();expect(detectFileType(new Uint8Array())).toBeNull();});
  it("verifica cabecera y final del PDF",()=>{expect(detectFileType(new TextEncoder().encode("%PDF-1.4 content %%EOF"))).toBe("application/pdf");expect(detectFileType(new TextEncoder().encode("%PDF-1.4 incomplete"))).toBeNull();});
  it("neutraliza rutas y caracteres de cabecera",()=>{expect(safeFilename('../../a.png')).toBe('a.png');expect(safeFilename('C:\\temp\\b.png')).toBe('b.png');expect(safeFilename('a\r\n".pdf')).toBe('a___.pdf');});
});
