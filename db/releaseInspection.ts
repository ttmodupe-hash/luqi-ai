/** One-off private SQL metadata inspection. Never imported by HTTP handlers.
 * Both connections are read-only sessions. No credentials or customer rows are returned. */
import mysql, {type Connection,type RowDataPacket} from 'mysql2/promise';
import {createHash} from 'node:crypto';
import {parseMySqlConnectionSettings,type MySqlConnectionSettings} from '../api/lib/mysqlConfig';
import {runtimeTableContracts,validateRuntimeSchemaConnection} from './runtimeSchema';
import {expectedWebRuntimeGrants,WEB_RUNTIME_USER} from './runtimeRole';
const PROJECT='9f627cb8-3136-4b30-89d2-32ca648a1e5f';
const ENVIRONMENT='1e192ef3-1fa6-4684-81fc-60165c7b0e22';
export function inspectionSettings(environment:Record<string,string|undefined>){
  const runtime=parseMySqlConnectionSettings(environment);
  const operator=parseMySqlConnectionSettings({DATABASE_URL:environment.LUQI_DB_OPERATOR_URL});
  const fixture=environment.GITHUB_ACTIONS==='true'&&environment.LUQI_MYSQL_CI_FIXTURE==='true'&&
    environment.LUQI_DB_OPERATOR_URL==='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci'&&
    runtime?.host==='127.0.0.1'&&runtime.port===3306&&runtime.database==='luqi_ci'&&runtime.user==='luqi_release_fixture';
  const production=environment.RAILWAY_PROJECT_ID===PROJECT&&environment.RAILWAY_ENVIRONMENT_ID===ENVIRONMENT&&
    environment.RAILWAY_SERVICE_NAME==='luqi-release-db-check'&&
    /^[a-f0-9]{40}$/.test(environment.LUQI_DB_CHECK_SOURCE_SHA??'')&&
    environment.RAILWAY_GIT_COMMIT_SHA===environment.LUQI_DB_CHECK_SOURCE_SHA&&runtime?.host.endsWith('.railway.internal');
  if(!runtime||!operator||(!fixture&&!production)||runtime.host!==operator.host||runtime.port!==operator.port||
    runtime.database!==operator.database||!/^[A-Za-z0-9_]{1,64}$/.test(runtime.database)||runtime.user!== (fixture?'luqi_release_fixture':WEB_RUNTIME_USER)||
    operator.user===runtime.user)throw Error('RELEASE_INSPECTION_SCOPE_REJECTED');
  return {runtime,operator,fixture};
}
async function open(settings:MySqlConnectionSettings){
  const c=await mysql.createConnection({...settings,connectTimeout:4000});
  try{await c.query({sql:'SET SESSION TRANSACTION READ ONLY',timeout:4000});return c}catch{c.destroy();throw Error('RELEASE_INSPECTION_UNAVAILABLE')}
}
async function safeCheck(work:()=>Promise<unknown>){try{await work();return 'validated' as const}catch{return 'unavailable' as const}}
const query=(c:Connection,sql:string,params:unknown[]=[])=>c.query<RowDataPacket[]>({sql,timeout:4000},params).then(r=>r[0]);
export async function inspectReleaseDatabase(environment:Record<string,string|undefined>){
  const settings=inspectionSettings(environment);let operator:Connection|undefined,runtime:Connection|undefined;
  try{
    operator=await open(settings.operator);runtime=await open(settings.runtime);
    const owner=operator,web=runtime;
    const [identity]=await query(web,'SELECT CURRENT_USER() AS identity,CURRENT_ROLE() AS roles,VERSION() AS version');
    const at=String(identity?.identity??'').lastIndexOf('@');
    if(at<1||String(identity.identity).slice(0,at)!==settings.runtime.user)throw Error('RELEASE_INSPECTION_UNAVAILABLE');
    const account=mysql.escapeId(settings.runtime.user)+'@'+mysql.escapeId(String(identity.identity).slice(at+1));
    const schema=mysql.escapeId(settings.runtime.database);
    const candidates={...environment,LUQI_CUSTOMER_RESUME_ENABLED:'true',LUQI_P2P_ENABLED:'true'};
    const grants=(await query(web,'SHOW GRANTS')).map(r=>String(Object.values(r)[0]));
    const expected=Object.entries(expectedWebRuntimeGrants(candidates)).map(([table,privileges])=>
      ({table,grant:'GRANT '+privileges+' ON '+schema+'.'+mysql.escapeId(table)+' TO '+account}));
    const missing=expected.filter(e=>!grants.includes(e.grant)).map(e=>e.table);
    const required=new Set(['GRANT USAGE ON *.* TO '+account,...expected.map(e=>e.grant)]);
    const unexpected=grants.filter(g=>!required.has(g)).length;
    const modes=[['core',{...environment,LUQI_CUSTOMER_RESUME_ENABLED:'false',LUQI_P2P_ENABLED:'false'}],
      ['sessions',{...candidates,LUQI_P2P_ENABLED:'false'}],['p2p',{...candidates,LUQI_CUSTOMER_RESUME_ENABLED:'false'}],
      ['combined',candidates]] as const;
    const structure:Record<string,string>={},runtimeAccess:Record<string,string>={};
    for(const [name,env] of modes){const contracts=runtimeTableContracts(env);
      structure[name]=await safeCheck(()=>validateRuntimeSchemaConnection(owner,contracts,false));
      runtimeAccess[name]=await safeCheck(()=>validateRuntimeSchemaConnection(web,contracts));}
    const tables=['customer_device_sessions_v1','luqi_p2p_circles_v1','luqi_p2p_blocks_v1','luqi_p2p_messages_v1','luqi_p2p_audit_head_v1','luqi_p2p_reports_v1'];
    const present=await query(owner,'SELECT TABLE_NAME AS name FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?,?,?) ORDER BY TABLE_NAME',tables);
    let p2pAuditHeadValid=false;
    if(present.some(t=>t.name==='luqi_p2p_audit_head_v1')){
      const head=await query(owner,'SELECT seal FROM luqi_p2p_audit_head_v1 WHERE id=1');
      p2pAuditHeadValid=head.length===1&&/^[a-f0-9]{64}$/.test(head[0].seal);
    }
    const fingerprint=await query(owner,'SELECT TABLE_NAME,COLUMN_NAME,COLUMN_TYPE,IS_NULLABLE,COLLATION_NAME FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?,?,?) ORDER BY TABLE_NAME,ORDINAL_POSITION',tables);
    return {format:'luqi.release-db-inspection.v1',recordedAt:new Date().toISOString(),sourceCommit:environment.RAILWAY_GIT_COMMIT_SHA??'disposable-ci',
      readOnly:true,customerRowsRead:false,productionFlagsChanged:false,identity:'dedicated_web',activeRolesNone:identity.roles==='NONE',
      serverVersion:String(identity.version).match(/^\d+\.\d+\.\d+/)?.[0]??'unavailable',p2pAuditHeadValid,
      featureTablesPresent:present.map(t=>t.name),featureSchemaFingerprint:createHash('sha256').update(JSON.stringify(fingerprint)).digest('hex'),
      structure,runtimeAccess,combinedGrants:{valid:missing.length===0&&unexpected===0&&identity.roles==='NONE',missingTables:missing,unexpectedGrantCount:unexpected}};
  }catch{throw Error('RELEASE_INSPECTION_UNAVAILABLE')}
  finally{for(const c of [runtime,operator])if(c)await c.end().catch(()=>c.destroy())}
}
