import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import ts from "typescript";
import {readFileSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { z } from "zod";
import {randomUUID,randomBytes,scryptSync,createHash,createCipheriv} from "node:crypto";
nextEnv.loadEnvConfig(process.cwd(),false);
const apply=process.argv.includes("--apply");
const invite=process.argv.includes("--invite");
const fileIndex=process.argv.indexOf("--data");
if(fileIndex>=0&&!process.argv[fileIndex+1])throw new Error("Falta la ruta después de --data.");
const source=fileIndex>=0?path.resolve(process.argv[fileIndex+1]):new URL("./data/operational-locations.json",import.meta.url);
const data=z.object({warehouses:z.array(z.object({name:z.string().min(2),kind:z.enum(["origen","destino","ambos"]),country:z.string().min(2),state:z.string().min(2),city:z.string().min(2),address:z.string().min(2)})).min(1),operators:z.array(z.object({firstName:z.string().min(2),paternalLastName:z.string().min(2),email:z.email().optional(),emailEnv:z.string().optional(),warehouse:z.string()}))}).parse(JSON.parse(readFileSync(source,"utf8")));
for(const person of data.operators){person.email=(person.emailEnv?process.env[person.emailEnv]:person.email)?.trim().toLowerCase();if(person.email&&!z.email().safeParse(person.email).success)throw new Error(`Correo inválido para ${person.firstName}; confirma el dato.`);if(!data.warehouses.some(w=>w.name===person.warehouse))throw new Error("Almacén desconocido en operadores.");}
const knownEmails=data.operators.flatMap(p=>p.email?[p.email]:[]);
if(new Set(data.warehouses.map(w=>w.name.toLowerCase())).size!==data.warehouses.length||new Set(data.warehouses.map(w=>w.address.toLowerCase())).size!==data.warehouses.length)throw new Error("Hay almacenes repetidos en los datos.");
if(new Set(knownEmails).size!==knownEmails.length)throw new Error("Hay correos repetidos en los datos.");
if(invite&&(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32))throw new Error("Falta AUTH_SECRET seguro para invitaciones.");
if(invite){const site=new URL(process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3100");if(!["localhost","127.0.0.1"].includes(site.hostname)&&site.protocol!=="https:")throw new Error("Las invitaciones requieren URL pública HTTPS.");}
if(!process.env.DATABASE_URL)throw new Error("Configura DATABASE_URL.");
// Only trusted, local pure configuration modules; preserve the application's actual defaults.
function config(name){
 const filename=path.resolve("src/lib/config",name+".ts");
 const compiledModule={exports:{}};
 const js=ts.transpileModule(readFileSync(filename,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(js,{module:compiledModule,exports:compiledModule.exports,require:relative=>config(relative.replace("./",""))});
 return compiledModule.exports;
}
const db=await mysql.createConnection(process.env.DATABASE_URL);
try{
 await db.beginTransaction();
 const [migration]=await db.query("SELECT version FROM schema_migrations WHERE version=4");
 if(!migration.length)throw new Error("Ejecuta npm run db:migrate antes de importar.");
 await db.query("SELECT id FROM operation_lock WHERE id=1 FOR UPDATE");
 const [rows]=await db.query("SELECT collection_name,entity_id,payload,position_index FROM entities WHERE collection_name IN ('settings','warehouses','users')");
 const entries=rows.map(r=>({...r,value:typeof r.payload==="string"?JSON.parse(r.payload):r.payload}));
 let position=Math.max(0,...rows.map(r=>r.position_index))+1;
 async function save(collection,value){if(apply)await db.execute("INSERT INTO entities(collection_name,entity_id,payload,position_index) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)",[collection,value.id,JSON.stringify(value),position++]);}
 const settings=entries.find(r=>r.collection_name==="settings")?.value??{id:"main",flow:config("flow").DEFAULT_FLOW_CONFIG,rates:config("box-categories").BOX_CATEGORIES};
 const locations=[];
 const preserved=[];
 for(const input of data.warehouses){
   const matches=entries.filter(r=>r.collection_name==="warehouses"&&(r.value.name===input.name||r.value.address===input.address));
   if(matches.length>1)throw new Error(`Ubicación ambigua: ${input.name}. Revisa los duplicados.`);
   const old=matches[0]?.value;
   const value=old??{...input,id:randomUUID(),active:true,arrivalMessage:"Tu paquete {codigo} ya está en {almacen}, {destino}. Coordina su retiro con nuestro equipo; la entrega requiere el pago liquidado."};
   locations.push(value);if(!old)await save("warehouses",value);else preserved.push({name:old.name,kind:old.kind??"destino",needsReview:(old.kind??"destino")!==input.kind});
 }
 settings.flow.destinationCities=[...new Set([...settings.flow.destinationCities,...locations.filter(w=>(w.kind??"destino")!=="origen"&&w.active).map(w=>w.city)])];
 await save("settings",settings);
 const created=[],pending=[],existingOperators=[],invitations=[];
 for(const person of data.operators){
   if(!person.email){pending.push({name:person.firstName+" "+person.paternalLastName,missing:person.emailEnv??"email"});continue;}
   const email=person.email.toLowerCase();
   const [existing]=await db.execute("SELECT user_id,role,verified_at,active FROM accounts WHERE email=?",[email]);
   const warehouse=locations.find(w=>w.name===person.warehouse);
   if(!warehouse)throw new Error("Almacén desconocido");
   if(existing.length){
     if(existing[0].role!=="operador")throw new Error("Una cuenta existente requiere revisión manual; no se cambiará su rol.");
     const profile=entries.find(r=>r.collection_name==="users"&&r.entity_id===existing[0].user_id)?.value;
     if(!profile?.warehouseGrants?.some(g=>g.warehouseId===warehouse.id&&g.receive&&g.viewContacts))throw new Error(`Revisa los permisos existentes de ${person.firstName}; no se sobrescribieron.`);
     existingOperators.push(person.firstName+" "+person.paternalLastName);
   }
   const id=existing[0]?.user_id??randomUUID(), salt=randomBytes(16).toString("hex");
   const hash="scrypt$32768$"+salt+"$"+scryptSync(randomBytes(32).toString("base64url"),salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString("hex");
   const user={id,role:"operador",firstName:person.firstName,paternalLastName:person.paternalLastName,email,phone:"",active:true,lockerCode:"",internalNotes:[],activity:[],warehouseGrants:[{warehouseId:warehouse.id,receive:true,viewContacts:true}]};
   if(!existing.length){if(apply)await db.execute("INSERT INTO accounts(user_id,email,password_hash,role,active) VALUES (?,?,?,'operador',TRUE)",[id,email,hash]);await save("users",user);created.push(person.firstName+" "+person.paternalLastName);}
   const [tokens]=await db.execute("SELECT token_hash FROM auth_tokens WHERE user_id=? AND purpose='invite' AND consumed_at IS NULL AND expires_at>UTC_TIMESTAMP(3) LIMIT 1",[id]);
   if(invite&&!existing[0]?.verified_at&&existing[0]?.active!==0&&!tokens.length){
     invitations.push(person.firstName+" "+person.paternalLastName);
     if(!apply)continue;
     const token=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+86400000);
     await db.execute("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,'invite',?)",[createHash("sha256").update(token).digest("hex"),id,expiresAt]);
     const emailData={to:email,subject:"Tu acceso de almacén · A&L",heading:"Tu acceso de almacén está listo",body:"Hola "+person.firstName+". Elige tu contraseña para activar tu acceso de recepción y consulta de contactos.",actionLabel:"Activar mi cuenta",actionUrl:new URL("/restablecer?token="+token,process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3100").href,expiresAt:expiresAt.toISOString()};
     const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",createHash("sha256").update(process.env.AUTH_SECRET).digest(),iv);
     const encrypted=Buffer.concat([cipher.update(JSON.stringify(emailData)),cipher.final()]);
     await db.execute("INSERT INTO email_outbox(id,payload) VALUES (?,?)",[randomUUID(),JSON.stringify({iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:encrypted.toString("base64")})]);
   }
 }
 if(apply){await db.execute("INSERT INTO security_audit(event_type) VALUES ('setup.operational-locations')");await db.commit();}else await db.rollback();
 console.log(JSON.stringify({mode:apply?"applied":"preview",warehouses:locations.map(w=>({name:w.name,kind:w.kind??"destino",address:w.address})),preservedWarehouses:preserved,newOperators:created,existingOperators,pendingOperators:pending,invitations:invite?invitations:[],emailDelivery:invite?(process.env.EMAIL_DELIVERY??"preview"):"No se prepararon correos; usa --invite para activar accesos.",notice:"El script no envía directamente; con --invite y EMAIL_DELIVERY=resend el worker puede enviar tras el commit."},null,2));
}catch(error){await db.rollback();throw error;}finally{await db.end();}
