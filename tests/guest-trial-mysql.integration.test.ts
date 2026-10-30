/** Disposable MySQL only. Imports no provider SDK; all requests below are ledger reservations. */
import { beforeAll, beforeEach, afterAll, it, expect } from 'vitest';
import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { reserveGuestAttempt, guestTrialSnapshot, guestNetworkId } from '../api/services/guestTrialBudget';
let db: Pool;
const now = new Date('2026-10-30T12:00:00Z');
const network = (n: number, time = now) => guestNetworkId(`192.0.${Math.floor(n / 250)}.${n % 250 + 1}`, process.env.JWT_SECRET!, time);
async function number(sql: string) {
  const [rows] = await db.query<RowDataPacket[]>(sql); return Number(Object.values(rows[0])[0]);
}
beforeAll(async () => {
  if (process.env.LUQI_GUEST_MYSQL_FIXTURE !== 'true' ||
      !process.env.DATABASE_URL?.includes('@127.0.0.1:') ||
      new URL(process.env.DATABASE_URL).pathname !== '/luqi_guest_ci') throw new Error('Disposable guest fixture required');
  Object.assign(process.env, { LUQI_GUEST_CHAT_ENABLED: 'true', JWT_SECRET: 'ci-guest-signing-secret-not-production-2026',
    LUQI_PILOT_GEMINI_API_KEY: 'dummy-no-provider-imported', LUQI_AI_PROVIDER_ENABLED: 'true',
    LUQI_AI_BILLING_APPROVED: 'true', LUQI_AI_MONTHLY_USD: '300', LUQI_GEMINI_MONTHLY_USD: '165',
    LUQI_OPENAI_MONTHLY_USD: '135', LUQI_GUEST_CAPACITY_PROFILE: 'public-1000-v1', LUQI_GUEST_TRUST_RAILWAY_PROXY: 'true' });
  db = mysql.createPool({ uri: process.env.DATABASE_URL, multipleStatements: true });
  await db.query(readFileSync('db/migrations/20261022_ai_pilot_budget.sql', 'utf8'));
});
beforeEach(async () => {
  await db.query('DELETE FROM ai_pilot_daily_user_usage');
  await db.query('DELETE FROM ai_pilot_monthly_spend');
});
afterAll(async () => { await db?.end(); });
it('serializes simultaneous requests for a visitor and persists exactly three charges', async () => {
  const results = await Promise.allSettled(Array.from({ length: 9 }, () => reserveGuestAttempt(-123456, now, network(1))));
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(3);
  expect(await number("SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE provider='gemini'")).toBe(3);
  expect(await guestTrialSnapshot(-123456, now)).toMatchObject({ reason: 'complete' });
});
it('accommodates 1000 visitors with three turns each, then enforces the shared limit', async () => {
  // Fifty attempts per minute, unique visitors/networks; bounded concurrency fits the pool.
  for (let i = 0; i < 3000; i += 6) {
    const batch = Array.from({ length: Math.min(6, 3000 - i) }, (_, j) => {
      const attempt = i + j, visitor = Math.floor(attempt / 3);
      const time = new Date(now.getTime() + Math.floor(attempt / 50) * 60000);
      return reserveGuestAttempt(-10000 - visitor, time, network(visitor, time));
    });
    const results = await Promise.allSettled(batch);
    expect(results.every(r => r.status === 'fulfilled'), JSON.stringify(results)).toBe(true);
  }
  expect(await number("SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE provider='gemini'")).toBe(3000);
  await expect(reserveGuestAttempt(-90000, new Date('2026-10-30T14:00:00Z'), network(2000)))
    .rejects.toMatchObject({ code: 'GUEST_TRIAL_PAUSED' });
}, 240000);
it('rolls back guest usage when registered traffic exhausted the provider budget', async () => {
  await db.query("INSERT INTO ai_pilot_monthly_spend VALUES ('2026-10','gemini',16500,NOW())");
  await expect(reserveGuestAttempt(-123456, now, network(1))).rejects.toMatchObject({ code: 'GUEST_TRIAL_PAUSED' });
  expect(await number('SELECT COUNT(*) FROM ai_pilot_daily_user_usage')).toBe(0);
});
it('retains legacy ten-cent reservations when entering expanded mode', async () => {
  await db.query("INSERT INTO ai_pilot_daily_user_usage (day_utc,user_id,attempts) VALUES ('2026-10-01',-1,50)");
  await reserveGuestAttempt(-123456, now, network(1));
  expect(await number('SELECT attempts FROM ai_pilot_daily_user_usage WHERE user_id=-3')).toBe(501);
});
it('limits cookie farming at sixty global requests per minute without charging denied requests', async () => {
  for (let n = 0; n < 60; n++) await reserveGuestAttempt(-10000 - n, now, network(1));
  await expect(reserveGuestAttempt(-90000, now, network(2))).rejects.toMatchObject({ code: 'GUEST_RATE_LIMITED' });
  expect(await number("SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE provider='gemini'")).toBe(60);
});
it('limits a shared network daily and resets only at UTC day/month boundaries', async () => {
  for (let n = 0; n < 300; n++) {
    const time = new Date(now.getTime() + Math.floor(n / 50) * 60000);
    await reserveGuestAttempt(-10000 - n, time, network(1, time));
  }
  await expect(reserveGuestAttempt(-90000, new Date('2026-10-30T14:00:00Z'), network(1)))
    .rejects.toMatchObject({ code: 'GUEST_RATE_LIMITED', retryAfter: 36000 });
  const next = new Date('2026-11-01T00:00:00Z');
  await reserveGuestAttempt(-10000, next, network(1, next));
  expect((await guestTrialSnapshot(-10000, next)).remaining).toBe(2);
});
it('fails closed on invalid identities and a database failure', async () => {
  await expect(reserveGuestAttempt(-3, now, network(1))).rejects.toMatchObject({ code: 'GUEST_TRIAL_UNAVAILABLE' });
  await db.query('RENAME TABLE ai_pilot_daily_user_usage TO temporarily_unavailable');
  try { await expect(reserveGuestAttempt(-90000, now, network(1))).rejects.toMatchObject({ code: 'GUEST_TRIAL_UNAVAILABLE' }); }
  finally { await db.query('RENAME TABLE temporarily_unavailable TO ai_pilot_daily_user_usage'); }
});

it('maintenance removes only expired negative pseudonyms and preserves account/aggregate records', async () => {
  await db.query("INSERT INTO ai_pilot_daily_user_usage (day_utc,user_id,attempts) VALUES ('2000-01-01',-12345,2),('2000-01-01',12345,2),('2000-01-01',-3,10),('2099-01-01',-54321,1)");
  const { stdout } = await promisify(execFile)(process.execPath, ['operations/guest-maintenance.railway.mjs'],
    { env: { ...process.env, LUQI_GUEST_MAINTENANCE_MODE: 'cleanup' }, timeout: 20000 });
  expect(JSON.parse(stdout.trim())).toMatchObject({ operation: 'guest_cleanup', status: 'success', removed: 1, pending: 0 });
  expect(await number('SELECT COUNT(*) FROM ai_pilot_daily_user_usage')).toBe(3);
  expect(await number('SELECT COUNT(*) FROM ai_pilot_daily_user_usage WHERE user_id=12345')).toBe(1);
  expect(await number('SELECT COUNT(*) FROM ai_pilot_daily_user_usage WHERE user_id=-3')).toBe(1);
});
