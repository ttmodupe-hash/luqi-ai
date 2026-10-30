/** Private one-time operator utility. Never imported by the HTTP runtime. */
import { P2P_RUNTIME_GRANTS } from './p2pContracts';
import { BUSINESS_RUNTIME_GRANTS } from './businessConnectContracts';
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../api/lib/mysqlConfig';
import { checkRuntimeSchema } from './runtimeSchema';

export const WEB_RUNTIME_USER = 'luqi_web_runtime';
export const WEB_RUNTIME_GRANTS: Readonly<Record<string, string>> = {
  users: 'SELECT, INSERT, UPDATE',
  companion_conversations: 'SELECT, INSERT, UPDATE, DELETE',
  companion_messages: 'SELECT, INSERT, DELETE',
  companion_memories: 'SELECT, DELETE',
  offline_sync_queue: 'SELECT, INSERT, UPDATE',
  auth_attempt_windows: 'SELECT, INSERT, UPDATE, DELETE',
  ai_pilot_monthly_spend: 'SELECT, INSERT, UPDATE',
  ai_pilot_daily_user_usage: 'SELECT, INSERT, UPDATE',
};
/** One authoritative grant contract for all enabled combinations. No SQL writes. */
export function expectedWebRuntimeGrants(environment: Record<string,string|undefined>): Readonly<Record<string,string>> {
  return { ...WEB_RUNTIME_GRANTS,
    ...(environment.LUQI_BUSINESS_CONNECT_ENABLED === 'true' ? BUSINESS_RUNTIME_GRANTS : {}),
    ...(environment.LUQI_CUSTOMER_RESUME_ENABLED === 'true' ? {customer_device_sessions_v1:'SELECT, INSERT, UPDATE'} : {}),
    ...(environment.LUQI_P2P_ENABLED === 'true' ? P2P_RUNTIME_GRANTS : {}),
    ...(environment.LUQI_OMEGA_WEB_ENABLED === 'true' ? {omega_tasks_v1:'SELECT, INSERT, UPDATE, DELETE'} : {}),
    ...(environment.LUQI_PROJECT_VAULT_ENABLED === 'true' ? {luqi_project_vault_v1:'SELECT, INSERT, UPDATE, DELETE'} : {}) };
}
const unavailable = () => new Error('MYSQL_RUNTIME_ROLE_UNAVAILABLE');

export async function prepareRuntimeRole(environment: Record<string, string | undefined>, provisionNew = false) {
  let operator: Connection | undefined, restricted: Connection | undefined;
  try {
    const settings = parseMySqlConnectionSettings(environment);
    const password = environment.LUQI_RUNTIME_DB_PASSWORD ?? '';
    const optionalEnabled = ['LUQI_P2P_ENABLED','LUQI_OMEGA_WEB_ENABLED','LUQI_CUSTOMER_RESUME_ENABLED','LUQI_PROJECT_VAULT_ENABLED','LUQI_BUSINESS_CONNECT_ENABLED']
      .some(name => environment[name] === 'true');
    const expectedGrants = expectedWebRuntimeGrants(environment);
    if (!settings || !/^[a-f0-9]{64}$/.test(password) || password === settings.password ||
        !/^[a-zA-Z0-9_]{1,64}$/.test(settings.database) || settings.user === WEB_RUNTIME_USER ||
        (provisionNew && optionalEnabled)) throw unavailable();
    const fixture = environment.LUQI_MYSQL_CI_FIXTURE === 'true' && settings.host === '127.0.0.1' &&
      settings.port === 3306 && settings.database === 'luqi_ci';
    if (!fixture && !settings.host.endsWith('.railway.internal')) throw unavailable();
    const account = `\`${WEB_RUNTIME_USER}\`@\`%\``;
    const database = mysql.escapeId(settings.database);
    if (provisionNew) {
      operator = await mysql.createConnection({ ...settings, connectTimeout: 4_000 });
      // Validate existing tables before creating any account; never migrate data.
      if ((await checkRuntimeSchema(environment)).status !== 'validated') throw unavailable();
      const [exists] = await operator.query<RowDataPacket[]>({
        sql: 'SELECT COUNT(*) AS n FROM mysql.user WHERE User=?', timeout: 4_000,
      }, [WEB_RUNTIME_USER]);
      // Never alter, overwrite, revoke or drop an existing identity, even on retry.
      if (Number(exists[0]?.n) !== 0) throw unavailable();
      await operator.query({ sql: "CREATE USER ?@'%' IDENTIFIED BY ?", timeout: 4_000 }, [WEB_RUNTIME_USER, password]);
      for (const [table, permissions] of Object.entries(WEB_RUNTIME_GRANTS)) {
        await operator.query({ sql: `GRANT ${permissions} ON ${database}.${mysql.escapeId(table)} TO ${account}`, timeout: 4_000 });
      }
    }
    restricted = await mysql.createConnection({ ...settings, user: WEB_RUNTIME_USER, password, connectTimeout: 4_000 });
    const [roles] = await restricted.query<RowDataPacket[]>({ sql: 'SELECT CURRENT_ROLE() AS active_roles', timeout: 4_000 });
    if (roles[0]?.active_roles !== 'NONE') throw unavailable();
    const [grants] = await restricted.query<RowDataPacket[]>({ sql: 'SHOW GRANTS', timeout: 4_000 });
    const expected = new Set([`GRANT USAGE ON *.* TO ${account}`,
      ...Object.entries(expectedGrants).map(([table, permissions]) =>
        `GRANT ${permissions} ON ${database}.${mysql.escapeId(table)} TO ${account}`)]);
    if (grants.length !== expected.size || grants.some(row => !expected.delete(String(Object.values(row)[0]))) || expected.size) {
      throw unavailable();
    }
    const target = new URL('mysql://placeholder');
    target.hostname = settings.host; target.port = String(settings.port);
    target.username = WEB_RUNTIME_USER; target.password = password; target.pathname = settings.database;
    const schema = await checkRuntimeSchema({ ...environment, DATABASE_URL: target.toString() });
    if (schema.status !== 'validated') throw unavailable();
    return { status: 'validated' as const, tables: schema.tables, identity: 'dedicated_web', privileges: 'table_only' };
  } catch { throw unavailable(); }
  finally {
    for (const connection of [restricted, operator]) {
      if (connection) await connection.end().catch(() => connection.destroy());
    }
  }
}
