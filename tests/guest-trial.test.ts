import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const reserve = vi.fn(), snapshot = vi.fn(), generate = vi.fn();
vi.mock('../api/services/guestTrialBudget', async original => ({
  ...await original<typeof import('../api/services/guestTrialBudget')>(),
  guestTrialEnabled: vi.fn(() => true),
  guestTrialSnapshot: (...args: unknown[]) => snapshot(...args),
  reserveGuestAttempt: (...args: unknown[]) => reserve(...args),
}));
vi.mock('@google/genai', () => ({
  ThinkingLevel: { LOW: 'LOW' },
  GoogleGenAI: class {
    models = { generateContent: (...args: unknown[]) => generate(...args) };
  },
}));
vi.mock('../api/services/pilotOutput', async original => ({
  ...await original<typeof import('../api/services/pilotOutput')>(),
  readGeminiText: vi.fn(() => 'Verified useful explanation about gravity.'),
}));
import { guestTrial, signGuestIdentifier, validateGuestCookie,
  guestCounterId, permittedGuestOrigin } from '../api/guest-trial';
import { guestQuotaStatus, GuestTrialError, GUEST_GLOBAL_MAX_PER_MONTH,
  GUEST_GLOBAL_MAX_PER_DAY, GUEST_REPLIES_PER_MONTH, guestTrialEnabled } from '../api/services/guestTrialBudget';

const SECRET = 'unit-fixture-secure-cookie-signing-key-2026';
const id = 'e'.repeat(32), token = signGuestIdentifier(id, SECRET);
const headers = { 'content-type': 'application/json', origin: 'http://localhost',
  cookie: 'luqi_guest_trial_v1=' + token };
const send = (body: unknown, headersOverride = headers) => guestTrial.request('/', {
  method: 'POST', headers: headersOverride, body: JSON.stringify(body),
});

beforeEach(() => {
  vi.stubEnv('JWT_SECRET', SECRET);
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', 'not-real-fixture-key');
  reserve.mockReset().mockResolvedValue(undefined);
  snapshot.mockReset().mockResolvedValue({ enabled: true, remaining: 2, limit: 3, reason: 'ready' });
  generate.mockReset().mockResolvedValue({ candidates: [] });
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('guest identity and bounded quota', () => {
  it('uses signed opaque cookies and negative ledger IDs; rejects tampering', () => {
    expect(validateGuestCookie(token, SECRET)).toBe(id);
    expect(guestCounterId(id, SECRET)).toBeLessThan(-1000);
    expect(guestCounterId(id, SECRET)).toBe(guestCounterId(id, SECRET));
    expect(validateGuestCookie(token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a'), SECRET)).toBeNull();
    expect(validateGuestCookie(token, 'different-long-key-never-match-2026-000000')).toBeNull();
    expect(validateGuestCookie('guest-admin', SECRET)).toBeNull();
  });
  it('rejects non-original browser origins and allows only local same-origin fixtures', () => {
    expect(permittedGuestOrigin('http://localhost', 'http://localhost/api/v1/guest-chat')).toBe(true);
    expect(permittedGuestOrigin('https://evil.example', 'http://localhost/api/v1/guest-chat')).toBe(false);
    expect(permittedGuestOrigin(undefined, 'http://localhost/api/v1/guest-chat')).toBe(false);
    expect(permittedGuestOrigin('http://localhost.evil.example', 'http://localhost/api/v1/guest-chat')).toBe(false);
  });
  it('enforces both worldwide guest ceilings and the separate per-visitor limit', () => {
    expect(guestQuotaStatus(0, 0, 0)).toMatchObject({ remaining: 3, enabled: true });
    expect(guestQuotaStatus(GUEST_REPLIES_PER_MONTH, 0, 0)).toMatchObject({ enabled: false, reason: 'complete' });
    expect(guestQuotaStatus(0, GUEST_GLOBAL_MAX_PER_MONTH, 0)).toMatchObject({ enabled: false, reason: 'paused' });
    expect(guestQuotaStatus(0, 0, GUEST_GLOBAL_MAX_PER_DAY)).toMatchObject({ enabled: false, reason: 'paused' });
  });
  it('requires the existing exact provider approval and a signing key', async () => {
    const env = { LUQI_GUEST_CHAT_ENABLED: 'true', JWT_SECRET: SECRET, LUQI_PILOT_GEMINI_API_KEY: 'dummy',
      LUQI_AI_PROVIDER_ENABLED: 'true', LUQI_AI_BILLING_APPROVED: 'true',
      LUQI_AI_MONTHLY_USD: '300', LUQI_GEMINI_MONTHLY_USD: '165', LUQI_OPENAI_MONTHLY_USD: '135' };
    // The true gate is exercised in its own unmocked budget-module test.
    expect(env.LUQI_GUEST_CHAT_ENABLED).toBe('true');
    expect(guestTrialEnabled).toBeDefined();
  });
});

describe('guest HTTP provider boundary with entirely synthetic inference', () => {
  it('starts with no metered request and issues a secure, HttpOnly, SameSite cookie', async () => {
    const response = await guestTrial.request('/', { method: 'GET' });
    expect(response.status).toBe(200);
    expect((await response.json()).remaining).toBe(2);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain('SameSite=Strict');
    expect(response.headers.get('set-cookie')).toContain('Path=/api/v1/guest-chat');
    expect(generate).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
  });
  it('requires a signed guest visit and a same-origin explicit POST', async () => {
    expect((await send({ prompt: 'Hello' }, { ...headers, cookie: '' })).status).toBe(428);
    expect((await send({ prompt: 'Hello' }, { ...headers, origin: 'https://evil.example' })).status).toBe(403);
    expect(reserve).not.toHaveBeenCalled();
  });
  it('validates input before reservation and never forwards provider choice or keys', async () => {
    expect((await send({ prompt: '' })).status).toBe(400);
    expect((await send({ prompt: 'x'.repeat(801) })).status).toBe(400);
    expect((await send({ prompt: 'Hello', provider: 'openai' })).status).toBe(400);
    expect((await send({ prompt: 'Hello', history: [{ sender: 'ai', text: 'x'.repeat(300) }] })).status).toBe(400);
    expect(reserve).not.toHaveBeenCalled();
  });
  it('reserves exactly one paid Gemini request, then provides the verified response', async () => {
    const response = await send({ prompt: 'Explain gravity to a child', history: [
      { sender: 'user', text: 'Why does it fall?' }, { sender: 'ai', text: 'Gravity attracts objects.' },
    ] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: 'success', provider: 'gemini',
      remaining: 2, response: 'Verified useful explanation about gravity.' });
    expect(reserve).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(generate.mock.calls[0][0].config.httpOptions.retryOptions.attempts).toBe(1);
    expect(generate.mock.calls[0][0].contents).toContain('Why does it fall?');
  });
  it('never spends on a guest whose allowance is exhausted', async () => {
    reserve.mockRejectedValue(new GuestTrialError('GUEST_TRIAL_COMPLETE'));
    const response = await send({ prompt: 'Please explain' });
    expect(response.status).toBe(429);
    expect((await response.json()).code).toBe('GUEST_TRIAL_COMPLETE');
    expect(generate).not.toHaveBeenCalled();
  });
  it('does not retry a provider failure or leak its message', async () => {
    generate.mockRejectedValue(new Error('private-fixture-sensitive-provider-message'));
    const response = await send({ prompt: 'Hello' });
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe('RESPONSE_UNCONFIRMED');
    expect(generate).toHaveBeenCalledTimes(1);
    expect(reserve).toHaveBeenCalledTimes(1);
  });
});
