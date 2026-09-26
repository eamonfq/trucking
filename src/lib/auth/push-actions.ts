'use server';
import {cookies} from 'next/headers';
import {getSession,requestLimit} from './actions';
import {sql} from './repository';
import {SESSION_COOKIE} from './session';
import {tokenHash} from './crypto';
import {pushConfig,subscriptionSchema} from '@/lib/services/push';
import type {RowDataPacket} from 'mysql2/promise';
export async function pushSettings(endpoint?:string){
 const session=await getSession();if(session?.role!=='cliente')return {publicKey:null,active:false};
 const config=pushConfig();if(!config)return {publicKey:null,active:false};
 const [rows]=await sql().execute<RowDataPacket[]>('SELECT id FROM push_subscriptions WHERE id=? AND user_id=? AND session_hash=?',[tokenHash(endpoint??''),session.userId,tokenHash((await cookies()).get(SESSION_COOKIE)!.value)]);
 return {publicKey:config.publicKey,active:rows.length>0};
}
export async function subscribePush(input:unknown){
 const session=await getSession();if(session?.role!=='cliente'||!pushConfig())return {ok:false,error:'Inicia sesión como cliente y comprueba que los avisos estén habilitados.'};
 if(!await requestLimit('push-subscribe',session.userId,20))return {ok:false,error:'Espera unos minutos antes de reintentar.'};
 const parsed=subscriptionSchema.safeParse(input);if(!parsed.success)return {ok:false,error:'El navegador no envió una suscripción compatible.'};
 const id=tokenHash(parsed.data.endpoint),hash=tokenHash((await cookies()).get(SESSION_COOKIE)!.value);
 // Rebinding a browser to a different account must discard its previous queue.
 await sql().execute('DELETE FROM push_outbox WHERE subscription_id=?',[id]);
 await sql().execute('INSERT INTO push_subscriptions(id,user_id,session_hash,subscription) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),session_hash=VALUES(session_hash),subscription=VALUES(subscription)',[id,session.userId,hash,JSON.stringify(parsed.data)]);
 return {ok:true};
}
export async function unsubscribePush(endpoint:string){
 const session=await getSession();if(session?.role!=='cliente')return {ok:false};
 await sql().execute('DELETE FROM push_subscriptions WHERE id=? AND user_id=?',[tokenHash(endpoint),session.userId]);return {ok:true};
}
