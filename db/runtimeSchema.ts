/** Read-only contract for the enabled web runtime, not a migration engine.
 * No row contents, credentials, or raw driver errors enter diagnostics.
 */
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise';
import { parseMySqlConnectionSettings } from '../api/lib/mysqlConfig';

interface TableContract {
  columns: readonly string[];
  unique: readonly (readonly string[])[];
  critical?: Record<string, { type: string; collation?: string }>;
}
const id = { type: 'bigint unsigned' };
export const RUNTIME_TABLES: Readonly<Record<string, TableContract>> = {
  users: {
    columns: ['id', 'email', 'password_hash', 'name', 'avatar_url', 'role', 'is_active',
      'email_verified', 'last_login_at', 'created_at', 'updated_at'],
    unique: [['id'], ['email']], critical: { id },
  },
  companion_conversations: {
    columns: ['id', 'personality_id', 'user_id', 'title', 'status', 'trust_score',
      'last_message_at', 'message_count', 'created_at', 'updated_at'],
    unique: [['id']], critical: { id },
  },
  companion_messages: {
    columns: ['id', 'conversation_id', 'role', 'content', 'metadata', 'tokens_used', 'created_at'],
    unique: [['id']], critical: { id },
  },
  companion_memories: {
    columns: ['id', 'conversation_id', 'user_id', 'memory_type', 'category', 'content',
      'importance', 'created_at'],
    unique: [['id']], critical: { id },
  },
  offline_sync_queue: {
    columns: ['id', 'user_id', 'device_id', 'action', 'payload_json', 'synced', 'synced_at', 'created_at'],
    unique: [['id']], critical: { id },
  },
  auth_attempt_windows: {
    columns: ['scope', 'subject_key', 'attempts', 'reset_at'],
    unique: [['scope', 'subject_key']],
    critical: {
      scope: { type: "enum('login_global','login_subject','signup_global','signup_subject')" },
      subject_key: { type: 'char(64)', collation: 'ascii_bin' },
      attempts: { type: 'int unsigned' }, reset_at: { type: 'bigint unsigned' },
    },
  },
  ai_pilot_monthly_spend: {
    columns: ['month_utc', 'provider', 'reserved_cents', 'updated_at'],
    unique: [['month_utc', 'provider']],
    critical: { month_utc: { type: 'char(7)' }, provider: { type: 'varchar(16)' },
      reserved_cents: { type: 'int unsigned' } },
  },
  ai_pilot_daily_user_usage: {
    columns: ['day_utc', 'user_id', 'attempts', 'updated_at'], unique: [['day_utc', 'user_id']],
    critical: { day_utc: { type: 'char(10)' }, user_id: { type: 'bigint' },
      attempts: { type: 'int unsigned' } },
  },
};
const omega: TableContract = {
  columns: ['id', 'owner_id', 'idempotency_key', 'handler', 'handler_version', 'side_effects',
    'state', 'next_run_at', 'lease_token', 'lease_expires_at', 'document'],
  unique: [['id'], ['owner_id', 'idempotency_key']],
  critical: { id: { type: 'char(36)', collation: 'ascii_bin' },
    owner_id: { type: 'varbinary(512)' }, handler: { type: 'varbinary(512)' },
    handler_version: { type: 'varbinary(128)' }, state: { type: 'varchar(32)', collation: 'ascii_bin' },
    document: { type: 'json' } },
};
const privateVault: TableContract = {
  columns: ['owner_id', 'id', 'kind', 'revision', 'sealed', 'created_at', 'updated_at'],
  unique: [['owner_id', 'id']],
  critical: {
    owner_id: { type: 'bigint unsigned' },
    id: { type: 'char(36)', collation: 'ascii_bin' },
    kind: { type: 'varchar(8)', collation: 'ascii_bin' },
    revision: { type: 'int unsigned' },
    sealed: { type: 'json' },
  },
};
const normalizeType = (type: string) => type.toLowerCase()
  .replace(/\b(tinyint|smallint|mediumint|int|bigint)\(\d+\)/g, '$1');
const unavailable = () => new Error('MYSQL_RUNTIME_SCHEMA_UNAVAILABLE');

async function validate(connection: Connection, contracts: Record<string, TableContract>): Promise<void> {
  const names = Object.keys(contracts);
  const placeholders = names.map(() => '?').join(',');
  const query = async (sql: string) => {
    const [rows] = await connection.query<RowDataPacket[]>({ sql, timeout: 4_000 }, names);
    return rows;
  };
  const tables = await query(`SELECT TABLE_NAME AS table_name, ENGINE AS engine
    FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders})`);
  const columns = await query(`SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name,
    COLUMN_TYPE AS column_type, IS_NULLABLE AS is_nullable, COLLATION_NAME AS collation_name
    FROM information_schema.columns WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (${placeholders})`);
  const indexes = await query(`SELECT TABLE_NAME AS table_name, INDEX_NAME AS index_name,
    COLUMN_NAME AS column_name, SEQ_IN_INDEX AS position, SUB_PART AS prefix_length
    FROM information_schema.statistics WHERE TABLE_SCHEMA=DATABASE() AND NON_UNIQUE=0
    AND TABLE_NAME IN (${placeholders}) ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`);

  for (const [table, contract] of Object.entries(contracts)) {
    if (tables.find(row => row.table_name === table)?.engine?.toLowerCase() !== 'innodb') throw unavailable();
    const fields = columns.filter(row => row.table_name === table);
    if (contract.columns.some(name => !fields.some(row => row.column_name === name))) throw unavailable();
    for (const [name, expected] of Object.entries(contract.critical ?? {})) {
      const field = fields.find(row => row.column_name === name);
      if (!field || field.is_nullable !== 'NO' || normalizeType(field.column_type) !== expected.type ||
          (expected.collation && field.collation_name !== expected.collation)) throw unavailable();
    }
    const keys = new Map<string, RowDataPacket[]>();
    for (const row of indexes.filter(row => row.table_name === table)) {
      const key = keys.get(row.index_name) ?? [];
      key.push(row); keys.set(row.index_name, key);
    }
    for (const required of contract.unique) {
      const matches = [...keys.values()].some(key => key.length === required.length &&
        key.every((part, i) => part.column_name === required[i] && part.prefix_length == null));
      if (!matches) throw unavailable();
    }
    // Fixed identifiers from this module only. LIMIT 0 verifies SELECT access
    // and the actual column resolution without reading private records.
    await connection.query({ sql: `SELECT ${contract.columns.map(name => `\`${name}\``).join(',')}
      FROM \`${table}\` LIMIT 0`, timeout: 4_000 });
  }
}

export async function checkRuntimeSchema(environment: Record<string, string | undefined> = process.env):
Promise<{ status: 'validated' | 'unconfigured'; tables: number }> {
  let connection: Connection | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    const settings = parseMySqlConnectionSettings(environment);
    if (!settings) return { status: 'unconfigured', tables: 0 };
    const contracts = { ...RUNTIME_TABLES,
      ...(environment.LUQI_OMEGA_WEB_ENABLED === 'true' ? { omega_tasks_v1: omega } : {}),
      ...(environment.LUQI_PROJECT_VAULT_ENABLED === 'true' ? { luqi_project_vault_v1: privateVault } : {}) };
    connection = await mysql.createConnection({ ...settings, connectTimeout: 4_000 });
    const activeConnection = connection;
    await Promise.race([
      validate(activeConnection, contracts),
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => { activeConnection.destroy(); reject(unavailable()); }, 8_000);
      }),
    ]);
    return { status: 'validated', tables: Object.keys(contracts).length };
  } catch {
    throw unavailable();
  } finally {
    if (deadline) clearTimeout(deadline);
    connection?.destroy();
  }
}
