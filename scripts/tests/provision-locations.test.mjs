import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';

test('location import previews, applies, invites and repeats safely in isolated MySQL', async()=>{
  nextEnv.loadEnvConfig(process.cwd(),false);
  const url=new URL(process.env.DATABASE_URL);
  const name='ayl_test_'+randomUUID().replaceAll('-','');
  const db=await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),multipleStatements:true});
  try {
    await db.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4`);
    await db.changeUser({database:name});
    for(const migration of ['001-real-system','002-private-files','003-warehouse-operators','004-warehouse-kinds'])await db.query(await readFile(new URL(`../../migrations/${migration}.sql`,import.meta.url),'utf8'));
    url.pathname='/'+name;
    const env={...process.env,DATABASE_URL:url.href,EMAIL_DELIVERY:'preview',AUTH_SECRET:'isolated-import-test-secret-at-least-32-characters',AYL_AGUSTIN_EMAIL:'',AYL_PABLO_EMAIL:'',AYL_EMILIA_EMAIL:''};
    const run=(args=[],extra={})=>JSON.parse(execFileSync(process.execPath,['scripts/provision-operational-locations.mjs',...args],{env:{...env,...extra},encoding:'utf8'}));
    const count=async table=>(await db.query(`SELECT COUNT(*) AS total FROM ${table}`))[0][0].total;
    assert.equal(run().newOperators.length,2);
    assert.equal(await count('entities'),0);
    const applied=run(['--apply']);
    assert.equal(applied.newOperators.length,2);
    assert.equal(applied.pendingOperators.length,3);
    assert.equal(await count('accounts'),2);
    assert.equal(await count('email_outbox'),0);
    const [accounts]=await db.query('SELECT user_id,password_hash,role FROM accounts ORDER BY user_id');
    assert.ok(accounts.every(a=>a.role==='operador'&&a.password_hash.startsWith('scrypt$32768$')));
    const [locations]=await db.query("SELECT payload FROM entities WHERE collection_name='warehouses'");
    const values=locations.map(r=>typeof r.payload==='string'?JSON.parse(r.payload):r.payload);
    assert.equal(values.filter(w=>w.kind==='origen').length,2);
    assert.equal(values.filter(w=>w.kind==='destino').length,1);
    const [settings]=await db.query("SELECT payload FROM entities WHERE collection_name='settings'");
    const config=typeof settings[0].payload==='string'?JSON.parse(settings[0].payload):settings[0].payload;
    assert.ok(!config.flow.destinationCities.includes('El Paso, Texas'));
    assert.ok(config.flow.destinationCities.includes('Valle de Juárez, Jalisco'));
    assert.equal(run(['--apply','--invite']).invitations.length,2);
    assert.equal(await count('email_outbox'),2);
    assert.equal(run(['--apply','--invite']).invitations.length,0);
    assert.equal(await count('accounts'),2);
    assert.equal(await count('email_outbox'),2);
    assert.deepEqual((await db.query('SELECT user_id,password_hash,role FROM accounts ORDER BY user_id'))[0],accounts);
    const completed=run(['--apply'],{AYL_AGUSTIN_EMAIL:'agustin@example.invalid',AYL_PABLO_EMAIL:'pablo@example.invalid',AYL_EMILIA_EMAIL:'emilia@example.invalid'});
    assert.equal(completed.newOperators.length,3);
    assert.equal(completed.pendingOperators.length,0);
    assert.equal(await count('accounts'),5);
  } finally {
    // Only delete the random test database created above, never an existing database.
    if(/^ayl_test_[a-f0-9]{32}$/.test(name))await db.query(`DROP DATABASE IF EXISTS \`${name}\``);
    await db.end();
  }
});
