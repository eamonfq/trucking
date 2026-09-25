import 'server-only';

// Safe diagnostics: names/instructions only, never credential values.
export function cloverConfigurationIssues() {
  const issues:string[]=[];
  if(process.env.CLOVER_ENABLED!=='true')issues.push('Activa CLOVER_ENABLED=true.');
  const environment=process.env.CLOVER_ENVIRONMENT;
  if(!['sandbox','production'].includes(environment??''))issues.push('Configura CLOVER_ENVIRONMENT como production o sandbox.');
  for(const name of ['CLOVER_MERCHANT_ID','CLOVER_PUBLIC_KEY','CLOVER_PRIVATE_KEY'])if(!process.env[name]?.trim())issues.push(`Falta ${name} en el proceso del servidor.`);
  if(environment==='production'){
    if(!process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://'))issues.push('NEXT_PUBLIC_SITE_URL debe usar HTTPS en producción.');
    if(process.env.TRUST_PROXY!=='true')issues.push('Configura el proxy confiable y TRUST_PROXY=true en producción.');
  }
  return issues;
}
export function cloverConfig() {
  const environment=process.env.CLOVER_ENVIRONMENT;
  const publicKey=process.env.CLOVER_PUBLIC_KEY?.trim();
  const privateKey=process.env.CLOVER_PRIVATE_KEY?.trim();
  const merchantId=process.env.CLOVER_MERCHANT_ID?.trim();
  const issues=cloverConfigurationIssues();
  if(issues.length)throw new Error(`Clover no está habilitado: ${issues.join(' ')}`);
  if(!publicKey||!privateKey||!merchantId)throw new Error('Faltan credenciales Clover.');
  return {environment:environment as 'sandbox'|'production',publicKey,privateKey,merchantId,
    sdkUrl:environment==='production'?'https://checkout.clover.com/sdk.js':'https://checkout.sandbox.dev.clover.com/sdk.js',
    apiUrl:environment==='production'?'https://scl.clover.com':'https://scl-sandbox.dev.clover.com'};
}
export type CloverCharge = {id?:string;amount?:number;currency?:string;paid?:boolean;captured?:boolean;status?:string;amount_refunded?:number;source?:{id?:string};error?:{type?:string;charge?:string}};
export async function cloverRequest(path:string, body?:{id:string;amount:number;source:string;ip:string;ecomind:'ecom'|'moto'}) {
  const config=cloverConfig();
  const response=await fetch(`${config.apiUrl}/v1/charges${path}`,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(20000),headers:{authorization:`Bearer ${config.privateKey}`,accept:'application/json','Content-Type':'application/json','User-Agent':'AYL/1.0',...(body?{'Idempotency-Key':body.id,'x-forwarded-for':body.ip}:{})},...(body?{body:JSON.stringify({amount:body.amount,currency:'usd',source:body.source,capture:true,partial_redemption:false,ecomind:body.ecomind,description:`A&L pago ${body.id}`,metadata:{ayl_payment_id:body.id}})}:{})});
  const data=await response.json() as CloverCharge;
  return {ok:response.ok,status:response.status,data};
}
export function isCapturedCharge(data:CloverCharge,amount:number){return typeof data.id==='string'&&data.id.length>0&&data.paid===true&&data.captured===true&&data.status==='succeeded'&&data.currency==='usd'&&data.amount===amount&&!(data.amount_refunded??0);}
