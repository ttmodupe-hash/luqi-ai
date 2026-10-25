/** Private operator diagnostic. No password input, authentication attempt or write. */
import { createInterface } from 'node:readline/promises';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

export const ACCOUNT_CONTEXT = Object.freeze({
  RAILWAY_PROJECT_ID: '9f627cb8-3136-4b30-89d2-32ca648a1e5f',
  RAILWAY_ENVIRONMENT_ID: '1e192ef3-1fa6-4684-81fc-60165c7b0e22',
  RAILWAY_SERVICE_ID: 'a9b293e0-1966-43be-80ef-3dd27acc6ab7',
  NODE_ENV: 'production',
});
// This is the public synthetic non-account sentinel used by the login handler,
// NOT a real account hash. Real password hashes never leave MySQL in this check.
export const NON_ACCOUNT_SENTINEL = '$2b$12$zfjKKga9OGRJtq.1Nn.2BuUuc8UEQsjAq6/dT/IJt7RQzAsPp5yGO';
export const BCRYPT_SHAPE = '^[$]2[aby][$][0-9]{2}[$][./A-Za-z0-9]{53}$';
export const ACCOUNT_QUERY = `SELECT id, is_active AS active,
  CASE WHEN OCTET_LENGTH(password_hash) = 60
    AND REGEXP_LIKE(password_hash, ?, 'c')
    AND CAST(password_hash AS BINARY) <> CAST(? AS BINARY)
    THEN 1 ELSE 0 END AS credential_format_supported
  FROM users WHERE email = ? LIMIT 2`;

export function assertAccountContext(environment) {
  if (Object.entries(ACCOUNT_CONTEXT).some(([key, value]) => environment[key] !== value)) {
    throw new Error('ACCOUNT_CONTEXT_REFUSED');
  }
}

// Node resolves a symlinked process.cwd() to the physical Docker working
// directory: /app -> /srv/luqi. Testing only /app made valid checks impossible.
export function assertOperatorAppRoot(cwd) {
  if (cwd !== '/srv/luqi') throw new Error('ACCOUNT_APP_DIRECTORY_REQUIRED');
}

export function normalizeAccountEmail(value) {
  if (typeof value !== 'string') throw new Error('ACCOUNT_INPUT_REFUSED');
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('ACCOUNT_INPUT_REFUSED');
  }
  return normalized;
}

export function classifyAccountRows(rows) {
  if (!Array.isArray(rows) || rows.length > 2) throw new Error('ACCOUNT_RESULT_UNVERIFIED');
  if (rows.length === 0) return { code: 'ACCOUNT_NOT_FOUND' };
  if (rows.length === 2) return { code: 'ACCOUNT_MATCH_AMBIGUOUS' };
  const row = rows[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('ACCOUNT_RESULT_UNVERIFIED');
  if (typeof row.id !== 'number' || !Number.isSafeInteger(row.id) || row.id <= 0 ||
      ![true, false, 1, 0, null].includes(row.active) ||
      ![true, false, 1, 0].includes(row.credential_format_supported)) {
    throw new Error('ACCOUNT_RESULT_UNVERIFIED');
  }
  const code = row.active !== true && row.active !== 1 ? 'ACCOUNT_INACTIVE'
    : row.credential_format_supported !== true && row.credential_format_supported !== 1
      ? 'ACCOUNT_CREDENTIAL_FORMAT_UNSUPPORTED' : 'ACCOUNT_ACTIVE_FORMAT_SUPPORTED';
  // Whitelist the output: never return arbitrary row fields or query diagnostics.
  return { code, accountId: row.id };
}

export async function inspectAccount(connection, email) {
  const normalized = normalizeAccountEmail(email);
  try {
    const [rows] = await connection.query({ sql: ACCOUNT_QUERY, timeout: 5_000 },
      [BCRYPT_SHAPE, NON_ACCOUNT_SENTINEL, normalized]);
    return classifyAccountRows(rows);
  } catch { throw new Error('ACCOUNT_CHECK_UNAVAILABLE'); }
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY || process.argv.length !== 2) {
    throw new Error('ACCOUNT_TERMINAL_REQUIRED');
  }
  assertAccountContext(process.env);
  assertOperatorAppRoot(process.cwd());
  const { parseMySqlConnectionSettings } = await import('file:///srv/luqi/api/lib/mysqlConfig.ts');
  const configuration = parseMySqlConnectionSettings(process.env);
  if (!configuration || configuration.user !== 'luqi_web_runtime') {
    throw new Error('ACCOUNT_RUNTIME_ROLE_REQUIRED');
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true, historySize: 0 });
  const controller = new AbortController();
  let connection;
  const abort = () => { controller.abort(); connection?.destroy(); rl.close(); };
  rl.on('SIGINT', abort);
  const ask = prompt => rl.question(prompt, { signal: controller.signal });
  try {
    console.log('Read-only account diagnosis in the reviewed LUQI production web service.');
    console.log('Privately verify account ownership first. Do not enter a password. Do not record this terminal.');
    if (await ask('After ownership verification, type CHECK: ') !== 'CHECK') throw new Error('ACCOUNT_CHECK_CANCELLED');
    const email = normalizeAccountEmail(await ask('Verified LUQI account email (private): '));
    if (controller.signal.aborted) throw new Error('ACCOUNT_CHECK_CANCELLED');
    const mysql = createRequire('file:///srv/luqi/package.json')('mysql2/promise');
    connection = await mysql.createConnection({ ...configuration, connectTimeout: 4_000,
      multipleStatements: false, enableKeepAlive: false });
    if (controller.signal.aborted) throw new Error('ACCOUNT_CHECK_CANCELLED');
    const result = await inspectAccount(connection, email);
    if (controller.signal.aborted) throw new Error('ACCOUNT_CHECK_CANCELLED');
    console.log(`Result: ${result.code}`);
    if (result.accountId !== undefined) console.log(`Account ID (private operator use only): ${result.accountId}`);
    console.log('No password was checked or changed. No token was issued and no throttle counter was modified.');
    console.log('A supported stored format does not prove correct credentials, successful sign-in or account recovery.');
  } finally {
    rl.off('SIGINT', abort); rl.close();
    // There is one connection and no transaction. Destroy also bounds cleanup.
    connection?.destroy();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch(() => {
    // Never echo a connection string, email, SQL, password, hash or driver error.
    console.error('Account check stopped. Verify private terminal, approved context, runtime role and confirmed input. No account change was requested.');
    process.exitCode = 1;
  });
}
