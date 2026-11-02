import { describe, expect, it, vi } from 'vitest';
const provider = vi.hoisted(() => vi.fn());
vi.mock('../api/services/ussdAndBillingService', () => ({ ussdAndBillingService: { handleUssdRequest: provider } }));
import { restCompat } from '../api/rest-compat';

describe('retired legacy control namespaces', () => {
  it.each(['/api/v1', '/v1'])('rejects fake approvals, credit grants, job polls and future aliases under %s', async prefix => {
    const paths = [
      ['billing', 'LEGACY_PAYMENTS_DISABLED'], ['billing/balance', 'LEGACY_PAYMENTS_DISABLED'],
      ['billing/topup', 'LEGACY_PAYMENTS_DISABLED'], ['billing/payfast/webhook', 'LEGACY_PAYMENTS_DISABLED'],
      ['billing/payfast-itn', 'LEGACY_PAYMENTS_DISABLED'], ['billing/stripe-webhook', 'LEGACY_PAYMENTS_DISABLED'],
      ['billing/stripe/webhook', 'LEGACY_PAYMENTS_DISABLED'], ['billing/initiate-30-auth', 'LEGACY_PAYMENTS_DISABLED'],
      ['zta/status', 'LEGACY_APPROVALS_UNAVAILABLE'], ['zta/approvals', 'LEGACY_APPROVALS_UNAVAILABLE'],
      ['zta/approvals/hitl_pf_901/resolve', 'LEGACY_APPROVALS_UNAVAILABLE'],
      ['zta/step-up/challenge', 'LEGACY_APPROVALS_UNAVAILABLE'], ['zta/step-up/verify', 'LEGACY_APPROVALS_UNAVAILABLE'],
      ['zta/langgraph/execute', 'LEGACY_APPROVALS_UNAVAILABLE'], ['zta/sanitize-test', 'LEGACY_APPROVALS_UNAVAILABLE'],
      ['zta/future-operation', 'LEGACY_APPROVALS_UNAVAILABLE'], ['jobs/submit', 'LEGACY_JOBS_UNAVAILABLE'],
      ['jobs/another-account-task', 'LEGACY_JOBS_UNAVAILABLE'],
    ];
    for (const [path, code] of paths) for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await restCompat.request(`${prefix}/${path}?user_email=other@example.invalid`, {
        method, headers: { Authorization: 'Bearer arbitrary', 'x-luqi-admin-key': 'unverified', 'Content-Type': 'application/json' },
        ...(method === 'GET' ? {} : { body: JSON.stringify({ reviewer: 'Administrator', decision: 'APPROVE', step_up_token: 'anything', credits: 100000, amount_gross: 5000 }) }),
      });
      expect(response.status, path).toBe(503);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
      expect(await response.json()).toMatchObject({ code });
    }
  });
  it('rejects billing ledgers and USSD before provider/session access, including malformed bodies', async () => {
    for (const path of ['/api/v1/admin/billing-ledger', '/admin/billing-ledger', '/api/v1/finops-dashboard', '/api/ussd']) {
      for (const method of ['GET', 'POST']) {
        const result = await restCompat.request(path + '?sessionId=foreign&phoneNumber=forged&text=1*2*3', {
          method, ...(method === 'POST' ? { body: '{broken' } : {}),
        });
        expect(result.status).toBe(503);
        expect(result.headers.get('Cache-Control')).toBe('no-store');
      }
    }
    expect(provider).not.toHaveBeenCalled();
  });
});
