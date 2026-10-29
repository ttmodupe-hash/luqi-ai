/** Exact disposable database only. No production credential or data path. */
import {beforeAll,afterAll,it,expect} from 'vitest';
import mysql,{type Pool,type RowDataPacket} from 'mysql2/promise';
import {bootstrapDatabase} from '../db/bootstrap';
import {WEB_RUNTIME_GRANTS} from '../db/runtimeRole';
import {FEATURE_SETUP_INTENT,prepareFeatureStorage,reviewedFeatureStatements} from '../db/prepareFeatureStorage';
import {inspectReleaseDatabase} from '../db/releaseInspection';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const env={GITHUB_ACTIONS:'true',LUQI_MYSQL_CI_FIXTURE:'true',DATABASE_URL:'mysql://luqi_release_fixture:release-fixture-only-password@127.0.0.1:3306/luqi_ci',LUQI_DB_OPERATOR_URL:ROOT,LUQI_RELEASE_SCHEMA_APPLY:FEATURE_SETUP_INTENT};
let root:Pool;
beforeAll(async()=>{
 if(process.env.GITHUB_ACTIONS!=='true'||process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.DATABASE_URL!==ROOT)throw Error('Refusing non-disposable setup fixture');
 await bootstrapDatabase();root=mysql.createPool(ROOT);
 await root.query("CREATE USER 'luqi_release_fixture'@'%' IDENTIFIED BY 'release-fixture-only-password'");
 for(const[t,g]of Object.entries(WEB_RUNTIME_GRANTS))await root.query('GRANT '+g+' ON luqi_ci.'+mysql.escapeId(t)+" TO 'luqi_release_fixture'@'%'");
 await root.query("INSERT INTO users(email,password_hash,role,is_active) VALUES('preserved-setup-fixture@example.invalid','synthetic-fixture-hash','user',1)");
},60000);
afterAll(async()=>{await root?.end()});
it('refuses an absent intent or enabled feature before writes',async()=>{
 await expect(prepareFeatureStorage({...env,LUQI_RELEASE_SCHEMA_APPLY:''})).rejects.toThrow();
 await expect(prepareFeatureStorage({...env,LUQI_P2P_ENABLED:'true'})).rejects.toThrow();
 expect((await inspectReleaseDatabase(env)).featureTablesPresent).toEqual([]);
});
it('creates exactly six reviewed feature tables and grants while preserving all customer rows',async()=>{
 const[before]=await root.query<RowDataPacket[]>('SELECT * FROM users ORDER BY id');
 const result=await prepareFeatureStorage(env);expect(result.tablesCreated).toBe(6);expect(result.grantsAdded).toBe(6);
 expect(result.after.combinedGrants.valid).toBe(true);expect(result.after.runtimeAccess.combined).toBe('validated');
 const[after]=await root.query<RowDataPacket[]>('SELECT * FROM users ORDER BY id');expect(after).toEqual(before);
 const[head]=await root.query<RowDataPacket[]>('SELECT * FROM luqi_p2p_audit_head_v1');expect(head).toHaveLength(1);expect(head[0].seal).toBe('0'.repeat(64));
});
it('repeating an already verified setup performs no new DDL or grant additions',async()=>{
 const result=await prepareFeatureStorage(env);expect(result.idempotent).toBe(true);expect(result.tablesCreated).toBe(0);expect(result.grantsAdded).toBe(0);
});
it('refuses altered existing schema and never repairs or replaces it',async()=>{
 await root.query('ALTER TABLE customer_device_sessions_v1 ADD COLUMN unexpected_fixture INT NULL');
 await expect(prepareFeatureStorage(env)).rejects.toThrow();
 const[cols]=await root.query<RowDataPacket[]>("SHOW COLUMNS FROM customer_device_sessions_v1 LIKE 'unexpected_fixture'");expect(cols).toHaveLength(1);
});
it('binds the operator to the exact reviewed migration bytes',async()=>{
 expect(await reviewedFeatureStatements()).toHaveLength(7);
 await expect(reviewedFeatureStatements('/tmp/missing-reviewed-fixture')).rejects.toThrow();
});
