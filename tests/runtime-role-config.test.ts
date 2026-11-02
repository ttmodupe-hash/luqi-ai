import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('mysql2/promise', () => ({ default: { createConnection: vi.fn(),
  escapeId: vi.fn((name: string) => '`' + name + '`') } }));
import mysql from 'mysql2/promise';
import { prepareRuntimeRole } from '../db/runtimeRole';
afterEach(() => vi.clearAllMocks());
const environment = { DATABASE_URL: 'mysql://operator:old-secret@mysql.railway.internal:3306/railway',
  LUQI_RUNTIME_DB_PASSWORD: 'a'.repeat(64) };
describe('private role provisioning configuration', () => {
  it('allows only a read-only check of separately prepared Omega grants', async () => {
    const omega = { ...environment, LUQI_OMEGA_WEB_ENABLED: 'true' };
    vi.mocked(mysql.createConnection).mockRejectedValueOnce(new Error('private-database-detail'));
    await expect(prepareRuntimeRole(omega, false)).rejects.toThrow('MYSQL_RUNTIME_ROLE_UNAVAILABLE');
    expect(mysql.createConnection).toHaveBeenCalledTimes(1);
    vi.mocked(mysql.createConnection).mockClear();
    await expect(prepareRuntimeRole(omega, true)).rejects.toThrow('MYSQL_RUNTIME_ROLE_UNAVAILABLE');
    expect(mysql.createConnection).not.toHaveBeenCalled();
  });

  it.each([{}, { ...environment, LUQI_RUNTIME_DB_PASSWORD: '' },
    { ...environment, LUQI_RUNTIME_DB_PASSWORD: 'secret-with-quote-\'' },
    { ...environment, DATABASE_URL: 'mysql://operator:old-secret@public.example:3306/railway' },
    { ...environment, DATABASE_URL: 'mysql://operator:old-secret@mysql.railway.internal:3306/db-with-dash' },
    { ...environment, DATABASE_URL: 'mysql://luqi_web_runtime:old-secret@mysql.railway.internal:3306/railway' },
    { ...environment, DATABASE_URL: `mysql://operator:${'a'.repeat(64)}@mysql.railway.internal:3306/railway` },
    { ...environment, LUQI_OMEGA_WEB_ENABLED: 'true' },
    { ...environment, LUQI_PROJECT_VAULT_ENABLED: 'true' },
    { ...environment, DATABASE_URL: 'mysql://operator:old-secret@127.0.0.1:3306/luqi_ci' },
  ])('refuses unsafe configuration before opening any SQL connection: %j', async env => {
    await expect(prepareRuntimeRole(env, true)).rejects.toThrow('MYSQL_RUNTIME_ROLE_UNAVAILABLE');
    expect(mysql.createConnection).not.toHaveBeenCalled();
  });
});
