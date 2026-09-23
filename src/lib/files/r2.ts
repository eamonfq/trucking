import 'server-only';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';

export function r2Config(){
 const endpoint=process.env.R2_ENDPOINT??'',bucket=process.env.R2_BUCKET??'';
 if(!/^https:\/\/[a-f0-9]{32}\.r2\.cloudflarestorage\.com\/?$/.test(endpoint)||!bucket||!process.env.R2_ACCESS_KEY_ID||!process.env.R2_SECRET_ACCESS_KEY)throw new Error('Falta configurar R2 en el servidor.');
 return {endpoint,bucket,accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY};
}
function client(){const config=r2Config();return {bucket:config.bucket,s3:new S3Client({region:'auto',endpoint:config.endpoint,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey},maxAttempts:2,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'})};}
function assertKey(key:string){if(!/^ayl\/reception\/[a-f0-9-]{36}\.jpg$/.test(key))throw new Error('Referencia de foto R2 inválida.');}
export async function putPhoto(key:string,content:Buffer){
 assertKey(key);const {s3,bucket}=client();
 try{await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:content,ContentType:'image/jpeg',CacheControl:'private, no-store'}),{abortSignal:AbortSignal.timeout(20000)});}finally{s3.destroy();}
}
export async function getPhoto(key:string){
 assertKey(key);const {s3,bucket}=client();
 try{const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});if(!result.Body||!result.ContentLength||result.ContentLength>2*1024*1024)throw new Error('Foto inválida en R2.');return Buffer.from(await result.Body.transformToByteArray());}finally{s3.destroy();}
}
export async function deletePhoto(key:string){
 assertKey(key);const {s3,bucket}=client();
 try{await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});}finally{s3.destroy();}
}
