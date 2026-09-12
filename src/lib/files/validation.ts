export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export type FilePurpose = "box" | "invoice";
export function detectFileType(bytes: Uint8Array): "image/png" | "image/jpeg" | "application/pdf" | null {
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value,index)=>bytes[index]===value) && String.fromCharCode(...bytes.slice(12,16)) === "IHDR") return "image/png";
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes.at(-2) === 255 && bytes.at(-1) === 217) return "image/jpeg";
  if (bytes.length >= 10 && String.fromCharCode(...bytes.slice(0,5)) === "%PDF-" && new TextDecoder().decode(bytes.slice(-1024)).includes("%%EOF")) return "application/pdf";
  return null;
}
export function safeFilename(name: string) {
  return name.split(/[\\/]/).at(-1)!.replace(/[\u0000-\u001f\u007f"<>:|?*]/g, "_").slice(0,180) || "archivo";
}
