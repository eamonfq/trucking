import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
nextEnv.loadEnvConfig(process.cwd());
// Read-only audit. Never prints passwords, tokens, emails or file contents.
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.beginTransaction();
  const [rows] = await connection.query('SELECT collection_name,entity_id,payload FROM entities');
  const data = {};
  for (const row of rows) (data[row.collection_name] ??= []).push(typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload);
  const list = name => data[name] ?? [];
  const find = (name,id) => list(name).find(item=>item.id===id);
  const [accounts] = await connection.query('SELECT user_id,role,active FROM accounts');
  const [files] = await connection.query('SELECT id,owner_id,entity_type,entity_id,byte_size,LENGTH(content) AS stored_bytes FROM private_files');
  const [migrations] = await connection.query('SELECT version FROM schema_migrations ORDER BY version');
  const [server] = await connection.query('SELECT VERSION() AS version, DATABASE() AS name, @@max_allowed_packet AS max_packet');
  const issues=[];
  const check=(condition,code,id)=>{if(!condition)issues.push({code,id});};
  for(const account of accounts){const user=find('users',account.user_id);check(user&&user.role===account.role&&Boolean(user.active)===Boolean(account.active),'account-profile-mismatch',account.user_id);}
  for(const user of list('users'))check(accounts.some(account=>account.user_id===user.id),'profile-without-account',user.id);
  for(const box of list('boxes')) {
    check(find('users',box.userId),'box-owner-missing',box.id);
    if(box.shipmentId){const shipment=find('shipments',box.shipmentId);check(shipment&&shipment.userId===box.userId&&shipment.boxIds.includes(box.id),'box-shipment-mismatch',box.id);}
    if(box.truckId)check(find('trucks',box.truckId)?.boxIds.includes(box.id),'box-truck-mismatch',box.id);
    if(box.photoFileId)check(files.some(file=>file.id===box.photoFileId&&file.entity_id===box.id&&file.owner_id===box.userId),'photo-reference-mismatch',box.id);
  }
  for(const shipment of list('shipments')){
    check(new Set(shipment.boxIds).size===shipment.boxIds.length,'duplicate-shipment-boxes',shipment.id);
    for(const id of shipment.boxIds){const box=find('boxes',id);check(box&&box.userId===shipment.userId&&box.shipmentId===shipment.id,'shipment-box-mismatch',shipment.id);}
    if(shipment.truckId)check(find('trucks',shipment.truckId),'shipment-truck-missing',shipment.id);
    if(shipment.status==='entregado')check(shipment.boxIds.every(id=>find('boxes',id)?.status==='entregada'),'shipment-delivery-mismatch',shipment.id);
  }
  for(const truck of list('trucks')){
    check(new Set(truck.boxIds).size===truck.boxIds.length,'duplicate-truck-boxes',truck.id);
    for(const id of truck.boxIds)check(find('boxes',id)?.truckId===truck.id,'truck-box-mismatch',truck.id);
  }
  const billed=new Set();
  for(const invoice of list('invoices')){
    check(find('users',invoice.userId),'invoice-owner-missing',invoice.id);
    for(const id of invoice.boxIds??[]){check(find('boxes',id)?.userId===invoice.userId,'invoice-box-owner-mismatch',invoice.id);check(!billed.has(id),'box-billed-twice',id);billed.add(id);}
    for(const file of invoice.receiptFiles??[])check(files.some(item=>item.id===file.id&&item.entity_id===invoice.id&&item.owner_id===invoice.userId),'receipt-reference-mismatch',invoice.id);
  }
  for(const file of files){const entity=find(file.entity_type==='box'?'boxes':'invoices',file.entity_id);check(entity?.userId===file.owner_id,'file-entity-mismatch',file.id);check(file.byte_size===file.stored_bytes,'file-size-mismatch',file.id);}
  await connection.rollback();
  const warnings=[];
  if(!list('boxes').length)warnings.push('No hay cajas operativas: validar recorridos con la suite de integración aislada.');
  if(process.env.EMAIL_DELIVERY!=='resend')warnings.push('Emails en preview: no se envían mensajes externos.');
  if(!process.env.RESEND_WEBHOOK_SECRET)warnings.push('Webhook de Resend pendiente.');
  if(server[0].max_packet<3*1024*1024)warnings.push('max_allowed_packet insuficiente para adjuntos de 2 MB.');
  console.log(JSON.stringify({database:server[0].name,mysql:server[0].version,migrations:migrations.map(row=>row.version),counts:Object.fromEntries(['users','boxes','shipments','trucks','invoices','supportTickets'].map(name=>[name,list(name).length])),privateFiles:files.length,integrityIssues:issues,warnings},null,2));
  if(issues.length)process.exitCode=1;
} finally {await connection.end();}
