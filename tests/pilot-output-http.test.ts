import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('../api/services/aiPilotGateway', () => ({ runBudgetedPilotChat: vi.fn() }));
vi.mock('../api/services/aiPilotBudget', async original => ({ ...await original<typeof import('../api/services/aiPilotBudget')>(), assertPilotEnabled: vi.fn() }));
vi.mock('../api/services/pilotAuth', async original => ({ ...await original<typeof import('../api/services/pilotAuth')>(), authenticatePilotUser: vi.fn() }));
import { aiPilot } from '../api/ai-pilot';
import { PilotOutputError, type PilotOutputCode } from '../api/services/pilotOutput';
import { runBudgetedPilotChat } from '../api/services/aiPilotGateway';
import { authenticatePilotUser } from '../api/services/pilotAuth';
import { askPilot } from '../src/lib/ai-pilot';
const chat = vi.mocked(runBudgetedPilotChat);
beforeEach(() => { vi.resetAllMocks(); vi.mocked(authenticatePilotUser).mockResolvedValue(42); });
afterEach(() => vi.restoreAllMocks());
for (const [code, status] of [['AI_RESPONSE_BLOCKED', 422], ['AI_REPLY_INCOMPLETE', 502], ['AI_RESPONSE_INVALID', 502]] as const) {
  it('HTTP and browser client preserve ' + code + ' with no private text or retries', async () => {
    const failure = new PilotOutputError(code as PilotOutputCode); failure.message = 'PRIVATE-DIAGNOSTIC';
    chat.mockRejectedValue(failure);
    const response = await aiPilot.request('/', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer fixture' }, body: JSON.stringify({ user_input: 'Fixture' }) });
    expect(response.status).toBe(status); expect(response.headers.get('cache-control')).toBe('no-store');
    const data = await response.json();
    expect(data.code).toBe(code); expect(data.message).toContain('attempt may still count');
    expect(JSON.stringify(data)).not.toContain('PRIVATE'); expect(data).not.toHaveProperty('response');
    const request = vi.fn(async () => Response.json({ ...data, response: 'PRIVATE-PARTIAL' }, { status }));
    await expect(askPilot('fixture', 'Fixture', new AbortController().signal, request)).rejects.toMatchObject({ code });
    expect(request).toHaveBeenCalledTimes(1); expect(chat).toHaveBeenCalledTimes(1);
  });
}
