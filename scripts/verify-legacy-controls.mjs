// Denial-only probes: no authenticated writes, approval, payment or AI calls.
const base = process.argv[2] || 'http://127.0.0.1:8765';
for (const [path, code, method] of [
  ['/api/v1/billing/balance', 'LEGACY_PAYMENTS_DISABLED', 'GET'],
  ['/v1/billing/topup', 'LEGACY_PAYMENTS_DISABLED', 'POST'],
  ['/api/v1/billing/stripe-webhook', 'LEGACY_PAYMENTS_DISABLED', 'POST'],
  ['/admin/billing-ledger', 'LEGACY_PAYMENTS_DISABLED', 'GET'],
  ['/api/v1/zta/status', 'LEGACY_APPROVALS_UNAVAILABLE', 'GET'],
  ['/v1/zta/step-up/challenge', 'LEGACY_APPROVALS_UNAVAILABLE', 'POST'],
  ['/api/v1/zta/approvals/denial-probe/resolve', 'LEGACY_APPROVALS_UNAVAILABLE', 'POST'],
  ['/api/v1/jobs/denial-probe', 'LEGACY_JOBS_UNAVAILABLE', 'GET'],
  ['/api/ussd', 'USSD_INTEGRATION_UNAVAILABLE', 'GET'],
]) {
  const response = await fetch(base + path, { method, redirect: 'error', signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (response.status !== 503 || response.headers.get('cache-control') !== 'no-store' || data.code !== code) throw new Error('Legacy boundary failed: ' + path);
  console.log(path + ': 503/no-store, ' + code);
}
const response = await fetch(base + '/api/v1/companion/conversations/1/export', { redirect: 'error', signal: AbortSignal.timeout(15000) });
if (response.status !== 401 || response.headers.get('cache-control') !== 'no-store' || (await response.json()).code !== 'AUTH_REQUIRED') throw new Error('Private export must require authentication');
console.log('Private export: 401/no-store');
