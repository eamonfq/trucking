import nextEnv from "@next/env";
import mysql from "mysql2/promise";
import ts from "typescript";
import {readFileSync} from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {randomUUID,randomBytes,scryptSync,createHash,createCipheriv} from "node:crypto";
nextEnv.loadEnvConfig(process.cwd());
const apply=process.argv.includes("--apply");
const data=JSON.parse(readFileSync(path.resolve(".local/operational-locations.json"),"utf8"));
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
 await db.query("SELECT id FROM operation_lock WHERE id=1 FOR UPDATE");
 const [rows]=await db.query("SELECT collection_name,entity_id,payload,position_index FROM entities WHERE collection_name IN ('settings','warehouses','users')");
 const entries=rows.map(r=>({...r,value:typeof r.payload==="string"?JSON.parse(r.payload):r.payload}));
 let position=Math.max(0,...rows.map(r=>r.position_index))+1;
 async function save(collection,value){if(apply)await db.execute("INSERT INTO entities(collection_name,entity_id,payload,position_index) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE payload=VALUES(payload)",[collection,value.id,JSON.stringify(value),position++]);}
 const settings=entries.find(r=>r.collection_name==="settings")?.value??{id:"main",flow:config("flow").DEFAULT_FLOW_CONFIG,rates:config("box-categories").BOX_CATEGORIES};
 settings.flow.destinationCities=[...new Set([...settings.flow.destinationCities,...data.warehouses.filter(w=>(w.kind??"destino")!=="origen").map(w=>w.city)])];
 await save("settings",settings);
 const locations=[];
 for(const input of data.warehouses){
   const old=entries.find(r=>r.collection_name==="warehouses"&&(r.value.name===input.name||r.value.address===input.address))?.value;
   const value=old??{...input,id:randomUUID(),active:true,arrivalMessage:"Tu paquete {codigo} ya está en {almacen}, {destino}. Coordina su retiro con nuestro equipo; la entrega requiere el pago liquidado."};
   locations.push(value);if(!old)await save("warehouses",value);
 }
 const created=[];
 for(const person of data.operators){
   const email=person.email.toLowerCase();
   const [existing]=await db.execute("SELECT user_id,role FROM accounts WHERE email=?",[email]);
   if(existing.length){if(existing[0].role!=="operador")throw new Error("Una cuenta existente requiere revisión manual; no se cambiará su rol.");continue;}
   const warehouse=locations.find(w=>w.name===person.warehouse);
   if(!warehouse)throw new Error("Almacén desconocido");
   const id=randomUUID(), salt=randomBytes(16).toString("hex");
   const hash="scrypt$32768$"+salt+"$"+scryptSync(randomBytes(32).toString("base64url"),salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString("hex");
   const user={id,role:"operador",firstName:person.firstName,paternalLastName:person.paternalLastName,email,phone:"",active:true,lockerCode:"",internalNotes:[],activity:[],warehouseGrants:[{warehouseId:warehouse.id,receive:true,viewContacts:true}]};
   if(apply)await db.execute("INSERT INTO accounts(user_id,email,password_hash,role,active) VALUES (?,?,?,'operador',TRUE)",[id,email,hash]);
   await save("users",user);
   if(apply){
     if(process.env.EMAIL_DELIVERY!=="preview")throw new Error("La importación solo prepara invitaciones en modo preview.");
     if(!process.env.AUTH_SECRET||process.env.AUTH_SECRET.length<32)throw new Error("Falta configuración segura.");
     const token=randomBytes(32).toString("base64url"),expiresAt=new Date(Date.now()+86400000);
     await db.execute("INSERT INTO auth_tokens(token_hash,user_id,purpose,expires_at) VALUES (?,?,'invite',?)",[createHash("sha256").update(token).digest("hex"),id,expiresAt]);
     const emailData={to:email,subject:"Tu acceso de almacén · A&L",heading:"Tu acceso de almacén está listo",body:"Hola "+person.firstName+". Elige tu contraseña para activar tu acceso de recepción y consulta de contactos.",actionLabel:"Activar mi cuenta",actionUrl:new URL("/restablecer?token="+token,process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3100").href,expiresAt:expiresAt.toISOString()};
     const iv=randomBytes(12),cipher=createCipheriv("aes-256-gcm",createHash("sha256").update(process.env.AUTH_SECRET).digest(),iv);
     const encrypted=Buffer.concat([cipher.update(JSON.stringify(emailData)),cipher.final()]);
     await db.execute("INSERT INTO email_outbox(id,payload) VALUES (?,?)",[randomUUID(),JSON.stringify({iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:encrypted.toString("base64")})]);
   }
   created.push(person.firstName+" "+person.paternalLastName);
 }
 if(apply){await db.execute("INSERT INTO security_audit(event_type) VALUES ('setup.operational-locations')");await db.commit();}else await db.rollback();
 console.log(JSON.stringify({mode:apply?"applied":"preview",warehouses:locations.map(w=>({name:w.name,address:w.address})),newOperators:created,externalEmailsSent:false}));
}catch(error){await db.rollback();throw error;}finally{await db.end();}
