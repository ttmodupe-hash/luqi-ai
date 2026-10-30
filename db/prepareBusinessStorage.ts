/** Private, pinned operator operation. No HTTP imports, customer mutations or role assignments. */
import {createHash} from 'node:crypto';
import mysql,{type Connection,type RowDataPacket} from 'mysql2/promise';
import {parseMySqlConnectionSettings} from '../api/lib/mysqlConfig';
import {BUSINESS_CREATE_STATEMENTS} from './businessMigration';
import {BUSINESS_RUNTIME_TABLES,BUSINESS_RUNTIME_GRANTS,BUSINESS_SCHEMA_DIGEST} from './businessContracts';
import {RUNTIME_TABLES,validateRuntimeSchemaConnection} from './runtimeSchema';
export const BUSINESS_SETUP_INTENT='create-absent-business-storage-v1';
export function businessOperatorSettings(env:Record<string,string|undefined>){
 const runtime=parseMySqlConnectionSettings(env),operator=parseMySqlConnectionSettings({DATABASE_URL:env.LUQI_DB_OPERATOR_URL});
 const fixture=env.GITHUB_ACTIONS==='true'&&env.LUQI_MYSQL_CI_FIXTURE==='true'&&env.LUQI_DB_OPERATOR_URL==='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci'&&runtime?.host==='127.0.0.1'&&runtime.port===3306&&runtime.database==='luqi_ci'&&runtime.user==='luqi_business_fixture';
 const production=env.RAILWAY_PROJECT_ID==='9f627cb8-3136-4b30-89d2-32ca648a1e5f'&&env.RAILWAY_ENVIRONMENT_ID==='1e192ef3-1fa6-4684-81fc-60165c7b0e22'&&env.RAILWAY_SERVICE_NAME==='luqi-business-db-setup-q5T1'&&env.RAILWAY_SERVICE_ID==='2b192c71-27fc-4f28-98c8-07ab9abee474'&&/^[a-f0-9]{40}$/.test(env.LUQI_DB_CHECK_SOURCE_SHA??'')&&env.RAILWAY_GIT_COMMIT_SHA===env.LUQI_DB_CHECK_SOURCE_SHA&&runtime?.host.endsWith('.railway.internal');
 if(!runtime||!operator||(!fixture&&!production)||runtime.host!==operator.host||runtime.port!==operator.port||runtime.database!==operator.database||!/^[A-Za-z0-9_]{1,64}$/.test(runtime.database)||runtime.user!==(fixture?'luqi_business_fixture':'luqi_web_runtime')||runtime.user===operator.user)throw Error('BUSINESS_SETUP_SCOPE_REJECTED');
 return{runtime,operator};
}
async function validate(connection:Connection){
 await validateRuntimeSchemaConnection(connection,BUSINESS_RUNTIME_TABLES,false);
 const[marker]=await connection.query<RowDataPacket[]>('SELECT digest FROM luqi_business_meta_v1 WHERE id=1');if(marker.length!==1||marker[0].digest!==BUSINESS_SCHEMA_DIGEST)throw Error('BUSINESS_SETUP_MARKER_MISMATCH');
 const[index]=await connection.query<RowDataPacket[]>("SELECT INDEX_TYPE FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='luqi_business_profiles_v1' AND INDEX_NAME='business_text' AND COLUMN_NAME='public_search'");if(index.length!==1||index[0].INDEX_TYPE!=='FULLTEXT')throw Error('BUSINESS_SETUP_INDEX_MISMATCH');
 const[fks]=await connection.query<RowDataPacket[]>("SELECT TABLE_NAME,COLUMN_NAME,REFERENCED_TABLE_NAME,REFERENCED_COLUMN_NAME FROM information_schema.key_column_usage WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('luqi_business_reviewers_v1','luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1') AND REFERENCED_TABLE_NAME IS NOT NULL");
 const expected=new Set(['luqi_business_reviewers_v1:user_id:users:id','luqi_business_profiles_v1:owner_id:users:id','luqi_business_audit_v1:profile_id:luqi_business_profiles_v1:id','luqi_business_audit_v1:actor_id:users:id','luqi_business_usage_v1:owner_id:users:id','luqi_business_reports_v1:profile_id:luqi_business_profiles_v1:id','luqi_business_reports_v1:reporter_id:users:id']);
 if(fks.length!==expected.size||fks.some(r=>!expected.delete([r.TABLE_NAME,r.COLUMN_NAME,r.REFERENCED_TABLE_NAME,r.REFERENCED_COLUMN_NAME].join(':')))||expected.size)throw Error('BUSINESS_SETUP_FOREIGN_KEYS');
 const[rules]=await connection.query<RowDataPacket[]>("SELECT DELETE_RULE FROM information_schema.referential_constraints WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME IN ('luqi_business_reviewers_v1','luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1')");
 if(rules.length!==7||rules.some(r=>r.DELETE_RULE!=='CASCADE'))throw Error('BUSINESS_SETUP_FOREIGN_KEYS');
}
export async function prepareBusinessStorage(env:Record<string,string|undefined>){
 const settings=businessOperatorSettings(env);if(env.LUQI_BUSINESS_CONNECT_ENABLED==='true')throw Error('BUSINESS_SETUP_FEATURE_MUST_BE_OFF');
 const apply=env.LUQI_BUSINESS_SCHEMA_INTENT===BUSINESS_SETUP_INTENT;
 if(env.LUQI_BUSINESS_SCHEMA_INTENT&&!apply)throw Error('BUSINESS_SETUP_SCOPE_REJECTED');
 let operator:Connection|undefined,runtime:Connection|undefined,locked=false;
 try{
  operator=await mysql.createConnection({...settings.operator,connectTimeout:4000});runtime=await mysql.createConnection({...settings.runtime,connectTimeout:4000});await runtime.query('SET SESSION TRANSACTION READ ONLY');if(!apply)await operator.query('SET SESSION TRANSACTION READ ONLY');
  await validateRuntimeSchemaConnection(runtime,RUNTIME_TABLES,false);
  const[identity]=await runtime.query<RowDataPacket[]>('SELECT CURRENT_USER() AS identity,CURRENT_ROLE() AS roles');
  if(identity[0]?.identity!==settings.runtime.user+'@%'||identity[0]?.roles!=='NONE')throw Error('BUSINESS_SETUP_IDENTITY_REJECTED');
  const[grants]=await runtime.query<RowDataPacket[]>('SHOW GRANTS');
  const entries=grants.map(g=>String(Object.values(g)[0]));
  if(entries.some(g=>g.includes('WITH GRANT OPTION')||!g.startsWith('GRANT USAGE ON *.* TO ')&&(g.includes(' ON *.* ')||g.includes(' ON `'+settings.runtime.database+'`.* '))))throw Error('BUSINESS_SETUP_GRANTS_REJECTED');
  const[lock]=await operator.query<RowDataPacket[]>({sql:"SELECT GET_LOCK(CONCAT('luqi-business-setup:',DATABASE()),0) AS acquired",timeout:4000});if(Number(lock[0]?.acquired)!==1)throw Error('BUSINESS_SETUP_BUSY');locked=true;
  const[tables]=await operator.query<RowDataPacket[]>("SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('luqi_business_meta_v1','luqi_business_reviewers_v1','luqi_business_profiles_v1','luqi_business_audit_v1','luqi_business_usage_v1','luqi_business_reports_v1')");
  let created=0;
  if(tables.length!==0&&tables.length!==6)throw Error('BUSINESS_SETUP_PARTIAL_SCHEMA');
  if(tables.length===0){
   if(!apply)return{format:'luqi.business-storage.v1',status:'setup_required',tablesPresent:0,customerRowsModified:false,flagsChanged:false};
   if(BUSINESS_CREATE_STATEMENTS.length!==6||BUSINESS_CREATE_STATEMENTS.some(s=>!/^CREATE TABLE IF NOT EXISTS luqi_business_(?:meta|reviewers|profiles|audit|usage|reports)_v1 \(/.test(s)||/\b(?:ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE)\s+(?:TABLE|INTO|FROM|users)\b/i.test(s)))throw Error('BUSINESS_SETUP_DDL_REJECTED');
   if(createHash('sha256').update(BUSINESS_CREATE_STATEMENTS.join('\n')).digest('hex')!==BUSINESS_SCHEMA_DIGEST)throw Error('BUSINESS_SETUP_DDL_REJECTED');
   for(const sql of BUSINESS_CREATE_STATEMENTS)await operator.query({sql,timeout:4000});created=6;
   await operator.execute('INSERT INTO luqi_business_meta_v1(id,digest) VALUES(1,?)',[BUSINESS_SCHEMA_DIGEST]);
  }
  await validate(operator);
  const schema=mysql.escapeId(settings.runtime.database),account=mysql.escapeId(settings.runtime.user)+'@`%`';
  let granted=0;
  for(const[table,privileges]of Object.entries(BUSINESS_RUNTIME_GRANTS)){
   const exact='GRANT '+privileges+' ON '+schema+'.'+mysql.escapeId(table)+' TO '+account;
   const existing=entries.filter(g=>g.includes('.'+mysql.escapeId(table)+' TO '));
   if(existing.length&&(!existing.includes(exact)||existing.length!==1))throw Error('BUSINESS_SETUP_GRANTS_REJECTED');
   if(!existing.length){if(!apply)throw Error('BUSINESS_SETUP_GRANTS_MISSING');await operator.query({sql:exact,timeout:4000});granted++;}
  }
  await validate(runtime);
  const[after]=await runtime.query<RowDataPacket[]>('SHOW GRANTS');const afterEntries=after.map(g=>String(Object.values(g)[0]));
  for(const[table,privileges]of Object.entries(BUSINESS_RUNTIME_GRANTS))if(!afterEntries.includes('GRANT '+privileges+' ON '+schema+'.'+mysql.escapeId(table)+' TO '+account))throw Error('BUSINESS_SETUP_GRANTS_MISSING');
  const[reviewers]=await runtime.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM luqi_business_reviewers_v1 r JOIN users u ON u.id=r.user_id WHERE r.active=1 AND u.is_active=1");
  return{format:'luqi.business-storage.v1',status:'validated',tablesCreated:created,grantsAdded:granted,reviewerAssigned:Number(reviewers[0]?.n)>0,customerRowsModified:false,flagsChanged:false,identitiesCreated:false};
 }catch{throw Error('BUSINESS_SETUP_UNAVAILABLE');}
 finally{if(operator&&locked)await operator.query("DO RELEASE_LOCK(CONCAT('luqi-business-setup:',DATABASE()))").catch(()=>undefined);for(const c of[runtime,operator])if(c)await c.end().catch(()=>c.destroy());}
}
