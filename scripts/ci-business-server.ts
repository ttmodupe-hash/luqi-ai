/** Disposable MySQL browser fixture only. Cannot select a production target. */
import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:https';
import {serve} from '@hono/node-server';
import {bootstrapDatabase} from '../db/bootstrap';
import {WEB_RUNTIME_GRANTS} from '../db/runtimeRole';
import {prepareBusinessStorage,BUSINESS_SETUP_INTENT} from '../db/prepareBusinessStorage';
import {checkRuntimeSchema} from '../db/runtimeSchema';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
const RUNTIME='mysql://luqi_business_fixture:business-fixture-only-password@127.0.0.1:3306/luqi_ci';
if(process.env.GITHUB_ACTIONS!=='true'||process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.DATABASE_URL!==ROOT)throw Error('Refusing non-disposable business browser fixture');
await bootstrapDatabase();const c=await mysql.createConnection(ROOT);
try{await c.query("CREATE USER IF NOT EXISTS 'luqi_business_fixture'@'%' IDENTIFIED BY 'business-fixture-only-password'");for(const[t,g]of Object.entries(WEB_RUNTIME_GRANTS))await c.query('GRANT '+g+' ON luqi_ci.'+mysql.escapeId(t)+" TO 'luqi_business_fixture'@'%'");}finally{await c.end();}
await prepareBusinessStorage({DATABASE_URL:RUNTIME,LUQI_DB_OPERATOR_URL:ROOT,LUQI_BUSINESS_SCHEMA_INTENT:BUSINESS_SETUP_INTENT,LUQI_MYSQL_CI_FIXTURE:'true',GITHUB_ACTIONS:'true'});
process.env.DATABASE_URL=RUNTIME;process.env.JWT_SECRET='synthetic-business-browser-secret-with-over-32-characters';process.env.NODE_ENV='test';process.env.LUQI_BUSINESS_CONNECT_ENABLED='true';
for(const key of ['LUQI_AI_PROVIDER_ENABLED','LUQI_AI_BILLING_APPROVED','LUQI_AI_CREDENTIAL_CHECK_ENABLED','LUQI_P2P_ENABLED','LUQI_CUSTOMER_RESUME_ENABLED'])process.env[key]='false';
await checkRuntimeSchema();const{default:app}=await import('../api/boot');const{serveStaticFiles}=await import('../api/lib/vite');serveStaticFiles(app);
serve({fetch:app.fetch,hostname:'127.0.0.1',port:8776,createServer,serverOptions:{key:await readFile('/tmp/luqi-business.key'),cert:await readFile('/tmp/luqi-business.crt')}});
