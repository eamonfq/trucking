import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) throw new Error('Configura DATABASE_URL antes de ejecutar las migraciones.');
const url = new URL(process.env.DATABASE_URL);
const database = url.pathname.slice(1);
if (!/^ayl_[a-z0-9_]+$/.test(database)) throw new Error('Database must use the isolated ayl_ prefix.');
const connection = await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),multipleStatements:true});
try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.changeUser({database});
  await connection.query(await readFile(new URL('../migrations/001-real-system.sql', import.meta.url),'utf8'));
  await connection.query(await readFile(new URL('../migrations/002-private-files.sql', import.meta.url),'utf8'));
  const [applied] = await connection.query("SELECT version FROM schema_migrations WHERE version=3");
  if (!applied.length) await connection.query(await readFile(new URL('../migrations/003-warehouse-operators.sql', import.meta.url),'utf8'));
  const [warehouseKinds] = await connection.query("SELECT version FROM schema_migrations WHERE version=4");
  if (!warehouseKinds.length) {
    await connection.beginTransaction();
    try {
      await connection.query("SELECT id FROM operation_lock WHERE id=1 FOR UPDATE");
      await connection.query(await readFile(new URL('../migrations/004-warehouse-kinds.sql', import.meta.url),'utf8'));
      await connection.commit();
    } catch(error) { await connection.rollback(); throw error; }
  }
  console.log(`Migraciones 001–004 aplicadas en ${database}. No se importaron usuarios ni operaciones de demo.`);
} finally { await connection.end(); }
