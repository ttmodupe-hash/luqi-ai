import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
describe('legacy streaming default prompt', () => {
  it('uses a defined fallback and reports no provider without pretending success', async () => {
    for (const name of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','GEMINI_API_KEY','KIMI_API_KEY','MOONSHOT_API_KEY']) vi.stubEnv(name, '');
    vi.resetModules();
    const { orchestrateStream } = await import('../api/services/orchestrator');
    const events = [];
    for await (const event of orchestrateStream({ query: 'synthetic input' })) events.push(event);
    expect(events).toEqual([{ error: 'no_providers' }]);
  });
});
