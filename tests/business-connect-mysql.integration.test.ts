/** Exact disposable fixture only. No production credentials, DDL or customer data. */
import {describe,beforeAll,afterAll,it,expect} from 'vitest';
import mysql,{type Pool,type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {bootstrapDatabase} from '../db/bootstrap';
import {checkRuntimeSchema} from '../db/runtimeSchema';
import {signUserToken} from '../api/lib/userToken';
import {closeDb} from '../api/queries/connection';
import {businessConnect as app} from '../api/business-connect';
import {businessFixture} from './fixtures/business-connect';
const DATABASE='mysql://root:ci-business-fixture-only@127.0.0.1:3306/luqi_business_ci';
const fixture=process.env.GITHUB_ACTIONS==='true'&&process.env.LUQI_BUSINESS_CI_FIXTURE==='true'&&process.env.DATABASE_URL===DATABASE;
type Account={id:number;token:string};let db:Pool,owner:Account,other:Account,reviewer:Account,id:string,revision:number;
const call=(a:Account|null,path:string,body?:unknown,method=body===undefined?'GET':'POST')=>app.request(path,{method,headers:{...(a?{Authorization:'Bearer '+a.token}:{}),...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
const save=(a:Account,id:string,rev=0,profile=businessFixture())=>call(a,'/mine/'+id,{expectedRevision:rev,profile},'PUT');
const act=(a:Account,kind:string,id:string,revision:number)=>call(a,'/mine/'+id+'/'+kind,{confirm:true,expectedRevision:revision});
const review=(a:Account,id:string,rev:number,decision='approve',extra:object={})=>call(a,'/moderation/profiles/'+id,{expectedRevision:rev,confirm:true,decision,reason:'checked',method:'content_only',contactConfirmed:false,locationReview:'unreviewed',attested:true,...extra});
async function account(role='user'):Promise<Account>{const hash=await bcrypt.hash('Isolated-Business-Connect-Passphrase',4);const [r]=await db.execute<ResultSetHeader>(
  'INSERT INTO users (email,password_hash,is_active,role) VALUES (?,?,1,?)',['business-'+randomUUID()+'@example.invalid',hash,role]);return {id:r.insertId,token:signUserToken(r.insertId,hash)};}
describe.skipIf(!fixture).sequential('isolated Business Connect MySQL migration and lifecycle',()=>{
  beforeAll(async()=>{
    if(!fixture)throw Error('Refusing non-disposable database');
    process.env.JWT_SECRET='ci-only-business-connect-secret-12345678901234567890';process.env.LUQI_BUSINESS_CONNECT_ENABLED='false';process.env.LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED='false';
    db=mysql.createPool(DATABASE);const [tables]=await db.query<RowDataPacket[]>('SHOW TABLES');expect(tables).toHaveLength(0);
    await bootstrapDatabase();owner=await account();other=await account();reviewer=await account('admin');process.env.LUQI_BUSINESS_REVIEWER_IDS=String(reviewer.id);
  },60000);
  afterAll(async()=>{if(db)await db.end();await closeDb();});
  it('fails closed when off or missing optional tables without auto-migrating on request',async()=>{
    expect((await call(owner,'/mine')).status).toBe(503);process.env.LUQI_BUSINESS_CONNECT_ENABLED='true';
    const r=await call(owner,'/mine');expect(r.status).toBe(503);expect(await r.json()).toEqual({code:'BUSINESS_STORAGE_UNAVAILABLE'});
    const [tables]=await db.query<RowDataPacket[]>("SHOW TABLES LIKE 'luqi_business_%'");expect(tables).toHaveLength(0);
  });
  it('applies additive DDL twice without modifying core data and validates MySQL 8 contracts',async()=>{
    const sql=readFileSync('db/migrations/20261030_business_connect.sql','utf8');
    expect(sql).not.toMatch(/\b(?:ALTER|DROP|TRUNCATE|GRANT|INSERT)\s/i);
    const statements=sql.replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean);expect(statements).toHaveLength(4);
    for(let pass=0;pass<2;pass++)for(const statement of statements)await db.query(statement);
    const [users]=await db.query<RowDataPacket[]>('SELECT id FROM users');expect(users).toHaveLength(3);
    expect(await checkRuntimeSchema({...process.env,DATABASE_URL:DATABASE,LUQI_BUSINESS_CONNECT_ENABLED:'true'})).toEqual({status:'validated',tables:12});
  });
  it('creates an owner draft and rejects another user editing or approving it',async()=>{
    id=randomUUID();expect((await save(owner,id)).status).toBe(201);revision=1;
    expect((await save(other,id,revision)).status).toBe(404);expect((await review(other,id,revision)).status).toBe(403);
    expect((await call(null,'/directory')).status).toBe(401);
    expect(await (await call(other,'/directory')).json()).toEqual({businesses:[],nextPage:null});
    expect((await call(other,'/mine/'+id+'/history')).status).toBe(404);
  });
  it('requires owner publication consent, then independent human moderation before discovery',async()=>{
    const p=businessFixture();p.consent.publicListing=false;expect((await save(owner,id,revision,p)).status).toBe(200);revision++;
    expect((await act(owner,'submit',id,revision)).status).toBe(400);
    expect((await save(owner,id,revision)).status).toBe(200);revision++;
    expect((await act(owner,'submit',id,revision)).status).toBe(200);revision++;
    expect((await call(other,'/directory/'+id)).status).toBe(404);
    const approved=await review(reviewer,id,revision);expect(approved.status).toBe(200);revision++;
    expect((await approved.json()).business.verification).toEqual({ownerApproved:true,contactConfirmed:false,locationReview:'unreviewed',providerListing:'not_checked'});
  });
  it('returns only public fields and never matches hidden contacts or private business names',async()=>{
    const r=await call(other,'/directory/'+id);expect(r.status).toBe(200);const p=(await r.json()).business;
    expect(p.contacts).toEqual({whatsapp:'+27 82 555 0102'});expect(p.publicPoint).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(/private-owner|Private Sewing Enterprise|owner_id|ownerConfirmedName/);
    for(const q of ['private-owner','Private Sewing Enterprise','%','_'])expect((await (await call(other,'/directory?q='+encodeURIComponent(q))).json()).businesses).toHaveLength(0);
    expect((await (await call(other,'/directory?q=diaparo&language=tn&category=repairs&province=GP')).json()).businesses).toHaveLength(1);
    process.env.LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED='true';
    try{expect((await call(null,'/directory/'+id)).status).toBe(200);expect((await call(null,'/mine')).status).toBe(401);}finally{process.env.LUQI_BUSINESS_CONNECT_PUBLIC_ENABLED='false';}
  });
  it('serializes competing edits, unpublishes edited content and clears verification',async()=>{
    const results=await Promise.all([save(owner,id,revision),save(owner,id,revision)]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);revision++;
    expect((await call(other,'/directory/'+id)).status).toBe(404);
    const b=(await (await call(owner,'/mine')).json()).businesses.find((b:{id:string})=>b.id===id);expect(b.state).toBe('draft');expect(b.verification.ownerApproved).toBe(false);
    expect((await act(owner,'submit',id,revision)).status).toBe(200);revision++;
    expect((await review(reviewer,id,revision)).status).toBe(200);revision++;
  });
  it('prevents duplicate claims under concurrency and accepts private human-review appeals',async()=>{
    const a=await account(),b=await account(),profile=businessFixture('Mamas Sewing Market');
    const results=await Promise.all([save(a,randomUUID(),0,profile),save(b,randomUUID(),0,{...profile,tradingName:'Mama’s-Sewing Market'})]);
    expect(results.map(r=>r.status).sort()).toEqual([201,409]);
    const appeal=await call(b,'/reports',{businessId:null,kind:'duplicate_claim',details:'Please review my authority for this duplicate business claim.'});expect(appeal.status).toBe(201);
  });
  it('routes reports to moderators, permits suspension and blocks editing as a suspension bypass',async()=>{
    expect((await call(other,'/reports',{businessId:id,kind:'impersonation',details:'Please investigate a disputed business ownership claim.'})).status).toBe(201);
    const queue=await call(reviewer,'/moderation/queue');expect((await queue.json()).businesses.some((b:{id:string})=>b.id===id)).toBe(true);
    expect((await review(reviewer,id,revision,'suspend',{reason:'impersonation'})).status).toBe(200);revision++;
    expect((await call(other,'/directory/'+id)).status).toBe(404);
    expect((await save(owner,id,revision)).status).toBe(200);revision++;
    expect((await act(owner,'submit',id,revision)).status).toBe(403);
    expect((await review(reviewer,id,revision,'release')).status).toBe(200);revision++;
    expect((await act(owner,'submit',id,revision)).status).toBe(200);revision++;
    expect((await review(reviewer,id,revision)).status).toBe(200);revision++;
  });
  it('requires both a configured reviewer and current admin role, and refuses self-review',async()=>{
    const admin=await account('admin');expect((await call(admin,'/moderation/queue')).status).toBe(403);
    process.env.LUQI_BUSINESS_REVIEWER_IDS=reviewer.id+','+owner.id;expect((await call(owner,'/moderation/queue')).status).toBe(403);
    const ownId=randomUUID();expect((await save(reviewer,ownId,0,businessFixture('Reviewer Owned Business'))).status).toBe(201);
    expect((await act(reviewer,'submit',ownId,1)).status).toBe(200);expect((await review(reviewer,ownId,2)).status).toBe(403);
    await db.execute("UPDATE users SET role='user' WHERE id=?",[reviewer.id]);expect((await call(reviewer,'/moderation/queue')).status).toBe(403);
    await db.execute("UPDATE users SET role='admin' WHERE id=?",[reviewer.id]);process.env.LUQI_BUSINESS_REVIEWER_IDS=String(reviewer.id);
  });
  it('removes listings when the owner account is revoked and rejects revoked writes',async()=>{
    await db.execute('UPDATE users SET is_active=0 WHERE id=?',[owner.id]);
    expect((await call(other,'/directory/'+id)).status).toBe(404);expect((await save(owner,id,revision)).status).toBe(401);
    await db.execute('UPDATE users SET is_active=1 WHERE id=?',[owner.id]);expect((await call(other,'/directory/'+id)).status).toBe(200);
  });
  it('deletes profile and reports immediately while retaining only minimal expiring audit metadata',async()=>{
    expect((await act(owner,'delete',id,revision)).status).toBe(200);expect((await call(other,'/directory/'+id)).status).toBe(404);
    const [profiles]=await db.execute<RowDataPacket[]>('SELECT id FROM luqi_business_profiles_v1 WHERE id=?',[id]);expect(profiles).toHaveLength(0);
    const [reports]=await db.execute<RowDataPacket[]>('SELECT id FROM luqi_business_reports_v1 WHERE business_id=?',[id]);expect(reports).toHaveLength(0);
    const [audit]=await db.query<RowDataPacket[]>('SELECT action,metadata,business_id FROM luqi_business_audit_v1');
    expect(audit.some(r=>r.action==='deleted'&&r.business_id===null)).toBe(true);
    expect(JSON.stringify(audit)).not.toMatch(/private-owner|82 555|Private Sewing Enterprise|Clothing repairs/);
  });
  it('applies documented retention without deleting published listings or core accounts',async()=>{
    const expired=randomUUID();expect((await save(other,expired,0,businessFixture('Expired Draft'))).status).toBe(201);
    await db.execute('UPDATE luqi_business_profiles_v1 SET updated_at=UTC_TIMESTAMP()-INTERVAL 181 DAY WHERE id=?',[expired]);
    await db.execute('UPDATE luqi_business_audit_v1 SET created_at=UTC_TIMESTAMP()-INTERVAL 91 DAY');
    const r=await call(reviewer,'/moderation/retention',{confirm:true});expect(r.status).toBe(200);const result=await r.json();expect(result.profiles).toBe(1);expect(result.auditEvents).toBeGreaterThan(0);
    const [profiles]=await db.execute<RowDataPacket[]>('SELECT id FROM luqi_business_profiles_v1 WHERE id=?',[expired]);expect(profiles).toHaveLength(0);
    const [users]=await db.query<RowDataPacket[]>('SELECT id FROM users');expect(users.length).toBeGreaterThanOrEqual(6);
  });
});
