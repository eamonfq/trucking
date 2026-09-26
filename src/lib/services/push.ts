import 'server-only';
import webpush from 'web-push';
import type {RowDataPacket} from 'mysql2/promise';
import {z} from 'zod';
import {pool} from '@/lib/db/pool';
import {sql} from '@/lib/auth/repository';
import type {EmailInput} from './email-template';

export function pushConfig(){
 const publicKey=process.env.VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
 if(process.env.PUSH_ENABLED!=='true'||!publicKey||!privateKey||!subject)return null;
 return {publicKey,privateKey,subject};
}
export function allowedPushEndpoint(value:string){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(
 u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='web.push.apple.com'||/^[a-z0-9-]+\.notify\.windows\.com$/.test(u.hostname));}catch{return false;}
}
export const subscriptionSchema=z.object({endpoint:z.string().max(2048).refine(allowedPushEndpoint),keys:z.object({auth:z.string().regex(/^[A-Za-z0-9_-]{22}$/),p256dh:z.string().regex(/^[A-Za-z0-9_-]{87}$/)})});
export function operationalEmail(input:EmailInput){
 if(input.expiresAt||!input.actionUrl)return false;
 try{const target=new URL(input.actionUrl),site=new URL(process.env.NEXT_PUBLIC_SITE_URL??'http://localhost:3100');return target.origin===site.origin&&(target.pathname==='/cliente'||target.pathname.startsWith('/cliente/'))&&!target.search&&!target.hash;}catch{return false;}
}
// Same transaction and consolidated event as email, but independent delivery.
export async function queueEmailPush(id:string,input:EmailInput){
 if(!pushConfig()||!operationalEmail(input))return;
 await sql().execute(`INSERT IGNORE INTO push_outbox(id,subscription_id,user_id)
 SELECT ?,p.id,p.user_id FROM push_subscriptions p JOIN accounts a ON a.user_id=p.user_id JOIN sessions s ON s.token_hash=p.session_hash
 WHERE a.email=? AND a.role='cliente' AND a.active=1 AND a.verified_at IS NOT NULL AND s.expires_at>UTC_TIMESTAMP(3)`,[id,input.to]);
}
export async function deliverPendingPush(){
 const config=pushConfig();if(!config)return;
 const db=await pool().getConnection();let locked=false;
 try{
  const [lock]=await db.query<RowDataPacket[]>("SELECT GET_LOCK('ayl_push_worker',0) AS acquired");locked=Boolean(lock[0].acquired);if(!locked)return;
  await db.execute('DELETE p FROM push_subscriptions p JOIN sessions s ON s.token_hash=p.session_hash JOIN accounts a ON a.user_id=p.user_id WHERE s.expires_at<=UTC_TIMESTAMP(3) OR a.active=0');
  await db.execute("DELETE FROM push_outbox WHERE created_at<DATE_SUB(UTC_TIMESTAMP(),INTERVAL 1 DAY)");
  const [rows]=await db.query<RowDataPacket[]>(`SELECT q.*,p.subscription FROM push_outbox q JOIN push_subscriptions p ON p.id=q.subscription_id AND p.user_id=q.user_id JOIN accounts a ON a.user_id=p.user_id JOIN sessions s ON s.token_hash=p.session_hash
   WHERE q.status IN ('queued','retry') AND q.attempts<5 AND q.available_at<=UTC_TIMESTAMP(3) AND a.active=1 AND a.verified_at IS NOT NULL AND a.role='cliente' AND s.expires_at>UTC_TIMESTAMP(3) ORDER BY q.created_at LIMIT 10`);
  for(const row of rows){try{
   const sub=subscriptionSchema.parse(typeof row.subscription==='string'?JSON.parse(row.subscription):row.subscription);
   // Generic lock-screen copy: never exposes names, balances, photos or login tokens.
   await webpush.sendNotification(sub,JSON.stringify({id:row.id,title:'A&L · Nueva actualización',body:'Tienes novedades en tu cuenta. Abre tu panel para ver los detalles.',url:'/cliente/notificaciones'}),{vapidDetails:config,TTL:3600,timeout:4000,topic:row.id.replaceAll('-','')});
   await db.execute("UPDATE push_outbox SET status='sent',attempts=attempts+1 WHERE id=? AND subscription_id=?",[row.id,row.subscription_id]);
  }catch(error){const status=(error as {statusCode?:number}).statusCode;if(status===404||status===410){await db.execute('DELETE FROM push_subscriptions WHERE id=?',[row.subscription_id]);}else{await db.execute("UPDATE push_outbox SET status=IF(attempts>=4,'failed','retry'),attempts=attempts+1,available_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND) WHERE id=? AND subscription_id=?",[60*2**row.attempts,row.id,row.subscription_id]);}}}
 }finally{if(locked)await db.query("SELECT RELEASE_LOCK('ayl_push_worker')");db.release();}
}
