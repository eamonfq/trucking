import nextEnv from '@next/env';
import {randomUUID,createHash} from 'node:crypto';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand} from '@aws-sdk/client-s3';
import sharp from 'sharp';
nextEnv.loadEnvConfig(process.cwd());
const {R2_ENDPOINT:endpoint,R2_BUCKET:bucket,R2_ACCESS_KEY_ID:accessKeyId,R2_SECRET_ACCESS_KEY:secretAccessKey}=process.env;
if(!endpoint||!bucket||!accessKeyId||!secretAccessKey)throw new Error('Faltan las variables R2.');
const s3=new S3Client({region:'auto',endpoint,credentials:{accessKeyId,secretAccessKey},maxAttempts:2,requestChecksumCalculation:'WHEN_REQUIRED',responseChecksumValidation:'WHEN_REQUIRED'});
const key=`ayl/connectivity-tests/${randomUUID()}.jpg`;
const image=await sharp({create:{width:32,height:32,channels:3,background:'#ca4e00'}}).jpeg().toBuffer();
let attempted=false;
try{
 attempted=true;
 await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:image,ContentType:'image/jpeg'}),{abortSignal:AbortSignal.timeout(20000)});
 const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});
 const actual=await result.Body.transformToByteArray();
 if(createHash('sha256').update(actual).digest('hex')!==createHash('sha256').update(image).digest('hex'))throw new Error('Integridad incorrecta.');
 console.log('Subida y lectura autenticada: OK. Solo se usó una imagen sintética.');
 if(process.env.R2_URL){
  const publicUrl=new URL(key,process.env.R2_URL.replace(/\/?$/,'/'));
  const probe=await fetch(publicUrl,{signal:AbortSignal.timeout(15000),redirect:'manual'});
  if(probe.ok){console.log('ALERTA: la imagen puede leerse sin autenticación. Deshabilita r2.dev y dominios públicos antes de usar fotos de clientes.');process.exitCode=2;}
  else console.log(`Prueba de URL pública: HTTP ${probe.status}. Verifica además que no existan dominios públicos vinculados al bucket.`);
  await probe.body?.cancel();
 }
}catch(error){console.error('Prueba R2 fallida:',error?.name??'Error');process.exitCode=1;}
finally{
 if(attempted){try{await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(20000)});console.log('Imagen sintética eliminada. No se modificaron otros objetos.');}catch{console.error(`No se pudo borrar el objeto de prueba: ${key}`);process.exitCode=1;}}
 s3.destroy();
}
