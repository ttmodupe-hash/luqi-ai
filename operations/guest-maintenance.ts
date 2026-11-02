/** Private Railway cron/script. No listener, public domain or credentials in logs.
 * Provider calls only in explicit canary mode, through the same durable guest route.
 */
import { Hono } from 'hono';
import mysql, { type RowDataPacket } from 'mysql2/promise';
import { guestTrial, signGuestIdentifier } from '../api/guest-trial';
import { guestNetworkId } from '../api/services/guestTrialBudget';
import { readApprovedPilotCaps } from '../api/services/aiPilotBudget';

let stage = 'configuration';
const mode = process.env.LUQI_GUEST_MAINTENANCE_MODE;
const guestId = '36103020261000000000000000000001';
async function run() {
  if (!process.env.DATABASE_URL || !mode) { console.log(JSON.stringify({ operation: 'guest_maintenance', status: 'configuration_pending' })); return; }
  if (!['cleanup', 'canary', 'check'].includes(mode)) throw new Error('Invalid mode');
  const url = new URL(process.env.DATABASE_URL);
  if (url.protocol !== 'mysql:' || !url.pathname.slice(1)) throw new Error('Dedicated MySQL required');
  stage = 'database_connect';
  const db = await mysql.createConnection({ uri: url.toString(), connectTimeout: 5000 });
  try {
    const now = new Date(), month = now.toISOString().slice(0, 7);
    const [spend] = await db.execute<RowDataPacket[]>('SELECT provider,reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=?', [month]);
    const [guest] = await db.execute<RowDataPacket[]>('SELECT user_id,attempts FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id IN (-1,-3)', [month + '-01']);
    const snapshot = () => ({ month, providerReservedCents: Object.fromEntries(spend.map(r => [r.provider, Number(r.reserved_cents)])),
      guestAttempts: Number(guest.find(r => Number(r.user_id) === -1)?.attempts ?? 0),
      guestReservedCents: Number(guest.find(r => Number(r.user_id) === -3)?.attempts ?? 0) });
    if (mode === 'cleanup') {
      const cutoff = new Date(now.getTime() - 62 * 86400000).toISOString().slice(0, 10);
      let removed = 0;
      for (let batch = 0; batch < 20; batch++) {
        const [result] = await db.execute<mysql.ResultSetHeader>('DELETE FROM ai_pilot_daily_user_usage WHERE day_utc < ? AND user_id < -1000 LIMIT 500', [cutoff]);
        removed += result.affectedRows; if (result.affectedRows < 500) break;
      }
      const [left] = await db.execute<RowDataPacket[]>('SELECT COUNT(*) AS pending FROM ai_pilot_daily_user_usage WHERE day_utc < ? AND user_id < -1000', [cutoff]);
      console.log(JSON.stringify({ operation: 'guest_cleanup', status: Number(left[0].pending) ? 'backlog' : 'success', cutoff, removed,
        pending: Number(left[0].pending), ...snapshot() }));
      if (Number(left[0].pending)) process.exitCode = 2;
      return;
    }
    stage = 'budget_profile';
    const caps = readApprovedPilotCaps();
    if (caps.gemini !== 16500 || caps.openai !== 13500) throw new Error('Expected approved profile');
    console.log(JSON.stringify({ operation: 'guest_preflight', status: 'success', approvedCapsCents: caps, ...snapshot() }));
    if (mode !== 'canary') {
      const ids = ['192.0.2.201', '198.51.100.201'].map(ip => guestNetworkId(ip, process.env.JWT_SECRET!, now));
      const [spoof] = await db.execute<RowDataPacket[]>('SELECT COALESCE(SUM(attempts),0) AS attempts FROM ai_pilot_daily_user_usage WHERE day_utc=? AND user_id IN (?,?)', [now.toISOString().slice(0, 10), ...ids]);
      console.log(JSON.stringify({ operation: 'guest_proxy_check', clientSuppliedIpAttempts: Number(spoof[0].attempts), expected: 0 }));
      return;
    }
    if (process.env.LUQI_GUEST_CAPACITY_PROFILE !== 'public-1000-v1' || process.env.LUQI_GUEST_TRUST_RAILWAY_PROXY !== 'true')
      throw new Error('Expanded canary configuration required');
    const before = Number(spend.find(r => r.provider === 'gemini')?.reserved_cents ?? 0);
    stage = 'fetch_instrumentation';
    const originalFetch = globalThis.fetch;
    let usage: { input: number; output: number; thinking: number } | undefined;
    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      const target = String(args[0] instanceof Request ? args[0].url : args[0]);
      if (target.startsWith('https://generativelanguage.googleapis.com/') && target.includes(':generateContent') && response.ok) {
        const data = await response.clone().json() as { usageMetadata?: Record<string, unknown> };
        const m = data.usageMetadata;
        if (m) usage = { input: Number(m.promptTokenCount ?? 0), output: Number(m.candidatesTokenCount ?? 0), thinking: Number(m.thoughtsTokenCount ?? 0) };
      }
      return response;
    };
    let status: number, answer: Record<string, unknown>;
    try {
      stage = 'guest_route';
      const probe = new Hono();
      probe.route('/api/v1/guest-chat', guestTrial);
      const response = await probe.request('https://app.luqi-ai.com/api/v1/guest-chat', { method: 'POST',
        headers: { Origin: 'https://app.luqi-ai.com', 'Content-Type': 'application/json',
          Cookie: 'luqi_guest_trial_v1=' + signGuestIdentifier(guestId, process.env.JWT_SECRET!), 'x-real-ip': '192.0.2.61' },
        body: JSON.stringify({ prompt: 'Explain how Luqi helps a small South African business in two short sentences. Include the exact code LUQI361CANARY.' }) });
      status = response.status;
      console.log(JSON.stringify({ operation: 'guest_route_response', httpStatus: status, json: (response.headers.get('content-type') ?? '').includes('application/json') }));
      stage = 'response_json'; answer = await response.json() as Record<string, unknown>;
    } finally { globalThis.fetch = originalFetch; }
    stage = 'ledger_after';
    const [afterRows] = await db.execute<RowDataPacket[]>("SELECT reserved_cents FROM ai_pilot_monthly_spend WHERE month_utc=? AND provider='gemini'", [month]);
    const verified = status === 200 && answer.status === 'success' && answer.provider === 'gemini' &&
      String(answer.response ?? '').includes('LUQI361CANARY');
    const validUsage = usage && Object.values(usage).every(n => Number.isSafeInteger(n) && n >= 0) &&
      usage.input > 0 && usage.input <= 4096 && usage.output > 0 && usage.output + usage.thinking <= 512;
    const costUsd = validUsage ? (usage!.input * 0.75 + (usage!.output + usage!.thinking) * 3.75) / 1e6 : null;
    const ledgerDelta = Number(afterRows[0]?.reserved_cents) - before;
    console.log(JSON.stringify({ operation: 'guest_canary', status: verified && validUsage && ledgerDelta >= 1 ? 'success' : 'unverified',
      httpStatus: status, challengeVerified: verified, remaining: answer.remaining, code: answer.code,
      usage: validUsage ? usage : null, estimatedCurrentRateUsd: costUsd, reservationDeltaCents: ledgerDelta,
      billingEvidence: 'token_usage_estimate_not_provider_invoice' }));
    if (!verified || !validUsage || ledgerDelta < 1) throw new Error('Canary acceptance incomplete');
  } finally { await db.end(); }
}
try { await run(); } catch { console.log(JSON.stringify({ operation: 'guest_maintenance', status: 'failed_redacted', stage })); process.exitCode = 1; }
// The imported application quota pool may keep sockets open in Bun. End this private script explicitly.
process.exit(process.exitCode ?? 0);
