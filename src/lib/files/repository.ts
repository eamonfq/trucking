import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { sql } from "@/lib/auth/repository";
import { transactionConnection, onTransactionRollback } from "@/lib/db/store";
import {normalizePhoto} from './normalize-photo';
import {putPhoto,deletePhoto} from './r2';
import { MAX_FILE_BYTES, detectFileType, safeFilename, type FilePurpose } from "./validation";

export async function validateUpload(data: FormData, purpose: FilePurpose) {
  const entry = data.get("file");
  if (entry === null) return { ok: true as const, file: null };
  if (!(entry instanceof File) || !entry.size || entry.size > MAX_FILE_BYTES) return { ok: false as const, error: "El archivo debe contener datos y pesar como máximo 2 MB." };
  const content = Buffer.from(await entry.arrayBuffer());
  const mime = detectFileType(content);
  if (!mime || (purpose === "box" && mime === "application/pdf")) return { ok: false as const, error: purpose === "box" ? "La foto debe ser un JPG o PNG válido." : "El comprobante debe ser JPG, PNG o PDF válido." };
  if(purpose==='box'){
    try{
      const compressed=await normalizePhoto(content);
      if(compressed.length>MAX_FILE_BYTES)return {ok:false as const,error:'La foto comprimida supera 2 MB. Elige una foto más pequeña.'};
      return {ok:true as const,file:{name:safeFilename(entry.name).replace(/\.[^.]+$/,'')+'.jpg',mime:'image/jpeg',content:compressed}};
    }catch{return {ok:false as const,error:'La fotografía no se puede decodificar. Usa una imagen JPG o PNG válida.'};}
  }
  return { ok: true as const, file: { name: safeFilename(entry.name), mime, content } };
}
type Upload = NonNullable<Extract<Awaited<ReturnType<typeof validateUpload>>, {ok:true}>["file"]>;
export async function savePrivateFile(ownerId: string, entityType: FilePurpose, entityId: string, file: Upload) {
  if (!transactionConnection()) throw new Error("El archivo requiere una transacción operativa.");
  const id = randomUUID();
  if(entityType==='box'&&process.env.PHOTO_STORAGE==='r2'){
    if(process.env.R2_PRIVATE_CONFIRMED!=='true')throw new Error('Confirma que el bucket R2 es privado antes de habilitar las fotos.');
    const key=`ayl/reception/${id}.jpg`;
    // Register before PUT: a timeout may still have created this unique object.
    onTransactionRollback(()=>deletePhoto(key));
    await putPhoto(key,file.content);
    await sql().execute("INSERT INTO private_files(id,owner_id,entity_type,entity_id,original_name,mime_type,byte_size,sha256,content,storage_provider,object_key) VALUES (?,?,?,?,?,?,?,?,NULL,'r2',?)",[id,ownerId,entityType,entityId,file.name,file.mime,file.content.length,createHash('sha256').update(file.content).digest('hex'),key]);
    return id;
  }
  if(entityType==='box'&&process.env.PHOTO_STORAGE&&process.env.PHOTO_STORAGE!=='mysql')throw new Error('PHOTO_STORAGE no es válido.');
  await sql().execute("INSERT INTO private_files(id,owner_id,entity_type,entity_id,original_name,mime_type,byte_size,sha256,content) VALUES (?,?,?,?,?,?,?,?,?)", [id,ownerId,entityType,entityId,file.name,file.mime,file.content.length,createHash("sha256").update(file.content).digest("hex"),file.content]);
  return id;
}
