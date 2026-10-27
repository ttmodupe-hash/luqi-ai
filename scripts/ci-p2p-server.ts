/** Local disposable CI only. Has no deployment or production credential path. */
import mysql from 'mysql2/promise';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:https';
import {serve} from '@hono/node-server';
import {bootstrapDatabase} from '../db/bootstrap';
import {WEB_RUNTIME_GRANTS} from '../db/runtimeRole';
import {P2P_RUNTIME_GRANTS} from '../db/p2pContracts';
import {checkRuntimeSchema} from '../db/runtimeSchema';
import {checkP2PReadiness} from '../db/p2pPreflight';
const ROOT='mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
if(process.env.LUQI_MYSQL_CI_FIXTURE!=='true'||process.env.GITHUB_ACTIONS!=='true'||process.env.DATABASE_URL!==ROOT)throw Error('Refusing non-disposable P2P browser fixture');
await bootstrapDatabase();
const c=await mysql.createConnection({host:'127.0.0.1',port:3306,user:'root',password:'ci-ephemeral-only-password',database:'luqi_ci',multipleStatements:true});
try{
 await c.query(await readFile('db/migrations/p2p-circles-v1.sql','utf8'));
 await c.query("CREATE USER 'luqi_p2p_browser'@'%' IDENTIFIED BY 'p2p-browser-fixture-only-password'");
 for(const[t,g]of Object.entries({...WEB_RUNTIME_GRANTS,...P2P_RUNTIME_GRANTS}))await c.query('GRANT '+g+' ON luqi_ci.'+mysql.escapeId(t)+" TO 'luqi_p2p_browser'@'%'");
}finally{await c.end()}
process.env.DATABASE_URL='mysql://luqi_p2p_browser:p2p-browser-fixture-only-password@127.0.0.1:3306/luqi_ci';
process.env.JWT_SECRET='synthetic-p2p-browser-only-secret-with-over-32-characters';
process.env.LUQI_P2P_ENABLED='true';process.env.LUQI_P2P_REPORT_KEY=Buffer.alloc(32,29).toString('base64url');
process.env.LUQI_AI_PROVIDER_ENABLED='false';process.env.LUQI_AI_BILLING_APPROVED='false';process.env.LUQI_AI_CREDENTIAL_CHECK_ENABLED='false';process.env.NODE_ENV='test';
await checkRuntimeSchema();await checkP2PReadiness();
const{default:app}=await import('../api/boot');const{serveStaticFiles}=await import('../api/lib/vite');
serveStaticFiles(app);
serve({fetch:app.fetch,hostname:'127.0.0.1',port:8774,createServer,serverOptions:{key:await readFile('/tmp/luqi-p2p.key'),cert:await readFile('/tmp/luqi-p2p.crt')}});
