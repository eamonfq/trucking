import 'server-only';
import {createHash} from 'node:crypto';
import {getPhoto} from './r2';
export async function readFileContent(file:{storage_provider:string;object_key:string|null;content:Buffer|null;sha256:string}){
 const bytes=file.storage_provider==='r2'?await getPhoto(file.object_key??''):Buffer.from(file.content??[]);
 if(createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw new Error('Integridad de archivo incorrecta.');
 return bytes;
}
