import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), submit: vi.fn(), get: vi.fn(), list: vi.fn(), cancel: vi.fn(), status: vi.fn() }));
vi.mock('../api/services/pilotAuth', () => ({ authenticatePilotUser: mocks.auth,
  PilotAuthError: class extends Error { constructor(public code: string) { super(code); } } }));
vi.mock('../api/services/omegaTaskStore', async importOriginal => ({
  ...(await importOriginal<typeof import('../api/services/omegaTaskStore')>()),
  omegaTaskStore: mocks,
}));
import { omegaTasks as app } from '../api/omega-tasks';
import { omegaSubmission, omegaOwner, canonicalJson } from '../api/services/omegaTaskContract';
import { OmegaTaskError } from '../api/services/omegaTaskStore';
import { PilotAuthError } from '../api/services/pilotAuth';
const id = 'da9c1eb2-62f6-45fb-b7f9-a989521270ae';
const input = { handler: 'travel.budget', payload: { currency: 'ZAR', amounts: ['100.25', '40'] }, idempotencyKey: 'fixture-once' };
const post = (path: string, body: unknown) => app.request(path, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue(7); vi.stubEnv('LUQI_OMEGA_WEB_ENABLED', 'true'); });
afterEach(() => vi.unstubAllEnvs());

describe('authenticated Omega queue boundary', () => {
  it('authenticates every route before storage or disclosing configuration', async () => {
    mocks.auth.mockRejectedValue(new PilotAuthError('AUTH_REQUIRED'));
    for (const [path, method] of [['/status', 'GET'], ['/', 'GET'], ['/', 'POST'], [`/${id}`, 'GET'],
      [`/${id}/cancel`, 'POST'], [`/${id}/run`, 'POST']] as const) {
      const response = await app.request(path, { method });
      expect(response.status).toBe(401);
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    }
    for (const operation of [mocks.get, mocks.submit, mocks.list, mocks.cancel, mocks.status]) expect(operation).not.toHaveBeenCalled();
  });
  it('fails closed on auth storage failure and sanitizes its message', async () => {
    mocks.auth.mockRejectedValue(new PilotAuthError('AUTH_UNAVAILABLE'));
    const response = await app.request('/status');
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'AUTH_UNAVAILABLE' });
  });
  it('defaults to disabled and does not pretend a worker is live', async () => {
    vi.stubEnv('LUQI_OMEGA_WEB_ENABLED', '');
    expect(await (await app.request('/status')).json()).toEqual({ intake: 'disabled', execution: 'disabled', workerVerified: false, handlers: [] });
    expect((await post('/', input)).status).toBe(503);
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.status).not.toHaveBeenCalled();
  });
  it('derives the owner only from the verified account and reports replay as existing', async () => {
    mocks.submit.mockResolvedValueOnce({ task: { id, state: 'pending' }, created: true })
      .mockResolvedValueOnce({ task: { id, state: 'pending' }, created: false });
    expect((await post('/', input)).status).toBe(201);
    expect((await post('/', input)).status).toBe(200);
    expect(mocks.submit).toHaveBeenCalledWith(7, input);
    expect(omegaOwner(7)).toBe('luqi-user:7');
    expect(() => omegaOwner(0)).toThrow();
    expect(() => omegaOwner(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
  it('rejects forged owners, handlers, policy fields and malformed input', async () => {
    for (const bad of [{ ...input, owner: 'bob' }, { ...input, userId: 8 }, { ...input, max_attempts: 100 },
      { ...input, side_effects: false }, { ...input, handler: 'shell.exec' },
      { ...input, payload: { ...input.payload, owner_id: 'bob' } }, { ...input, idempotencyKey: '' }]) {
      expect((await post('/', bad)).status).toBe(400);
    }
    expect((await app.request('/', { method: 'POST', body: '{broken' })).status).toBe(400);
    expect((await post('/?owner=8', input)).status).toBe(400);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('bounds requests even without a Content-Length header', async () => {
    const response = await app.request('/', { method: 'POST', body: JSON.stringify({ payload: 'x'.repeat(17000) }) });
    expect(response.status).toBe(413);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it('passes bounded owner-only pagination and rejects unrecognized filters', async () => {
    mocks.list.mockResolvedValue([]);
    expect((await app.request(`/?limit=5&before=${id}`)).status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(7, 5, id);
    for (const query of ['?owner=8', '?limit=101', '?limit=0', '?before=invalid']) expect((await app.request(`/${query}`)).status).toBe(400);
  });
  it('requires explicit cancellation confirmation and does not expose execution controls', async () => {
    for (const body of [{}, { confirm: false }, { confirm: true, actor: 'bob' }]) expect((await post(`/${id}/cancel`, body)).status).toBe(400);
    mocks.cancel.mockResolvedValue({ id, state: 'cancelled' });
    expect((await post(`/${id}/cancel`, { confirm: true })).status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith(7, id);
    for (const action of ['run', 'approve', 'recover', 'delete']) expect((await post(`/${id}/${action}`, {})).status).toBe(404);
  });
  it.each([['OMEGA_TASK_NOT_FOUND', 404], ['OMEGA_TASK_CONFLICT', 409], ['OMEGA_TASK_LIMIT', 429], ['AUTH_REQUIRED', 401]] as const)
    ('maps %s without leaking task content', async (code, status) => {
      mocks.submit.mockRejectedValue(new OmegaTaskError(code));
      const response = await post('/', input);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ code });
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
  it('never reports storage failure as a successful task outcome', async () => {
    mocks.submit.mockRejectedValue(new Error('mysql://private-password@host'));
    const response = await post('/', input);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ code: 'OMEGA_STORAGE_UNAVAILABLE' });
  });
});

const cases = JSON.parse(readFileSync('tests/fixtures/omega-web-contracts.json', 'utf8'));
it.each(cases)('shared adapter input contract: $name', (item: any) => {
  expect(omegaSubmission.safeParse({ handler: item.handler, payload: item.payload, idempotencyKey: 'fixture-once' }).success).toBe(item.valid);
});
it('compares idempotency payloads independent of object ordering', () => {
  expect(canonicalJson({ a: 1, b: { y: 2, x: true } })).toBe(canonicalJson({ b: { x: true, y: 2 }, a: 1 }));
  expect(canonicalJson({ a: true })).not.toBe(canonicalJson({ a: 1 }));
});
