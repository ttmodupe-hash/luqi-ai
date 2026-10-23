import { describe, expect, it } from 'vitest';
import { checkRuntimeSchema } from '../db/runtimeSchema';
import { bootstrapDatabase } from '../db/bootstrap';

describe('database preflight failure boundaries', () => {
  it('allows a database-free preview without claiming schema validation', async () => {
    expect(await checkRuntimeSchema({})).toEqual({ status: 'unconfigured', tables: 0 });
  });
  it.each([
    { DATABASE_URL: 'postgresql://fixture:must-not-leak@127.0.0.1:1/fixture' },
    { DATABASE_URL: 'mysql://fixture:must-not-leak@/fixture' },
    { DB_HOST: '127.0.0.1', DB_USER: 'fixture' },
  ])('redacts configured failures instead of falling back to preview', async environment => {
    await expect(checkRuntimeSchema(environment)).rejects.toThrow(/^MYSQL_RUNTIME_SCHEMA_UNAVAILABLE$/);
  });
  it('never reports explicit schema apply success without configuration, including outside production', async () => {
    await expect(bootstrapDatabase({ NODE_ENV: 'test' })).rejects.toThrow(/^MYSQL_SCHEMA_APPLY_FAILED$/);
  });
});
