import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "@/lib/auth/repository";
import { transactionConnection } from "@/lib/db/store";
import { MAX_FILE_BYTES, detectFileType, safeFilename, type FilePurpose } from "./validation";

export async function validateUpload(data: FormData, purpose: FilePurpose) {
  const entry = data.get("file");
  if (entry === null) return { ok: true as const, file: null };
  if (!(entry instanceof File) || !entry.size || entry.size > MAX_FILE_BYTES) return { ok: false as const, error: "El archivo debe contener datos y pesar como máximo 2 MB." };
  const content = Buffer.from(await entry.arrayBuffer());
  const mime = detectFileType(content);
  if (!mime || (purpose === "box" && mime === "application/pdf")) return { ok: false as const, error: purpose === "box" ? "La foto debe ser un JPG o PNG válido." : "El comprobante debe ser JPG, PNG o PDF válido." };
  return { ok: true as const, file: { name: safeFilename(entry.name), mime, content } };
}
type Upload = NonNullable<Extract<Awaited<ReturnType<typeof validateUpload>>, {ok:true}>["file"]>;
export async function savePrivateFile(ownerId: string, entityType: FilePurpose, entityId: string, file: Upload) {
  if (!transactionConnection()) throw new Error("El archivo requiere una transacción operativa.");
  const id = randomUUID();
  await sql().execute("INSERT INTO private_files(id,owner_id,entity_type,entity_id,original_name,mime_type,byte_size,sha256,content) VALUES (?,?,?,?,?,?,?,?,?)", [id,ownerId,entityType,entityId,file.name,file.mime,file.content.length,createHash("sha256").update(file.content).digest("hex"),file.content]);
  return id;
}
