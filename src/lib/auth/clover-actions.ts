'use server';
import {headers} from 'next/headers';
import {isIP} from 'node:net';
import {revalidatePath} from 'next/cache';
import {after} from 'next/server';
import {getCurrentUser,requestLimit} from './actions';
import {chargeClover,quoteClover,reconcileClover} from '@/lib/payments/clover';
import {cloverConfig} from '@/lib/payments/clover-provider';
import {deliverPendingEmails} from '@/lib/services/email';

export async function cloverAvailability(){try{const config=cloverConfig();return {enabled:true,environment:config.environment};}catch{return {enabled:false};}}
function message(error:unknown){return error instanceof Error&&!/sql|mysql|connect|fetch|json|token.*clv_/i.test(error.message)?error.message:'No se pudo confirmar la operación. Revisa el estado antes de volver a pagar.';}
export async function prepareCloverPayment(ids:string[]){try{return {ok:true as const,...await quoteClover(ids)};}catch(error){return {ok:false as const,error:message(error)};}}
export async function submitCloverPayment(ids:string[],source:string,expectedAmount:number,warehouseId?:string){
  try{
    const user=await getCurrentUser();if(!user||!['admin','cliente'].includes(user.role))throw new Error('Inicia sesión con una cuenta autorizada.');
    if(!await requestLimit('clover-charge',user.id,10))throw new Error('Demasiados intentos. Espera antes de continuar.');
    const h=await headers();const ip=process.env.TRUST_PROXY==='true'?h.get('x-forwarded-for')?.split(',')[0]?.trim():process.env.CLOVER_ENVIRONMENT==='sandbox'?'127.0.0.1':undefined;
    if(!ip||!isIP(ip))throw new Error('No se pudo verificar la IP del navegador. Revisa el proxy.');
    const attempt=await chargeClover(ids,source,expectedAmount,ip,warehouseId);
    revalidatePath('/','layout');after(deliverPendingEmails);return {ok:true as const,attempt};
  }catch(error){return {ok:false as const,error:message(error)};}
}
export async function reconcileCloverPayment(ids:string[],chargeId:string){try{const attempt=await reconcileClover(ids,chargeId);revalidatePath('/','layout');after(deliverPendingEmails);return {ok:true as const,attempt};}catch(error){return {ok:false as const,error:message(error)};}}
