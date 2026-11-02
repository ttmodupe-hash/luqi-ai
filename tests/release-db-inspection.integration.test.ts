/** Disposable MySQL only. Tests the exact metadata-only operator checker. */
import {beforeAll,afterAll,it,expect} from 'vitest';
import mysql,{type Pool,type RowDataPacket} from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {bootstrapDatabase} from '../db/bootstrap';
import {WEB_RUNTIME_GRANTS,expectedWebRuntimeGrants} from '../db/runtimeRole';
import {inspectReleaseDatabase,inspectionSettings} from '../db/releaseInspection';
import {checkP2PReadiness} from '../db/p2pPreflight';
import {checkRuntimeSchema} from '../db/runtimeSchema';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const RUNTIME='mysql://luqi_release_fixture:release-fixture-only-password@127.0.0.1:3306/luqi_ci';
const env={GITHUB_ACTIONS:'true',LUQI_MYSQL_CI_FIXTURE:'true',DATABASE_URL:RUNTIME,LUQI_DB_OPERATOR_URL:ROOT};
let root:Pool;
async function grants(){return (await root.query<RowDataPacket[]>("SHOW GRANTS FOR 'luqi_release_fixture'@'%'")).map(r=>JSON.stringify(r))}
beforeAll(async()=>{
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.DATABASE_URL!==ROOT)throw Error('Refusing non-disposable release inspection fixture');
 await bootstrapDatabase();root=mysql.createPool({host:'127.0.0.1',port:3306,user:'root',password:'ci-ephemeral-only-password',database:'luqi_ci',multipleStatements:true});
 for(const name of ['customer-device-sessions-v1.sql','p2p-circles-v1.sql'])await root.query(await readFile('db/migrations/'+name,'utf8'));
 await root.query("CREATE USER 'luqi_release_fixture'@'%' IDENTIFIED BY 'release-fixture-only-password'");
 for(const[t,g] of Object.entries(WEB_RUNTIME_GRANTS))await root.query('GRANT '+g+' ON luqi_ci.'+mysql.escapeId(t)+" TO 'luqi_release_fixture'@'%'");
},60000);
afterAll(async()=>{await root?.end()});
it('shows absent runtime feature grants without changing them or reading customer rows',async()=>{
 const before=await grants();const report=await inspectReleaseDatabase(env);
 expect(report.readOnly).toBe(true);expect(report.customerRowsRead).toBe(false);expect(report.structure.combined).toBe('validated');
 expect(report.runtimeAccess.core).toBe('validated');expect(report.runtimeAccess.combined).toBe('unavailable');
 expect(report.combinedGrants.valid).toBe(false);expect(report.combinedGrants.missingTables).toHaveLength(6);
 expect(await grants()).toEqual(before);expect(JSON.stringify(report)).not.toContain('password');
});
it('validates sessions and P2P together with exact grants and keeps both real process flags off',async()=>{
 const candidate={...env,LUQI_CUSTOMER_RESUME_ENABLED:'true',LUQI_P2P_ENABLED:'true',LUQI_P2P_REPORT_KEY:Buffer.alloc(32,11).toString('base64url')};
 for(const[t,g]of Object.entries(expectedWebRuntimeGrants(candidate)))if(!(t in WEB_RUNTIME_GRANTS))await root.query('GRANT '+g+' ON luqi_ci.'+mysql.escapeId(t)+" TO 'luqi_release_fixture'@'%'");
 const report=await inspectReleaseDatabase(env);expect(report.combinedGrants.valid).toBe(true);expect(report.runtimeAccess.combined).toBe('validated');
 await checkP2PReadiness(candidate);expect(await checkRuntimeSchema(candidate)).toEqual({status:'validated',tables:14});
 expect(process.env.LUQI_P2P_ENABLED).not.toBe('true');expect(process.env.LUQI_CUSTOMER_RESUME_ENABLED).not.toBe('true');
});
it('detects excess inactive role grants without returning SQL credentials or raw grants',async()=>{
 await root.query("CREATE ROLE 'release_unused_fixture_role'");await root.query("GRANT 'release_unused_fixture_role' TO 'luqi_release_fixture'@'%'");
 try{const r=await inspectReleaseDatabase(env);expect(r.activeRolesNone).toBe(true);expect(r.combinedGrants.valid).toBe(false);expect(r.combinedGrants.unexpectedGrantCount).toBe(1)}
 finally{await root.query("REVOKE 'release_unused_fixture_role' FROM 'luqi_release_fixture'@'%'");await root.query("DROP ROLE 'release_unused_fixture_role'")}
});
it('refuses wrong targets, broad runtime identity and missing production source binding before SQL',()=>{
 for(const input of [{},{...env,DATABASE_URL:ROOT},{...env,LUQI_DB_OPERATOR_URL:ROOT.replace('luqi_ci','private_db')},
   {...env,LUQI_MYSQL_CI_FIXTURE:'false'},{...env,GITHUB_ACTIONS:'false'}])expect(()=>inspectionSettings(input)).toThrow();
});
