import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { getSession } from "@/lib/auth/actions";
import { pool } from "@/lib/db/pool";
import {getPhoto} from '@/lib/files/r2';

export const runtime = "nodejs";
export async function GET(_request: Request, {params}: {params:Promise<{id:string}>}) {
  const session = await getSession();
  if (!session) return new Response(null,{status:401,headers:{"Cache-Control":"private, no-store"}});
  const {id} = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null,{status:404});
  const [rows] = await pool().execute<RowDataPacket[]>("SELECT original_name,mime_type,content,sha256,storage_provider,object_key FROM private_files WHERE id=? AND (?='admin' OR owner_id=?)",[id,session.role,session.userId]);
  const file = rows[0];
  if (!file) return new Response(null,{status:404,headers:{"Cache-Control":"private, no-store"}});
  let bytes:Buffer;
  try{bytes=file.storage_provider==='r2'?await getPhoto(file.object_key):Buffer.from(file.content);}catch{return new Response('No se pudo recuperar la foto. Intenta nuevamente.',{status:503,headers:{'Cache-Control':'private, no-store'}});}
  if (createHash("sha256").update(bytes).digest("hex") !== file.sha256) return new Response("No se pudo verificar la integridad del archivo.",{status:500});
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":file.mime_type,"Content-Length":String(bytes.length),"Content-Disposition":`attachment; filename="archivo"; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
}
