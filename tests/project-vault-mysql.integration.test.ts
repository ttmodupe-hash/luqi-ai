/** Destructive synthetic MySQL fixture ONLY; rejects all external databases. */
import { describe, beforeAll, afterAll, expect, it } from 'vitest';
import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { bootstrapDatabase } from '../db/bootstrap';
import { checkRuntimeSchema } from '../db/runtimeSchema';
import { closeDb } from '../api/queries/connection';
import { signUserToken } from '../api/lib/userToken';
import { privateProjectVault as api } from '../api/private-project-vault';

const DATABASE = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_vault_ci';
const fixture = process.env.GITHUB_ACTIONS === 'true' &&
  process.env.LUQI_PROJECT_VAULT_CI_FIXTURE === 'true' && process.env.DATABASE_URL === DATABASE;
const sealed = {
  format: 'luqi.vault.sealed.v1', kdf: 'PBKDF2-SHA256-310000',
  salt: Buffer.alloc(16, 4).toString('base64'),
  nonce: Buffer.alloc(12, 5).toString('base64'),
  ciphertext: Buffer.alloc(32, 6).toString('base64'),
};
let db: Pool, owner: { id: number; token: string }, other: { id: number; token: string };
async function account() {
  const hash = await bcrypt.hash('Synthetic-Vault-Passphrase-For-Isolated-CI', 4);
  const [created] = await db.execute<ResultSetHeader>(
    'INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)',
    ['vault-'+randomUUID()+'@example.invalid',hash]);
  const id = created.insertId;
  return {id,token:signUserToken(id,hash)};
}
function call(token: string|undefined,method: string,path: string,body?: unknown) {
  return api.request(path,{method,headers:{
    ...(token ? { Authorization:'Bearer '+token }:{}),
    ...(body === undefined?{}:{'Content-Type':'application/json'}),
  },...(body === undefined?{}:{body:JSON.stringify(body)})});
}
const write = (token: string,id: string,expectedRevision:number,kind='quote') =>
  call(token,'PUT','/'+id,{kind,expectedRevision,sealed});
const remove = (token: string,id:string,revision:number) =>
  call(token,'POST','/'+id+'/remove',{confirm:true,expectedRevision:revision});
describe.skipIf(!fixture).sequential('isolated owner-scoped encrypted project MySQL', () => {
  beforeAll(async () => {
    if (!fixture) throw Error('Refusing non-isolated database');
    process.env.JWT_SECRET = 'ci-only-private-vault-jwt-secret-long-enough';
    process.env.LUQI_PROJECT_VAULT_ENABLED = 'true';
    db = mysql.createPool(DATABASE);
    const [tables] = await db.query<RowDataPacket[]>('SHOW TABLES');
    expect(tables).toHaveLength(0);
    await bootstrapDatabase();
    owner = await account(); other = await account();
  },60_000);
  afterAll(async () => {
    if(db) await db.end();
    await closeDb();
  });
  it('fails closed with missing optional table and does not migrate on request', async () => {
    const result = await call(owner.token,'GET','/status');
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({code:'PROJECT_STORAGE_UNAVAILABLE'});
    const [tables] = await db.query<RowDataPacket[]>("SHOW TABLES LIKE 'luqi_project_vault_v1'");
    expect(tables).toHaveLength(0);
    // Operator explicitly applies schema; two applications preserve data.
    const ddl=readFileSync('db/migrations/20261025_project_vault.sql','utf8');
    await db.query(ddl);
    await db.query(ddl);
    expect(await checkRuntimeSchema({DATABASE_URL:DATABASE,LUQI_PROJECT_VAULT_ENABLED:'true'}))
      .toEqual({status:'validated',tables:9});
  });
  it('requires validated bearer credentials even when feature is disabled', async () => {
    expect((await call(undefined,'GET','/status')).status).toBe(401);
    expect((await call('forged-token','GET','/status')).status).toBe(401);
    process.env.LUQI_PROJECT_VAULT_ENABLED='false';
    try {
      const result=await call(owner.token,'PUT','/'+randomUUID(),{kind:'quote',expectedRevision:0,sealed});
      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({code:'PROJECT_VAULT_DISABLED'});
    } finally {process.env.LUQI_PROJECT_VAULT_ENABLED='true';}
    const status=await call(owner.token,'GET','/status');
    expect(status.status).toBe(200);
    expect(await status.json()).toMatchObject({availability:'configured',subscriptionActive:false});
  });
  it('persists only ciphertext for an owner; same UUID can belong to different owners', async () => {
    const id=randomUUID();
    const created=await write(owner.token,id,0);
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({saved:true,id,revision:1,created:true});
    const foreign=await call(other.token,'GET','/'+id);
    expect(foreign.status).toBe(404);
    expect((await call(other.token,'GET','/')).status).toBe(200);
    expect(await (await call(other.token,'GET','/')).json()).toEqual({projects:[]});
    const own=await call(owner.token,'GET','/'+id);
    expect(own.status).toBe(200);
    expect(await own.json()).toMatchObject({project:{id,kind:'quote',revision:1,sealed}});
    const same=await write(other.token,id,0,'sales');
    expect(same.status).toBe(201);
    const second=await call(other.token,'GET','/'+id);
    expect(await second.json()).toMatchObject({project:{id,kind:'sales',revision:1,sealed}});
    const [stored]=await db.execute<RowDataPacket[]>(
      'SELECT owner_id,kind,sealed FROM luqi_project_vault_v1 WHERE id=? ORDER BY owner_id',[id]);
    expect(stored).toHaveLength(2);
    expect(stored.map(row=>row.kind)).toEqual(['quote','sales']);
    expect(JSON.stringify(stored)).not.toContain('Synthetic-Vault-Passphrase');
  });
  it('enforces revision-based compare-and-swap rather than overwriting from another device', async () => {
    const id=randomUUID();
    expect((await write(owner.token,id,1)).status).toBe(409);
    expect((await write(owner.token,id,0)).status).toBe(201);
    expect((await write(owner.token,id,0)).status).toBe(409);
    const updated=await write(owner.token,id,1);
    expect(updated.status).toBe(200);
    expect(await updated.json()).toMatchObject({revision:2,created:false});
    expect((await write(owner.token,id,1)).status).toBe(409);
    expect((await write(owner.token,id,2,'sales')).status).toBe(409);
    expect(await (await call(owner.token,'GET','/'+id)).json()).toMatchObject({project:{revision:2,kind:'quote'}});
  });
  it('requires explicit version-bound deletion and never removes another account project', async () => {
    const id=randomUUID();
    expect((await write(owner.token,id,0)).status).toBe(201);
    expect((await remove(other.token,id,1)).status).toBe(404);
    expect((await remove(owner.token,id,2)).status).toBe(409);
    expect((await call(owner.token,'POST','/'+id+'/remove',{confirm:false,expectedRevision:1})).status).toBe(400);
    const removed=await remove(owner.token,id,1);
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({removed:true,id});
    expect((await remove(owner.token,id,1)).status).toBe(404);
    expect((await call(owner.token,'GET','/'+id)).status).toBe(404);
  });
  it('keeps 20 records per owner under concurrent admissions and frees capacity on delete', async () => {
    const q=await account();
    const ids=Array.from({length:24},()=>randomUUID());
    const outcomes=await Promise.all(ids.map(id=>write(q.token,id,0)));
    expect(outcomes.filter(r=>r.status===201)).toHaveLength(20);
    expect(outcomes.filter(r=>r.status===429)).toHaveLength(4);
    const listed=await call(q.token,'GET','/');
    expect((await listed.json()).projects).toHaveLength(20);
    const first=ids[outcomes.findIndex(x=>x.status===201)];
    expect((await remove(q.token,first,1)).status).toBe(200);
    expect((await write(q.token,randomUUID(),0)).status).toBe(201);
  });
  it('redacts SQL failures, rolls back write and does not invent a saved revision', async () => {
    const id=randomUUID();
    await db.query("CREATE TRIGGER vault_ci_block_insert BEFORE INSERT ON luqi_project_vault_v1 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private-customer-leak'");
    try {
      const result=await write(owner.token,id,0);
      expect(result.status).toBe(503);
      expect(await result.json()).toEqual({code:'PROJECT_STORAGE_UNAVAILABLE'});
      const [rows]=await db.execute<RowDataPacket[]>('SELECT id FROM luqi_project_vault_v1 WHERE owner_id=? AND id=?',[owner.id,id]);
      expect(rows).toHaveLength(0);
    } finally {await db.query('DROP TRIGGER vault_ci_block_insert');}
    expect((await write(owner.token,id,0)).status).toBe(201);
  });
  it('denies deactivated users and invalidated password-bound tokens', async () => {
    const user=await account();
    await db.execute('UPDATE users SET is_active=0 WHERE id=?',[user.id]);
    expect((await call(user.token,'GET','/')).status).toBe(401);
    const fresh=await account();
    await db.execute('UPDATE users SET password_hash=? WHERE id=?',
      [await bcrypt.hash('Revoked-Token-In-Isolated-Fixture!',4),fresh.id]);
    expect((await call(fresh.token,'GET','/')).status).toBe(401);
  });
});
