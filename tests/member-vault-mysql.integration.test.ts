/** MySQL 8.4 synthetic membership fixture. Refuses every non-CI database URL. */
import { beforeAll,afterAll,describe,expect,it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import mysql,{type Pool,type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { bootstrapDatabase } from '../db/bootstrap';
import { memberVault } from '../api/member-vault';
import { signUserToken } from '../api/lib/userToken';
import { closeDb } from '../api/queries/connection';

const DATABASE='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_member_ci';
const fixture=process.env.GITHUB_ACTIONS==='true'&&
  process.env.LUQI_MEMBER_VAULT_CI_FIXTURE==='true'&&process.env.DATABASE_URL===DATABASE;
let pool:Pool;
let owner:{id:number,token:string};
let other:{id:number,token:string};
let free:{id:number,token:string};
const quote={businessName:'Bantu Studio',customerName:'Synthetic client',
  reference:'Q-001',rows:[{description:'Design and layout',quantity:2,unitPriceZar:'100.25'}]};
const draft={title:'Client quotation',quote};

async function account(){
  const hash=await bcrypt.hash('Synthetic-Member-Account-Fixture!',4);
  const [row]=await pool.execute<ResultSetHeader>(
    'INSERT INTO users (email,password_hash,is_active) VALUES (?,?,1)',
    ['member-'+randomUUID()+'@example.invalid',hash]);
  return {id:row.insertId,token:signUserToken(row.insertId,hash)};
}
async function entitle(userId:number,plan:'starter'|'creator'='starter'){
  await pool.execute(
    "INSERT INTO luqi_member_entitlements_v1 "+
    "(user_id,plan,status,source,valid_until) VALUES (?,?,'active','merchant_verified',"+
    "DATE_ADD(UTC_TIMESTAMP(6),INTERVAL 1 DAY))",[userId,plan]);
}
function request(token:string,path:string,method='GET',payload?:unknown){
  return memberVault.request(path,{method,headers:{
    Authorization:'Bearer '+token,'Content-Type':'application/json'},
    ...(payload===undefined?{}:{body:JSON.stringify(payload)})});
}
async function create(token:string,payload=draft){
  const r=await request(token,'/','POST',payload);
  expect(r.status).toBe(201);
  return (await r.json()).project;
}
describe.skipIf(!fixture).sequential('member projects on disposable MySQL 8.4 only',()=>{
  beforeAll(async()=>{
    if(!fixture)throw Error('Refusing non-isolated project vault fixture');
    process.env.JWT_SECRET='ci-member-vault-only-secret-with-32-bytes';
    process.env.LUQI_MEMBER_VAULT_ENABLED='true';
    pool=mysql.createPool(DATABASE);
    await bootstrapDatabase();
    const sql=readFileSync('db/migrations/20261025_member_vault.sql','utf8')
      .replace(/^\s*--.*$/gm,'');
    for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))
      await pool.query(statement);
    // Repeat additive DDL on the empty, disposable target.
    for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))
      await pool.query(statement);
    owner=await account();other=await account();free=await account();
    await entitle(owner.id);
    await entitle(other.id,'creator');
  },60_000);
  afterAll(async()=>{
    if(pool)await pool.end();
    await closeDb();
  });
  it('rejects anonymous use before exposing membership or owner data',async()=>{
    expect((await memberVault.request('/status')).status).toBe(401);
    expect((await memberVault.request('/')).status).toBe(401);
    expect((await request('forged-token','/')).status).toBe(401);
  });
  it('never creates a project from a free or unverified entitlement',async()=>{
    const status=await request(free.token,'/status');
    expect(await status.json()).toEqual({enabled:true,member:false});
    const response=await request(free.token,'/','POST',draft);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({code:'MEMBERSHIP_REQUIRED'});
    const listed=await request(free.token,'/');
    expect((await listed.json()).projects).toEqual([]);
  });
  it('saves and reopens owned client quotations on independent requests',async()=>{
    const status=await request(owner.token,'/status');
    expect(await status.json()).toEqual({
      enabled:true,member:true,plan:'starter',maxProjects:12,used:0,
    });
    const saved=await create(owner.token);
    expect(saved).toMatchObject({title:draft.title,revision:1,quote});
    const own=await request(owner.token,'/'+saved.id);
    expect(own.status).toBe(200);
    expect((await own.json()).project.quote).toEqual(quote);
    const list=await request(owner.token,'/');
    expect((await list.json()).projects).toMatchObject([{id:saved.id,title:draft.title}]);
    for(const path of ['/'+saved.id,'/'+saved.id+'?user_id='+owner.id]){
      const foreign=await request(other.token,path);
      expect(foreign.status).toBe(path.includes('?')?400:404);
    }
    const forged=await request(owner.token,'/','POST',{...draft,userId:other.id});
    expect(forged.status).toBe(400);
    const unknown=await request(owner.token,'/'+randomUUID());
    expect(unknown.status).toBe(404);
    const revised=await request(owner.token,'/'+saved.id,'PUT',{
      expectedRevision:1,title:'Updated title',quote:{...quote,reference:'Q-002'},
    });
    expect(revised.status).toBe(200);
    expect((await revised.json()).project).toMatchObject({revision:2,title:'Updated title'});
    expect((await request(owner.token,'/'+saved.id,'PUT',{
      expectedRevision:1,...draft,
    })).status).toBe(409);
    expect((await request(owner.token,'/'+saved.id,'DELETE',{
      confirm:true,expectedRevision:1,
    })).status).toBe(409);
    const deleted=await request(owner.token,'/'+saved.id,'DELETE',{
      confirm:true,expectedRevision:2,
    });
    expect(await deleted.json()).toEqual({id:saved.id,deleted:true});
    expect((await request(owner.token,'/'+saved.id)).status).toBe(404);
  });
  it('allows accessing/deleting owned data after expiry but refuses creation/edit',async()=>{
    const saved=await create(owner.token);
    await pool.execute("UPDATE luqi_member_entitlements_v1 SET status='past_due' WHERE user_id=?",
      [owner.id]);
    try{
      expect((await request(owner.token,'/','POST',draft)).status).toBe(403);
      expect((await request(owner.token,'/'+saved.id,'PUT',{
        expectedRevision:1,...draft,
      })).status).toBe(403);
      expect((await request(owner.token,'/'+saved.id)).status).toBe(200);
      const deleted=await request(owner.token,'/'+saved.id,'DELETE',{
        confirm:true,expectedRevision:1,
      });
      expect(deleted.status).toBe(200);
    }finally{
      await pool.execute("UPDATE luqi_member_entitlements_v1 SET status='active' WHERE user_id=?",
        [owner.id]);
    }
  });
  it('serializes the 12-project starter quota across concurrent replicas',async()=>{
    const quota=await account();await entitle(quota.id);
    const sample=JSON.stringify(quote);
    for(let i=0;i<11;i++){
      await pool.execute(
        "INSERT INTO luqi_member_projects_v1 (id,user_id,kind,title,document) "+
        "VALUES (?,?,'quote',?,?)",
        [randomUUID(),quota.id,'Seeded synthetic project',sample]);
    }
    const responses=await Promise.all(Array.from({length:7},()=>request(quota.token,'/','POST',draft)));
    expect(responses.filter(r=>r.status===201)).toHaveLength(1);
    expect(responses.filter(r=>r.status===429)).toHaveLength(6);
    const [count]=await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM luqi_member_projects_v1 WHERE user_id=?',[quota.id]);
    expect(Number(count[0].total)).toBe(12);
  });
  it('revokes both project access and write authority after account deactivation',async()=>{
    const user=await account();await entitle(user.id);
    const project=await create(user.token);
    await pool.execute('UPDATE users SET is_active=0 WHERE id=?',[user.id]);
    expect((await request(user.token,'/'+project.id)).status).toBe(401);
    expect((await request(user.token,'/','POST',draft)).status).toBe(401);
  });
  it('removes active project rows after user deletion, not just the login token',async()=>{
    const user=await account();await entitle(user.id);
    const project=await create(user.token);
    await pool.execute('DELETE FROM users WHERE id=?',[user.id]);
    const [projects]=await pool.execute<RowDataPacket[]>(
      'SELECT id FROM luqi_member_projects_v1 WHERE id=?',[project.id]);
    const [membership]=await pool.execute<RowDataPacket[]>(
      'SELECT user_id FROM luqi_member_entitlements_v1 WHERE user_id=?',[user.id]);
    expect(projects).toEqual([]);expect(membership).toEqual([]);
  });
  it('fails safely on missing table or failed write, never using volatile fallback',async()=>{
    const user=await account();await entitle(user.id);
    await pool.query(
      "CREATE TRIGGER member_fixture_deny BEFORE INSERT ON luqi_member_projects_v1 "+
      "FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='private-internal-details'");
    try{
      const denied=await request(user.token,'/','POST',draft);
      expect(denied.status).toBe(503);
      expect(await denied.json()).toEqual({code:'MEMBER_VAULT_STORAGE_UNAVAILABLE'});
      const [records]=await pool.execute<RowDataPacket[]>(
        'SELECT id FROM luqi_member_projects_v1 WHERE user_id=?',[user.id]);
      expect(records).toEqual([]);
    }finally{await pool.query('DROP TRIGGER member_fixture_deny');}
  });
});
