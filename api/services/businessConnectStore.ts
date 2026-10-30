import {createHash} from 'node:crypto';
import type {QueryResult} from 'mysql2';
import type {Pool,PoolConnection,RowDataPacket,ResultSetHeader} from 'mysql2/promise';
import {getPersistentMySqlPool} from '../queries/connection';
import {BUSINESS_SCHEMA_DIGEST} from '../../db/businessContracts';
import {businessDraft,businessOwned,businessPublic,businessReason,publicBusiness,BUSINESS_CONSENT_VERSION,BUSINESS_OWNER_PROFILE_LIMIT,BUSINESS_DAILY_CHANGES,BUSINESS_DAILY_REVIEW_CHANGES,type BusinessDraft} from '../../contracts/business-connect';
type Database=Pool|PoolConnection;
function execute<T extends QueryResult=ResultSetHeader>(c:Database,sql:string,values:(string|number|null)[]=[]){return c.execute<T>({sql,timeout:4000},values);}
function query<T extends QueryResult=RowDataPacket[]>(c:Database,sql:string,values:(string|number|null)[]=[]){return c.query<T>({sql,timeout:4000},values);}
export class BusinessError extends Error{constructor(readonly code:'BUSINESS_NOT_FOUND'|'BUSINESS_CONFLICT'|'BUSINESS_LIMIT'|'BUSINESS_FORBIDDEN'|'BUSINESS_DUPLICATE'|'BUSINESS_CONSENT_REQUIRED'|'BUSINESS_REVIEW_UNAVAILABLE'){super(code);}}
type Row=RowDataPacket&{id:string;owner_id:number;revision:number;state:string;draft:unknown;public_document:unknown;reason:string;updatedAt:string;fingerprint:string;consent_version:string|null};
const columns="p.*,DATE_FORMAT(p.updated_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS updatedAt";
const decode=(v:unknown)=>typeof v==='string'?JSON.parse(v):v;
const fingerprint=(d:BusinessDraft)=>createHash('sha256').update([d.name,d.province,d.locality].map(v=>v.normalize('NFKC').toLocaleLowerCase('en-ZA').replace(/\s+/g,' ').trim()).join('\n')).digest('hex');
function owned(r:Row){return businessOwned.parse({id:r.id,revision:r.revision,state:r.state,draft:businessDraft.parse(decode(r.draft)),reason:r.reason,updatedAt:r.updatedAt,public:r.public_document?businessPublic.parse(decode(r.public_document)):null});}
async function transaction<T>(run:(c:PoolConnection)=>Promise<T>,reviewLock=false):Promise<T>{
 const c=await getPersistentMySqlPool().getConnection();
 let locked=false;
 try{if(reviewLock){const[lock]=await query<RowDataPacket[]>(c,"SELECT GET_LOCK(CONCAT('luqi-business-review:',DATABASE()),2) AS acquired");if(Number(lock[0]?.acquired)!==1)throw new BusinessError('BUSINESS_LIMIT');locked=true;}await query(c,"SET time_zone='+00:00'");await query(c,'SET TRANSACTION ISOLATION LEVEL READ COMMITTED');await c.beginTransaction();const result=await run(c);await c.commit();return result;}
 catch(e){await c.rollback().catch(()=>undefined);if(e&&typeof e==='object'&&'code'in e&&e.code==='ER_DUP_ENTRY')throw new BusinessError('BUSINESS_DUPLICATE');throw e;}
 finally{if(locked)await query(c,"SELECT RELEASE_LOCK(CONCAT('luqi-business-review:',DATABASE()))").catch(()=>undefined);c.release();}
}
async function actor(c:PoolConnection,id:number,review=false){
 const[rows]=await execute<RowDataPacket[]>(c,'SELECT u.id,u.is_active,EXISTS(SELECT 1 FROM luqi_business_reviewers_v1 r WHERE r.user_id=u.id AND r.active=1) AS can_review FROM users u WHERE u.id=? FOR UPDATE',[id]);
 if(!rows[0]||rows[0].is_active!==1||!Number.isSafeInteger(id)||id<1)throw new BusinessError('BUSINESS_FORBIDDEN');
 if(review&&Number(rows[0].can_review)!==1)throw new BusinessError('BUSINESS_FORBIDDEN');
 return rows[0];
}
async function quota(c:PoolConnection,id:number,review=false,report=false){
 const day=new Date().toISOString().slice(0,10);
 const[rows]=await execute<RowDataPacket[]>(c,'SELECT attempts,reports FROM luqi_business_usage_v1 WHERE owner_id=? AND day_utc=? FOR UPDATE',[id,day]);
 if(Number(rows[0]?.attempts??0)>=(review?BUSINESS_DAILY_REVIEW_CHANGES:BUSINESS_DAILY_CHANGES))throw new BusinessError('BUSINESS_LIMIT');
 if(report&&Number(rows[0]?.reports??0)>=5)throw new BusinessError('BUSINESS_LIMIT');
 await execute(c,'INSERT INTO luqi_business_usage_v1(owner_id,day_utc,attempts,reports) VALUES(?,?,1,?) ON DUPLICATE KEY UPDATE attempts=attempts+1,reports=reports+VALUES(reports)',[id,day,report?1:0]);
}
async function row(c:PoolConnection,id:string,owner?:number){
 const[rows]=await execute<Row[]>(c,'SELECT '+columns+' FROM luqi_business_profiles_v1 p WHERE p.id=?'+(owner===undefined?'':' AND p.owner_id=?')+' FOR UPDATE',owner===undefined?[id]:[id,owner]);
 if(!rows[0])throw new BusinessError('BUSINESS_NOT_FOUND');return rows[0];
}
function revision(r:Row,expected:number){if(r.revision!==expected||r.revision>=1_000_000)throw new BusinessError('BUSINESS_CONFLICT');}
async function audit(c:PoolConnection,id:string,actorId:number,action:string,reason='none'){
 await execute(c,'INSERT INTO luqi_business_audit_v1(profile_id,actor_id,action,reason) VALUES(?,?,?,?)',[id,actorId,action,reason]);
 // Bounded metadata history; no draft contents, contacts or account email copied.
 const[old]=await execute<RowDataPacket[]>(c,'SELECT id FROM luqi_business_audit_v1 WHERE profile_id=? ORDER BY id DESC LIMIT 1 OFFSET 99',[id]);
 if(old[0])await execute(c,'DELETE FROM luqi_business_audit_v1 WHERE profile_id=? AND id<?',[id,old[0].id]);
}
async function duplicates(c:PoolConnection,r:Row){const[rows]=await execute<RowDataPacket[]>(c,"SELECT COUNT(*) AS n FROM luqi_business_profiles_v1 WHERE fingerprint=? AND id<>? AND state='published'",[r.fingerprint,r.id]);return Math.min(100,Number(rows[0].n));}
export const businessConnectStore={
 async ready(){const[meta]=await query<RowDataPacket[]>(getPersistentMySqlPool(),'SELECT digest FROM luqi_business_meta_v1 WHERE id=1');if(meta.length!==1||meta[0].digest!==BUSINESS_SCHEMA_DIGEST)throw Error('BUSINESS_STORAGE_UNAVAILABLE');for(const table of ['luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1'])await query(getPersistentMySqlPool(),'SELECT 1 FROM '+table+' LIMIT 0');return{availability:'ready' as const,ownerLimit:BUSINESS_OWNER_PROFILE_LIMIT};},
 async mine(owner:number){
  const[users]=await execute<RowDataPacket[]>(getPersistentMySqlPool(),'SELECT EXISTS(SELECT 1 FROM luqi_business_reviewers_v1 r WHERE r.user_id=u.id AND r.active=1) AS can_review,EXISTS(SELECT 1 FROM luqi_business_reviewers_v1 r JOIN users v ON v.id=r.user_id WHERE r.active=1 AND v.is_active=1) AS review_available FROM users u WHERE u.id=? AND u.is_active=1',[owner]);if(!users[0])throw new BusinessError('BUSINESS_FORBIDDEN');
  const[rows]=await execute<Row[]>(getPersistentMySqlPool(),'SELECT '+columns+' FROM luqi_business_profiles_v1 p WHERE owner_id=? ORDER BY updated_at DESC,id ASC LIMIT 10',[owner]);
  return{profiles:rows.map(owned),reviewer:Number(users[0].can_review)===1,reviewAvailable:Number(users[0].review_available)===1};
 },
 async save(owner:number,id:string,expected:number,input:BusinessDraft){
  const draft=businessDraft.parse(input);
  return transaction(async c=>{
   await actor(c,owner);await quota(c,owner);
   const[existing]=await execute<Row[]>(c,'SELECT '+columns+' FROM luqi_business_profiles_v1 p WHERE p.id=? FOR UPDATE',[id]);
   const r=existing[0];
   if(r){if(r.owner_id!==owner)throw new BusinessError('BUSINESS_NOT_FOUND');revision(r,expected);
    await execute(c,"UPDATE luqi_business_profiles_v1 SET revision=revision+1,state='draft',province=?,category=?,fingerprint=?,draft=?,public_document=NULL,public_search='',reason='none',consent_at=NULL,consent_version=NULL,updated_at=UTC_TIMESTAMP(6) WHERE id=?",[draft.province,draft.category,fingerprint(draft),JSON.stringify(draft),id]);
   }else{
    if(expected!==0)throw new BusinessError('BUSINESS_CONFLICT');
    const[count]=await execute<RowDataPacket[]>(c,'SELECT COUNT(*) AS n FROM luqi_business_profiles_v1 WHERE owner_id=?',[owner]);if(Number(count[0].n)>=BUSINESS_OWNER_PROFILE_LIMIT)throw new BusinessError('BUSINESS_LIMIT');
    await execute(c,"INSERT INTO luqi_business_profiles_v1(id,owner_id,revision,state,province,category,fingerprint,draft) VALUES(?,?,1,'draft',?,?,?,?)",[id,owner,draft.province,draft.category,fingerprint(draft),JSON.stringify(draft)]);
   }
   await audit(c,id,owner,r?'save':'create');return{profile:owned(await row(c,id,owner))};
  });
 },
 async change(owner:number,id:string,expected:number,action:'submit'|'pause'|'delete'){
  return transaction(async c=>{
   await actor(c,owner);await quota(c,owner);const r=await row(c,id,owner);revision(r,expected);
   if(action==='delete'){
    // Foreign keys remove its reports/audit; quota is retained for abuse limits.
    await execute(c,'DELETE FROM luqi_business_profiles_v1 WHERE id=? AND owner_id=?',[id,owner]);return{removed:true as const,id};
   }
   if(action==='submit'){
    const[staff]=await execute<RowDataPacket[]>(c,'SELECT r.user_id FROM luqi_business_reviewers_v1 r JOIN users u ON u.id=r.user_id WHERE r.active=1 AND u.is_active=1 LIMIT 1');if(!staff.length)throw new BusinessError('BUSINESS_REVIEW_UNAVAILABLE');
    const d=businessDraft.parse(decode(r.draft));if(!((d.visibility.phone&&d.phone)||(d.visibility.email&&d.email)||(d.visibility.website&&d.website)))throw new BusinessError('BUSINESS_CONSENT_REQUIRED');
    if(!['draft','paused','rejected'].includes(r.state))throw new BusinessError('BUSINESS_CONFLICT');
    await execute(c,"UPDATE luqi_business_profiles_v1 SET revision=revision+1,state='pending',public_document=NULL,public_search='',reason='none',consent_at=UTC_TIMESTAMP(6),consent_version=?,updated_at=UTC_TIMESTAMP(6) WHERE id=?",[BUSINESS_CONSENT_VERSION,id]);
   }else{
    await execute(c,"UPDATE luqi_business_profiles_v1 SET revision=revision+1,state='paused',public_document=NULL,public_search='',consent_at=NULL,consent_version=NULL,updated_at=UTC_TIMESTAMP(6) WHERE id=?",[id]);
   }
   await audit(c,id,owner,action);return{profile:owned(await row(c,id,owner))};
  });
 },
 async list(filter:{province?:string;category?:string;q?:string;after?:string}){
  const where=["p.state='published'","p.public_document IS NOT NULL","u.is_active=1"],values:string[]=[];
  for(const field of ['province','category'] as const)if(filter[field]){where.push('p.'+field+'=?');values.push(filter[field]);}
  if(filter.after){where.push('p.id>?');values.push(filter.after);}
  if(filter.q){where.push('MATCH(p.public_search) AGAINST (? IN NATURAL LANGUAGE MODE)');values.push(filter.q);}
  const[rows]=await execute<Row[]>(getPersistentMySqlPool(),'SELECT p.id,p.public_document FROM luqi_business_profiles_v1 p JOIN users u ON u.id=p.owner_id WHERE '+where.join(' AND ')+' ORDER BY p.id ASC LIMIT 21',values);
  const visible=rows.slice(0,20);return{businesses:visible.map(r=>businessPublic.parse(decode(r.public_document))),next:rows.length>20?visible[19].id:null};
 },
 async public(id:string){const[rows]=await execute<Row[]>(getPersistentMySqlPool(),"SELECT p.public_document FROM luqi_business_profiles_v1 p JOIN users u ON u.id=p.owner_id WHERE p.id=? AND p.state='published' AND u.is_active=1 LIMIT 1",[id]);if(!rows[0]?.public_document)throw new BusinessError('BUSINESS_NOT_FOUND');return{business:businessPublic.parse(decode(rows[0].public_document))};},
 async history(owner:number,id:string){
  return transaction(async c=>{await actor(c,owner);await row(c,id,owner);const[events]=await execute<RowDataPacket[]>(c,"SELECT action,reason,DATE_FORMAT(created_at,'%Y-%m-%dT%H:%i:%s.%fZ') AS at FROM luqi_business_audit_v1 WHERE profile_id=? ORDER BY id DESC LIMIT 100",[id]);return{events:events.map(r=>({action:String(r.action),reason:businessReason.parse(r.reason),at:String(r.at)}))};});
 },
 async report(reporter:number,id:string,input:{reason:string;note:string}){
  return transaction(async c=>{await actor(c,reporter);await quota(c,reporter,false,true);const r=await row(c,id);if(r.state!=='published')throw new BusinessError('BUSINESS_NOT_FOUND');
   await execute(c,'INSERT INTO luqi_business_reports_v1(profile_id,reporter_id,reason,note) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE reason=VALUES(reason),note=VALUES(note),created_at=UTC_TIMESTAMP(6)',[id,reporter,input.reason,input.note]);return{received:true as const};});
 },
 async reviewQueue(reviewer:number){
  return transaction(async c=>{await actor(c,reviewer,true);
   const[rows]=await execute<Row[]>(c,"SELECT "+columns+" FROM luqi_business_profiles_v1 p JOIN users u ON u.id=p.owner_id WHERE u.is_active=1 AND p.owner_id<>? AND (p.state='pending' OR EXISTS(SELECT 1 FROM luqi_business_reports_v1 r WHERE r.profile_id=p.id)) ORDER BY p.updated_at ASC,p.id LIMIT 20",[reviewer]);
   const items=[];
   for(const r of rows){const[reports]=await execute<RowDataPacket[]>(c,'SELECT reason,note FROM luqi_business_reports_v1 WHERE profile_id=? ORDER BY created_at DESC LIMIT 20',[r.id]);items.push({id:r.id,revision:r.revision,state:r.state,candidate:publicBusiness(r.id,r.revision,businessDraft.parse(decode(r.draft))),duplicateCount:await duplicates(c,r),reason:businessReason.parse(r.reason),reports:reports.map(s=>({reason:String(s.reason),note:String(s.note)}))});}
   return{items};
  });
 },
 async decide(reviewer:number,id:string,input:{expectedRevision:number;action:'approve'|'reject'|'pause';reason:string;duplicatesChecked:boolean}){
  const[roles]=await execute<RowDataPacket[]>(getPersistentMySqlPool(),"SELECT u.id FROM users u JOIN luqi_business_reviewers_v1 r ON r.user_id=u.id AND r.active=1 WHERE u.id=? AND u.is_active=1",[reviewer]);if(!roles[0])throw new BusinessError('BUSINESS_FORBIDDEN');
  return transaction(async c=>{await actor(c,reviewer,true);await quota(c,reviewer,true);const r=await row(c,id);revision(r,input.expectedRevision);
   if(r.owner_id===reviewer)throw new BusinessError('BUSINESS_FORBIDDEN');
   const[owners]=await execute<RowDataPacket[]>(c,'SELECT is_active FROM users WHERE id=?',[r.owner_id]);if(owners[0]?.is_active!==1)throw new BusinessError('BUSINESS_FORBIDDEN');
   if(input.action==='approve'){
    if(r.state!=='pending'||r.consent_version!==BUSINESS_CONSENT_VERSION)throw new BusinessError('BUSINESS_CONSENT_REQUIRED');
    const d=businessDraft.parse(decode(r.draft));if(!((d.visibility.phone&&d.phone)||(d.visibility.email&&d.email)||(d.visibility.website&&d.website)))throw new BusinessError('BUSINESS_CONSENT_REQUIRED');
    if(await duplicates(c,r)>0&&!input.duplicatesChecked)throw new BusinessError('BUSINESS_DUPLICATE');
    const document=publicBusiness(id,r.revision+1,d);
    const search=[document.name,document.description,...document.services,document.locality,document.serviceArea].join(' ').slice(0,2200);
    await execute(c,"UPDATE luqi_business_profiles_v1 SET revision=revision+1,state='published',public_document=?,public_search=?,reason='none',updated_at=UTC_TIMESTAMP(6) WHERE id=?",[JSON.stringify(document),search,id]);
   }else{
    if(input.reason==='none')throw new BusinessError('BUSINESS_CONSENT_REQUIRED');
    await execute(c,"UPDATE luqi_business_profiles_v1 SET revision=revision+1,state=?,public_document=NULL,public_search='',reason=?,consent_at=NULL,consent_version=NULL,updated_at=UTC_TIMESTAMP(6) WHERE id=?",[input.action==='reject'?'rejected':'paused',input.reason,id]);
   }
   await audit(c,id,reviewer,input.action==='approve'&&input.duplicatesChecked?'approve_duplicates_checked':input.action,input.reason);
   // Reports close only after an explicit review decision, never by count alone.
   await execute(c,'DELETE FROM luqi_business_reports_v1 WHERE profile_id=?',[id]);
   return{reviewed:true as const,id,revision:r.revision+1};
  },true);
 },
 async cleanup(){
  // Bounded hourly work; no content or credentials enter maintenance output.
  for(let i=0;i<10;i++){
   const[a]=await query<ResultSetHeader>(getPersistentMySqlPool(),'DELETE FROM luqi_business_usage_v1 WHERE day_utc < DATE_FORMAT(UTC_TIMESTAMP()-INTERVAL 31 DAY,\'%Y-%m-%d\') LIMIT 1000');
   const[b]=await query<ResultSetHeader>(getPersistentMySqlPool(),'DELETE FROM luqi_business_reports_v1 WHERE created_at < UTC_TIMESTAMP()-INTERVAL 31 DAY LIMIT 1000');
   const[d]=await query<ResultSetHeader>(getPersistentMySqlPool(),'DELETE FROM luqi_business_audit_v1 WHERE created_at < UTC_TIMESTAMP()-INTERVAL 90 DAY LIMIT 1000');
   if(Math.max(a.affectedRows,b.affectedRows,d.affectedRows)<1000)break;
  }
 }
};
