/** Disposable MySQL only. Never accepts a production URL or seed account. */
import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
import mysql,{type Pool,type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
import {Hono} from 'hono';
import {bootstrapDatabase} from '../db/bootstrap';
import {WEB_RUNTIME_GRANTS} from '../db/runtimeRole';
import {prepareBusinessStorage,BUSINESS_SETUP_INTENT} from '../db/prepareBusinessStorage';
import {BUSINESS_CONSENT_VERSION,type BusinessDraft} from '../contracts/business-connect';
import {signUserToken} from '../api/lib/userToken';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const RUNTIME='mysql://luqi_business_fixture:business-fixture-only-password@127.0.0.1:3306/luqi_ci';
const HASH='$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO';
let root:Pool,app:Hono,seq=0,closeDb:(()=>Promise<void>)|undefined,store:typeof import('../api/services/businessConnectStore').businessConnectStore;
type Actor={id:number;token:string};let owner:Actor,other:Actor,reviewer:Actor;
const settings={DATABASE_URL:RUNTIME,LUQI_DB_OPERATOR_URL:ROOT,LUQI_MYSQL_CI_FIXTURE:'true',GITHUB_ACTIONS:'true'};
async function account(role='user'){const[r]=await root.execute<ResultSetHeader>('INSERT INTO users(email,password_hash,role,is_active) VALUES(?,?,?,1)',[`business-${++seq}@example.invalid`,HASH,'user']);if(role==='business_reviewer')await root.execute('INSERT INTO luqi_business_reviewers_v1(user_id,active) VALUES(?,1)',[r.insertId]);return{id:r.insertId,token:signUserToken(r.insertId,HASH)};}
function request(method:string,path:string,who?:Actor,body?:unknown){return app.request('/api/v1/business-connect'+path,{method,headers:{...(who?{Authorization:'Bearer '+who.token}:{}),'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});}
function draft(name='Synthetic service '+(++seq)):BusinessDraft{return{name,category:'trades',description:'Synthetic business fixture, never published outside disposable CI.',services:['Appliance repairs'],province:'GP',locality:'Mabopane',kind:'service_area',serviceArea:'Mabopane by arrangement',publicAddress:'',phone:'+27125550123',email:'private-business@example.com',website:'',hours:'By appointment',pricing:'',languages:['English'],visibility:{phone:true,email:false,website:false,address:false,pricing:false}};}
async function saved(who=owner,d=draft()){const id=crypto.randomUUID(),r=await request('PUT','/mine/'+id,who,{expectedRevision:0,draft:d});expect(r.status).toBe(200);return(await r.json()).profile;}
async function submitted(p:Awaited<ReturnType<typeof saved>>,who=owner){const r=await request('POST','/mine/'+p.id+'/submit',who,{expectedRevision:p.revision,consentVersion:BUSINESS_CONSENT_VERSION,ownerAuthorised:true,publicationConsent:true});expect(r.status).toBe(200);return(await r.json()).profile;}
async function approved(p:Awaited<ReturnType<typeof saved>>,who=reviewer,duplicatesChecked=false){const r=await request('POST','/review/'+p.id,who,{expectedRevision:p.revision,action:'approve',reviewedAuthority:true,reason:'none',duplicatesChecked});expect(r.status).toBe(200);return(await r.json()).revision;}
beforeAll(async()=>{
 if(process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.DATABASE_URL!==ROOT)throw Error('Refusing non-disposable business fixture');
 await bootstrapDatabase();root=mysql.createPool({host:'127.0.0.1',port:3306,user:'root',password:'ci-ephemeral-only-password',database:'luqi_ci'});
 await root.query("CREATE USER 'luqi_business_fixture'@'%' IDENTIFIED BY 'business-fixture-only-password'");
 for(const[table,grants]of Object.entries(WEB_RUNTIME_GRANTS))await root.query('GRANT '+grants+' ON luqi_ci.'+mysql.escapeId(table)+" TO 'luqi_business_fixture'@'%'");
 expect((await prepareBusinessStorage(settings)).status).toBe('setup_required');
 const prepared=await prepareBusinessStorage({...settings,LUQI_BUSINESS_SCHEMA_INTENT:BUSINESS_SETUP_INTENT});expect(prepared).toMatchObject({status:'validated',tablesCreated:6,grantsAdded:6,customerRowsModified:false,flagsChanged:false,identitiesCreated:false});
 expect(await prepareBusinessStorage({...settings,LUQI_BUSINESS_SCHEMA_INTENT:BUSINESS_SETUP_INTENT})).toMatchObject({status:'validated',tablesCreated:0,grantsAdded:0});
 vi.stubEnv('DATABASE_URL',RUNTIME);vi.stubEnv('JWT_SECRET','synthetic-business-fixture-secret-over-32-characters');vi.stubEnv('LUQI_BUSINESS_CONNECT_ENABLED','true');
 const[{businessConnect},db,service]=await Promise.all([import('../api/business-connect'),import('../api/queries/connection'),import('../api/services/businessConnectStore')]);
 closeDb=db.closeDb;store=service.businessConnectStore;app=new Hono().route('/api/v1/business-connect',businessConnect);
 const[identity]=await db.getPersistentMySqlPool().query<RowDataPacket[]>('SELECT CURRENT_USER() AS identity');expect(identity[0].identity).toBe('luqi_business_fixture@%');
},60000);
beforeEach(async()=>{owner=await account();other=await account();reviewer=await account('business_reviewer');});
afterAll(async()=>{await closeDb?.();await root?.end();vi.unstubAllEnvs();});
describe.sequential('durable owner-controlled business publication',()=>{
 it('isolates drafts, rejects forged ownership and requires explicit consent before review',async()=>{
  expect((await request('GET','/mine')).status).toBe(401);const p=await saved();
  expect((await(await request('GET','/mine',owner)).json()).profiles.map((x:{id:string})=>x.id)).toContain(p.id);
  expect((await(await request('GET','/mine',other)).json()).profiles).toEqual([]);
  expect((await request('PUT','/mine/'+p.id,other,{expectedRevision:p.revision,draft:draft()})).status).toBe(404);
  expect((await request('GET','/public/'+p.id)).status).toBe(404);
  expect((await request('POST','/mine/'+p.id+'/submit',owner,{expectedRevision:p.revision})).status).toBe(400);
  expect((await request('POST','/review/'+p.id,other,{expectedRevision:p.revision,action:'approve',reviewedAuthority:true,reason:'none',duplicatesChecked:false})).status).toBe(403);
 });
 it('publishes only consented fields after review and makes revision changes withdraw the snapshot',async()=>{
  let p=await submitted(await saved());await approved(p);
  const response=await request('GET','/public/'+p.id);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
  const value=await response.json();expect(value.business.phone).toBe('+27125550123');expect(value.business.email).toBeUndefined();expect(value.business.owner_id).toBeUndefined();expect(value.business.locationReview).toBe('owner_provided');expect(JSON.stringify(value)).not.toContain('private-business@example.com');
  p=(await(await request('GET','/mine',owner)).json()).profiles[0];
  expect((await request('PUT','/mine/'+p.id,owner,{expectedRevision:p.revision-1,draft:p.draft})).status).toBe(409);
  expect((await request('PUT','/mine/'+p.id,owner,{expectedRevision:p.revision,draft:{...p.draft,hours:'Weekdays by arrangement'}})).status).toBe(200);
  expect((await request('GET','/public/'+p.id)).status).toBe(404);
 });
 it('keeps unchecked private contacts out of the reviewer candidate',async()=>{
  const p=await submitted(await saved());const queue=await(await request('GET','/review',reviewer)).json();const item=queue.items.find((x:{id:string})=>x.id===p.id);expect(item.candidate.email).toBeUndefined();expect(JSON.stringify(item)).not.toContain('private-business@example.com');
 });
 it('rejects private-home address fields for service-area and mobile traders at the API',async()=>{
  for(const kind of ['service_area','mobile'])expect((await request('PUT','/mine/'+crypto.randomUUID(),owner,{expectedRevision:0,draft:{...draft(),kind,publicAddress:'Private home address',visibility:{...draft().visibility,address:true}}})).status).toBe(400);
 });
 it('prevents self-review and serialises concurrent duplicate approvals across reviewers',async()=>{
  const p=await submitted(await saved(reviewer),reviewer);expect((await request('POST','/review/'+p.id,reviewer,{expectedRevision:p.revision,action:'approve',reviewedAuthority:true,reason:'none',duplicatesChecked:true})).status).toBe(403);
  const name='Concurrent duplicate '+(++seq),a=await submitted(await saved(owner,draft(name))),b=await submitted(await saved(other,draft(name)),other),second=await account('business_reviewer');
  const results=await Promise.all([request('POST','/review/'+a.id,reviewer,{expectedRevision:a.revision,action:'approve',reviewedAuthority:true,reason:'none',duplicatesChecked:false}),request('POST','/review/'+b.id,second,{expectedRevision:b.revision,action:'approve',reviewedAuthority:true,reason:'none',duplicatesChecked:false})]);expect(results.map(r=>r.status).sort()).toEqual([200,409]);
 });
 it('allows a reviewer to record a checked duplicate explicitly, not via a visitor claim',async()=>{
  const name='Reviewed duplicate '+(++seq),a=await submitted(await saved(owner,draft(name)));await approved(a);
  const b=await submitted(await saved(other,draft(name)),other);
  expect((await request('POST','/review/'+b.id,reviewer,{expectedRevision:b.revision,action:'approve',reviewedAuthority:true,reason:'none',duplicatesChecked:false})).status).toBe(409);await approved(b,reviewer,true);
 });
 it('honours reporting, review pause, inactive owners and deletion without erasing another account',async()=>{
  let p=await submitted(await saved());await approved(p);
  expect((await request('POST','/public/'+p.id+'/report',other,{reason:'misleading',note:'Synthetic report for reviewer only'})).status).toBe(200);
  const queue=await(await request('GET','/review',reviewer)).json();const item=queue.items.find((x:{id:string})=>x.id===p.id);expect(item.reports[0].note).toContain('Synthetic report');
  expect((await request('POST','/review/'+p.id,reviewer,{expectedRevision:item.revision,action:'pause',reviewedAuthority:true,reason:'details_unclear',duplicatesChecked:false})).status).toBe(200);
  expect((await request('GET','/public/'+p.id)).status).toBe(404);
  p=(await(await request('GET','/mine',owner)).json()).profiles[0];
  expect((await request('POST','/mine/'+p.id+'/delete',owner,{expectedRevision:p.revision})).status).toBe(400);
  expect((await request('POST','/mine/'+p.id+'/delete',owner,{expectedRevision:p.revision,confirmDelete:true})).status).toBe(200);
  const[events]=await root.query<RowDataPacket[]>('SELECT id FROM luqi_business_audit_v1 WHERE profile_id=?',[p.id]);expect(events).toHaveLength(0);
  const second=await submitted(await saved(other),other);await approved(second);await root.execute('UPDATE users SET is_active=0 WHERE id=?',[other.id]);expect((await request('GET','/public/'+second.id)).status).toBe(404);
 });
 it('bounds owner profiles, confirmed changes and history while public filters remain parameterised',async()=>{
  const profiles=[];for(let i=0;i<10;i++)profiles.push(await saved());
  expect((await request('PUT','/mine/'+crypto.randomUUID(),owner,{expectedRevision:0,draft:draft()})).status).toBe(429);
  await root.execute('UPDATE luqi_business_usage_v1 SET attempts=200 WHERE owner_id=? AND day_utc=?',[owner.id,new Date().toISOString().slice(0,10)]);
  expect((await request('POST','/mine/'+profiles[0].id+'/pause',owner,{expectedRevision:profiles[0].revision})).status).toBe(429);
  expect((await request('GET','/public?province=XX')).status).toBe(400);expect((await request('GET','/public?userId=1')).status).toBe(400);
  const list=await(await request('GET','/public?province=GP&q=%25')).json();expect(list.businesses).toEqual([]);
 });
 it('expires operational metadata without deleting business profiles',async()=>{
  const p=await submitted(await saved());await approved(p);await request('POST','/public/'+p.id+'/report',other,{reason:'other',note:'Synthetic expired report'});
  await root.execute('UPDATE luqi_business_reports_v1 SET created_at=UTC_TIMESTAMP()-INTERVAL 40 DAY WHERE profile_id=?',[p.id]);await root.execute('UPDATE luqi_business_audit_v1 SET created_at=UTC_TIMESTAMP()-INTERVAL 100 DAY WHERE profile_id=?',[p.id]);
  await store.cleanup();const[reports]=await root.query<RowDataPacket[]>('SELECT profile_id FROM luqi_business_reports_v1 WHERE profile_id=?',[p.id]);expect(reports).toHaveLength(0);expect((await request('GET','/public/'+p.id)).status).toBe(200);
 });
 it('rejects disabled activation and does not leak schema or credentials in errors',async()=>{
  vi.stubEnv('LUQI_BUSINESS_CONNECT_ENABLED','false');expect((await(await request('GET','/status')).json()).availability).toBe('setup_required');expect((await request('GET','/public')).status).toBe(503);expect((await request('GET','/mine')).status).toBe(401);vi.stubEnv('LUQI_BUSINESS_CONNECT_ENABLED','true');
  const r=await request('PUT','/mine/'+crypto.randomUUID(),owner,{expectedRevision:0,draft:{...draft(),owner_id:other.id}});expect(r.status).toBe(400);expect(await r.text()).not.toMatch(/mysql|password|DATABASE_URL|SELECT /);
 });
 it('limits report spam and fails closed when reviewer coverage is revoked',async()=>{
  const p=await submitted(await saved());await approved(p);
  for(let i=0;i<5;i++)expect((await request('POST','/public/'+p.id+'/report',other,{reason:'other',note:'Synthetic report correction '+i})).status).toBe(200);
  expect((await request('POST','/public/'+p.id+'/report',other,{reason:'other',note:'Sixth attempt'})).status).toBe(429);
  await root.query('UPDATE luqi_business_reviewers_v1 SET active=0');
  expect((await request('GET','/review',reviewer)).status).toBe(403);
  const privateDraft=await saved();expect((await(await request('GET','/mine',owner)).json()).reviewAvailable).toBe(false);
  expect((await request('POST','/mine/'+privateDraft.id+'/submit',owner,{expectedRevision:privateDraft.revision,consentVersion:BUSINESS_CONSENT_VERSION,ownerAuthorised:true,publicationConsent:true})).status).toBe(503);
  await root.execute('UPDATE luqi_business_reviewers_v1 SET active=1 WHERE user_id=?',[reviewer.id]);
 });

});
