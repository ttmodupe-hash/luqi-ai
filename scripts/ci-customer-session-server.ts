/** Disposable HTTPS + restricted MySQL fixture, never a deployment command. */
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:https';
import { serve } from '@hono/node-server';
import { bootstrapDatabase } from '../db/bootstrap';
import { WEB_RUNTIME_GRANTS } from '../db/runtimeRole';
import { checkRuntimeSchema } from '../db/runtimeSchema';
const fixture = 'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci';
if (process.env.LUQI_MYSQL_CI_FIXTURE !== 'true' || process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.DATABASE_URL !== fixture) throw new Error('Refusing non-disposable session browser fixture');
await bootstrapDatabase();
const operator = await mysql.createConnection(fixture);
try {
  await operator.query(await readFile('db/migrations/customer-device-sessions-v1.sql', 'utf8'));
  await operator.query("CREATE USER 'luqi_session_browser'@'%' IDENTIFIED BY 'browser-fixture-only-password'");
  for (const [table, grants] of Object.entries({ ...WEB_RUNTIME_GRANTS, customer_device_sessions_v1: 'SELECT, INSERT, UPDATE' })) {
    await operator.query('GRANT ' + grants + ' ON luqi_ci.' + mysql.escapeId(table) + " TO 'luqi_session_browser'@'%'");
  }
} finally { await operator.end(); }
process.env.DATABASE_URL = 'mysql://luqi_session_browser:browser-fixture-only-password@127.0.0.1:3306/luqi_ci';
process.env.JWT_SECRET = 'synthetic-session-browser-only-secret-with-over-32-characters';
process.env.LUQI_CUSTOMER_RESUME_ENABLED = 'true';
process.env.LUQI_AI_PROVIDER_ENABLED = 'false'; process.env.LUQI_AI_BILLING_APPROVED = 'false';
process.env.LUQI_AI_CREDENTIAL_CHECK_ENABLED = 'false'; process.env.NODE_ENV = 'test';
await checkRuntimeSchema();
const { default: app } = await import('../api/boot');
const { serveStaticFiles } = await import('../api/lib/vite');
serveStaticFiles(app);
serve({ fetch: app.fetch, port: 8769, hostname: '127.0.0.1', createServer,
  serverOptions: { key: await readFile('/tmp/luqi-session-fixture.key'),
    cert: await readFile('/tmp/luqi-session-fixture.crt') } });
