/** Disposable MySQL 8.4 fixture only; never accepts a production URL. */
import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
import mysql,{type Pool,type RowDataPacket,type ResultSetHeader} from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {Hono} from 'hono';
import {bootstrapDatabase} from '../db/bootstrap';
import {WEB_RUNTIME_GRANTS} from '../db/runtimeRole';
import {P2P_RUNTIME_GRANTS} from '../db/p2pContracts';
import {checkRuntimeSchema} from '../db/runtimeSchema';
import {checkP2PReadiness} from '../db/p2pPreflight';
import {signUserToken} from '../api/lib/userToken';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const HASH='$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO';
const RUNTIME='mysql://luqi_p2p_fixture:p2p-fixture-only-password@127.0.0.1:3306/luqi_ci';
let root:Pool,app:Hono,closeDb:(()=>Promise<void>)|undefined,seq=0;
let owner:{id:number;token:string},peer:{id:number;token:string},outsider:{id:number;token:string},moderator:{id:number;token:string};
const tokenSecret=Buffer.alloc(32,8).toString('base64url');
async function account(role='p2p_adult'){
 const [r]=await root.execute<ResultSetHeader>('INSERT INTO users(email,password_hash,role,is_active) VALUES(?,?,?,1)',[`p2p-fixture-${++seq}@example.invalid`,HASH,role]);
 return{id:r.insertId,token:signUserToken(r.insertId,HASH)};
}
function request(actor:{token:string},path:string,body?:unknown){return app.request('/api/v1/p2p'+path,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+actor.token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})})}
async function pair(a=owner,b=peer,studentLock=false){
 const id=crypto.randomUUID(),inviteToken=Buffer.alloc(32,++seq%250).toString('base64url');
 expect((await request(a,'/circles',{id,inviteToken,studentLock,name:'Synthetic private circle',category:studentLock?'study':'custom'})).status).toBe(201);
 expect((await request(b,'/join',{id,inviteToken})).status).toBe(200);
 expect((await request(a,'/confirm',{id})).status).toBe(200);return{id,inviteToken};
}
function packet(id:string,a=owner,b=peer){return{messageId:crypto.randomUUID(),circleId:id,senderId:a.id,recipientId:b.id,timestamp:new Date().toISOString(),iv:Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString('base64url'),ciphertext:Buffer.alloc(32,4).toString('base64url')}}
beforeAll(async()=>{
 if(process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.DATABASE_URL!==ROOT)throw Error('Refusing non-disposable P2P fixture');
 await bootstrapDatabase();root=mysql.createPool({host:'127.0.0.1',port:3306,user:'root',password:'ci-ephemeral-only-password',database:'luqi_ci',multipleStatements:true});
 await root.query(await readFile('db/migrations/p2p-circles-v1.sql','utf8'));
 await root.query("CREATE USER 'luqi_p2p_fixture'@'%' IDENTIFIED BY 'p2p-fixture-only-password'");
 for(const[table,grants]of Object.entries({...WEB_RUNTIME_GRANTS,...P2P_RUNTIME_GRANTS}))await root.query('GRANT '+grants+' ON luqi_ci.'+mysql.escapeId(table)+" TO 'luqi_p2p_fixture'@'%'");
 vi.stubEnv('DATABASE_URL',RUNTIME);vi.stubEnv('JWT_SECRET','synthetic-p2p-mysql-only-secret-over-32-characters');vi.stubEnv('LUQI_P2P_ENABLED','true');vi.stubEnv('LUQI_P2P_REPORT_KEY',tokenSecret);
 const[{p2p},connection]=await Promise.all([import('../api/p2p'),import('../api/queries/connection')]);
 closeDb=connection.closeDb;const [identity]=await connection.getPersistentMySqlPool().query<RowDataPacket[]>('SELECT CURRENT_USER() AS identity');expect(identity[0].identity).toBe('luqi_p2p_fixture@%');
 app=new Hono().route('/api/v1/p2p',p2p);
},60000);
beforeEach(async()=>{owner=await account();peer=await account();outsider=await account();moderator=await account('p2p_moderator')});
afterAll(async()=>{await closeDb?.();await root?.end();vi.unstubAllEnvs()});
describe.sequential('durable private messaging enforcement',()=>{
 it('accepts exact read-only schema/grant preflight and rejects DELETE or missing keys',async()=>{
  expect(await checkRuntimeSchema()).toEqual({status:'validated',tables:13});await checkP2PReadiness();
  await root.query("GRANT DELETE ON luqi_ci.luqi_p2p_reports_v1 TO 'luqi_p2p_fixture'@'%'");
  try{await expect(checkP2PReadiness()).rejects.toThrow()}finally{await root.query("REVOKE DELETE ON luqi_ci.luqi_p2p_reports_v1 FROM 'luqi_p2p_fixture'@'%'")}
  await expect(checkP2PReadiness({...process.env,LUQI_P2P_REPORT_KEY:''})).rejects.toThrow();
 });
 it('public codes, unapproved requests, forged identities and outsider message IDs cannot grant access',async()=>{
  const id=crypto.randomUUID(),inviteToken=Buffer.alloc(32,99).toString('base64url');
  expect((await request(owner,'/circles',{id,inviteToken,studentLock:false,name:'Private pair',category:'custom'})).status).toBe(201);
  expect((await request(peer,'/join',{id,inviteToken:'KHULA-COOP-01'})).status).toBe(400);
  expect((await request(peer,'/join',{id,inviteToken})).status).toBe(200);
  expect((await request(peer,'/messages',packet(id,peer,owner))).status).toBe(404);
  expect((await request(outsider,'/confirm',{id})).status).toBe(404);
  expect((await request(owner,'/confirm',{id})).status).toBe(200);
  expect((await request(outsider,'/circles/'+id+'/messages')).status).toBe(404);
  expect((await request(owner,'/messages',{...packet(id),senderId:outsider.id})).status).toBe(403);
 });
 it('stores only ciphertext and refuses duplicate IDs, nonce reuse, wrong recipients and disabled peers',async()=>{
  const p=await pair(),m=packet(p.id);expect((await request(owner,'/messages',m)).status).toBe(201);
  expect((await request(owner,'/messages',m)).status).toBe(201);
  expect((await request(owner,'/messages',{...m,ciphertext:'B'.repeat(43)})).status).toBe(409);
  expect((await request(owner,'/messages',{...m,messageId:crypto.randomUUID()})).status).toBe(503);
  expect((await request(owner,'/messages',{...packet(p.id),recipientId:outsider.id})).status).toBe(403);
  const received=await(await request(peer,'/circles/'+p.id+'/messages')).json();expect(received.messages).toEqual([m]);
  await root.execute('UPDATE users SET is_active=0 WHERE id=?',[peer.id]);expect((await request(owner,'/messages',packet(p.id))).status).toBe(403);
 });
 it('durably blocks both directions and continues enforcing after a fresh API instance',async()=>{
  const p=await pair();expect((await request(peer,'/block',{peerId:owner.id})).status).toBe(200);
  expect((await request(owner,'/messages',packet(p.id))).status).toBe(403);
  expect((await request(peer,'/messages',packet(p.id,peer,owner))).status).toBe(403);
  const {p2p}=await import('../api/p2p');const fresh=new Hono().route('/api/v1/p2p',p2p);
  expect((await fresh.request('/api/v1/p2p/circles/'+p.id+'/messages',{headers:{Authorization:'Bearer '+owner.token}})).status).toBe(403);
  expect((await(await request(peer,'/status')).json()).blockedPeers).toContain(owner.id);
 });
 it('admits only matching verified student cohorts and blocks adult, other-school and unknown accounts',async()=>{
  const student=await account('p2p_student:school-a'),classmate=await account('p2p_student:school-a'),other=await account('p2p_student:school-b'),unknown=await account('user');
  const p=await pair(student,classmate,true);expect((await request(student,'/messages',packet(p.id,student,classmate))).status).toBe(201);
  for(const b of[owner,other,unknown]){
   const id=crypto.randomUUID(),inviteToken=Buffer.alloc(32,++seq%250).toString('base64url');
   expect((await request(student,'/circles',{id,inviteToken,name:'School cohort',category:'study',studentLock:true})).status).toBe(201);
   expect((await request(b,'/join',{id,inviteToken})).status).toBe(403);
  }
  expect((await request(unknown,'/circles',{id:crypto.randomUUID(),inviteToken:Buffer.alloc(32).toString('base64url'),name:'Pretend adult',category:'custom',studentLock:false})).status).toBe(403);
 });
 it('reports only a received message, encrypts evidence and restricts disclosure to moderators',async()=>{
  const p=await pair(),m=packet(p.id);await request(owner,'/messages',m);
  expect((await request(outsider,'/reports',{messageId:m.messageId,reason:'HARASSMENT',evidence:'Stolen claim',consent:true})).status).toBe(403);
  const result=await request(peer,'/reports',{messageId:m.messageId,reason:'SCAM_SOLICITATION',evidence:'Private reported excerpt',consent:true});expect(result.status).toBe(201);
  const receipt=await result.json();expect(receipt.sha256AuditSeal).toMatch(/^[a-f0-9]{64}$/);expect(receipt.blocked).toBe(true);
  const[stored]=await root.query<RowDataPacket[]>('SELECT * FROM luqi_p2p_reports_v1 WHERE id=?',[receipt.reportId]);expect(JSON.stringify(stored)).not.toContain('Private reported excerpt');
  expect((await request(owner,'/moderation/reports')).status).toBe(403);
  const review=await request(moderator,'/moderation/reports');expect(review.status).toBe(200);expect((await review.json()).reports.some((r:{evidence:string})=>r.evidence==='Private reported excerpt')).toBe(true);
  const repeated=await(await request(peer,'/reports',{messageId:m.messageId,reason:'SCAM_SOLICITATION',evidence:'Different submitted excerpt',consent:true})).json();expect(repeated.reportId).toBe(receipt.reportId);
  expect((await request(owner,'/messages',packet(p.id))).status).toBe(403);
 });
 it('links the third report to the second and detects altered audit evidence',async()=>{
  const receipts=[];
  for(let i=0;i<3;i++){const a=await account(),b=await account(),p=await pair(a,b),m=packet(p.id,a,b);await request(a,'/messages',m);
   const r=await request(b,'/reports',{messageId:m.messageId,reason:'HARASSMENT',evidence:'Excerpt '+i,consent:true});expect(r.status).toBe(201);receipts.push(await r.json());}
  expect(receipts[2].previousSeal).toBe(receipts[1].sha256AuditSeal);expect(receipts[1].previousSeal).toBe(receipts[0].sha256AuditSeal);
  await root.query('UPDATE luqi_p2p_reports_v1 SET reason=? WHERE id=?',['FAKE_AGENT',receipts[2].reportId]);
  try{expect((await request(moderator,'/moderation/reports')).status).toBe(503)}finally{await root.query('UPDATE luqi_p2p_reports_v1 SET reason=? WHERE id=?',['HARASSMENT',receipts[2].reportId])}
 });
 it('rolls reporting and the block back together when the audit append fails',async()=>{
  const p=await pair(),m=packet(p.id);await request(owner,'/messages',m);
  await root.query("CREATE TRIGGER deny_p2p_report BEFORE INSERT ON luqi_p2p_reports_v1 FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Synthetic report failure'");
  try{expect((await request(peer,'/reports',{messageId:m.messageId,reason:'HARASSMENT',evidence:'Private',consent:true})).status).toBe(503)}finally{await root.query('DROP TRIGGER deny_p2p_report')}
  const[blocks]=await root.query<RowDataPacket[]>('SELECT * FROM luqi_p2p_blocks_v1 WHERE owner_id=? AND peer_id=?',[peer.id,owner.id]);expect(blocks).toHaveLength(0);
 });
});
