import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../api/services/aiPilotGateway', () => ({ runBudgetedPilotChat: vi.fn() }));
vi.mock('../api/services/aiPilotBudget', async original => ({ ...await original<typeof import('../api/services/aiPilotBudget')>(), assertPilotEnabled: vi.fn() }));
vi.mock('../api/services/pilotAuth', async original => ({ ...await original<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: vi.fn() }));
import { aiPilot } from '../api/ai-pilot';
import { runBudgetedPilotChat } from '../api/services/aiPilotGateway';
import { authenticatePilotUser } from '../api/services/pilotAuth';
const chat = vi.mocked(runBudgetedPilotChat);
const send = (body: unknown) => aiPilot.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture' }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); vi.mocked(authenticatePilotUser).mockResolvedValue(42); chat.mockResolvedValue({ response: 'Synthetic reply', provider: 'gemini', model: 'fixture' }); });
afterEach(() => vi.restoreAllMocks());
it('passes the whitelisted approach and authenticated identity to the guarded gateway', async () => {
  const response = await send({ user_input: 'Check this reasoning', approach: 'review', language: 'Sepitori' });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect((await response.json()).response_approach).toBe('review');
  expect(chat).toHaveBeenCalledExactlyOnceWith('Check this reasoning', 42, 'Sepitori', undefined, undefined, undefined, 'review');
});
it.each(['unlimited', { model: 'other' }, null, 'review\nnew policy'])('rejects arbitrary intelligence overrides before the gateway: %j', approach => {
  return send({ user_input: 'Hello', approach }).then(async response => {
    expect(response.status).toBe(400); expect((await response.json()).code).toBe('INVALID_INPUT');
    expect(chat).not.toHaveBeenCalled();
  });
});
it('keeps explicit OpenAI selection within the same approach and gateway', async () => {
  const response = await send({ user_input: 'Compare my choices', provider: 'openai', approach: 'compare' });
  expect(response.status).toBe(200);
  expect(chat).toHaveBeenCalledExactlyOnceWith('Compare my choices', 42, undefined, undefined, undefined, 'openai', 'compare');
});
