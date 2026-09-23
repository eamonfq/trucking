import 'server-only';
import type {RowDataPacket} from 'mysql2/promise';
import {pool} from '@/lib/db/pool';
import {readFileContent} from '@/lib/files/read-content';
export async function receptionPhotoAttachment(photo:{fileId:string;ownerId:string}){
 const [rows]=await pool().execute<RowDataPacket[]>("SELECT * FROM private_files WHERE id=? AND owner_id=? AND entity_type='box'",[photo.fileId,photo.ownerId]);
 const file=rows[0];
 if(!file||!['image/jpeg','image/png'].includes(file.mime_type)||file.byte_size>2*1024*1024)throw new Error('Foto de recepción no disponible.');
 const content=await readFileContent({storage_provider:file.storage_provider,object_key:file.object_key,content:file.content,sha256:file.sha256});
 return {content:content.toString('base64'),filename:file.mime_type==='image/png'?'foto-recepcion.png':'foto-recepcion.jpg',contentType:file.mime_type,contentId:'reception-photo'};
}
