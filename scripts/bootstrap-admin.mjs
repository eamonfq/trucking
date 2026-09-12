import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import { randomBytes, scryptSync, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
const db = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await db.beginTransaction();
  await db.query('SELECT id FROM operation_lock WHERE id=1 FOR UPDATE');
  const [existing] = await db.query("SELECT user_id FROM accounts WHERE role='admin' LIMIT 1");
  if (existing.length) { await db.rollback(); console.log('Ya existe un administrador. No se modificó su acceso.'); }
  else {
    const email = process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@ayl.local';
    const password = randomBytes(18).toString('base64url') + 'Aa1!';
    const salt = randomBytes(16).toString('hex');
    const hash = `scrypt$32768$${salt}$${scryptSync(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
    const id = `admin-${randomUUID()}`;
    const user = {id,role:'admin',firstName:'Operaciones',paternalLastName:'A&L',email,phone:'',lockerCode:'ADMIN',active:true,internalNotes:[],activity:[]};
    await db.execute("INSERT INTO accounts(user_id,email,password_hash,role,verified_at) VALUES (?,?,?,'admin',UTC_TIMESTAMP(3))",[id,email,hash]);
    await db.execute("INSERT INTO entities(collection_name,entity_id,payload) VALUES ('users',?,?)",[id,JSON.stringify(user)]);
    await mkdir('.local',{recursive:true});
    await writeFile('.local/admin-access.txt',`Acceso local A&L\nURL: http://localhost:3100/login\nCorreo: ${email}\nContraseña: ${password}\n\nGuarda esta contraseña en tu gestor y elimina este archivo. No se envió por correo.\n`,{flag:'wx'});
    await db.commit();
    console.log('Administrador creado. Credenciales en .local/admin-access.txt (no versionado).');
  }
} catch(error) { await db.rollback(); throw error; } finally { await db.end(); }
