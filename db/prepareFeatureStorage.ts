/** Explicit private operator operation. Never called by boot or an HTTP route.
 * Creates only the six reviewed, absent feature tables and their table grants.
 * Existing tables, accounts, credentials, budgets and payment rows are untouched. */
import mysql,{type Connection} from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inspectionSettings,inspectReleaseDatabase} from './releaseInspection';
import {expectedWebRuntimeGrants,WEB_RUNTIME_GRANTS} from './runtimeRole';
export const FEATURE_SETUP_INTENT='create-new-feature-storage-v1';
const sources=[
  ['customer-device-sessions-v1.sql','0cc155bf5d767638a824ed0d9144bb14472547b4cacd54323892f50da0813cf4'],
  ['p2p-circles-v1.sql','e9c918a68b8f7ca4e43abb475e1e4a641473679bb1ebb92e7512fe4a551dc3e5'],
] as const;
export async function reviewedFeatureStatements(directory='db/migrations'){
  const statements:string[]=[];
  for(const[name,expected]of sources){const bytes=await readFile(directory+'/'+name);
    if(createHash('sha256').update(bytes).digest('hex')!==expected)throw Error('RELEASE_SETUP_MIGRATION_MISMATCH');
    statements.push(...bytes.toString('utf8').replace(/^\s*--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean));}
  if(statements.length!==7||statements.filter(s=>s.startsWith('CREATE TABLE ')).length!==6||
      statements.filter(s=>s.startsWith('INSERT INTO luqi_p2p_audit_head_v1(')).length!==1)throw Error('RELEASE_SETUP_MIGRATION_MISMATCH');
  return statements;
}
export async function prepareFeatureStorage(environment:Record<string,string|undefined>,directory='db/migrations'){
  if(environment.LUQI_RELEASE_SCHEMA_APPLY!==FEATURE_SETUP_INTENT||environment.LUQI_P2P_ENABLED==='true'||
      environment.LUQI_CUSTOMER_RESUME_ENABLED==='true')throw Error('RELEASE_SETUP_SCOPE_REJECTED');
  const settings=inspectionSettings(environment),statements=await reviewedFeatureStatements(directory);
  let operator:Connection|undefined,locked=false;
  const lock='luqi-feature-storage-v1-'+createHash('sha256').update(settings.operator.database).digest('hex').slice(0,16);
  try{
    operator=await mysql.createConnection({...settings.operator,connectTimeout:4000});
    const [locks]=await operator.query<mysql.RowDataPacket[]>({sql:'SELECT GET_LOCK(?,0) AS acquired',timeout:4000},[lock]);
    if(Number(locks[0]?.acquired)!==1)throw Error('RELEASE_SETUP_BUSY');locked=true;
    const before=await inspectReleaseDatabase(environment);
    const version=before.serverVersion.split('.').map(Number);
    if(version.length!==3||version[0]!==8||(version[1]===0&&version[2]<22))throw Error('RELEASE_SETUP_VERSION_REJECTED');
    if(before.structure.core!=='validated'||before.runtimeAccess.core!=='validated'||!before.activeRolesNone||before.combinedGrants.unexpectedGrantCount)
      throw Error('RELEASE_SETUP_BASELINE_REJECTED');
    if(before.combinedGrants.valid&&before.runtimeAccess.combined==='validated'&&before.p2pAuditHeadValid)
      return {format:'luqi.release-db-setup.v1',tablesCreated:0,grantsAdded:0,idempotent:true,customerRowsModified:false,after:before};
    // Never adopt a partial, historical, populated or mismatched feature schema.
    // MySQL DDL auto-commits: a failed partial setup must be independently reviewed.
    if(before.featureTablesPresent.length!==0)throw Error('RELEASE_SETUP_EXISTING_STORAGE_REJECTED');
    for(const sql of statements)await operator.query({sql,timeout:4000});
    const schema=mysql.escapeId(settings.runtime.database),account=mysql.escapeId(settings.runtime.user)+'@`%`';
    const all=expectedWebRuntimeGrants({...environment,LUQI_CUSTOMER_RESUME_ENABLED:'true',LUQI_P2P_ENABLED:'true'});
    const additions=Object.entries(all).filter(([name])=>!(name in WEB_RUNTIME_GRANTS));
    if(additions.length!==6)throw Error('RELEASE_SETUP_GRANT_SCOPE_REJECTED');
    for(const[table,grants]of additions)await operator.query({sql:'GRANT '+grants+' ON '+schema+'.'+mysql.escapeId(table)+' TO '+account,timeout:4000});
    const after=await inspectReleaseDatabase(environment);
    if(!after.combinedGrants.valid||after.runtimeAccess.combined!=='validated'||after.structure.combined!=='validated'||!after.p2pAuditHeadValid)
      throw Error('RELEASE_SETUP_VERIFICATION_FAILED');
    return {format:'luqi.release-db-setup.v1',tablesCreated:6,grantsAdded:6,idempotent:false,customerRowsModified:false,after};
  }catch{throw Error('RELEASE_SETUP_UNAVAILABLE')}
  finally{if(operator){if(locked)await operator.query({sql:'DO RELEASE_LOCK(?)',timeout:4000},[lock]).catch(()=>{});
    await operator.end().catch(()=>operator?.destroy())}}
}
