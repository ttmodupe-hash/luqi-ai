import { beforeEach, describe, expect, it, vi } from 'vitest';
import type OpenAI from 'openai';
const mocks = vi.hoisted(() => ({ calculate: vi.fn() }));
vi.mock('../api/services/labs/engine', () => ({ evaluateMathExpression: mocks.calculate }));
import { orchestrateAgent } from '../api/services/agent';
const functionCall = { id: 'call-1', type: 'function', function: { name: 'calculate', arguments: '{"expression":"2+3"}' } };
const customCall = { id: 'call-2', type: 'custom', custom: { name: 'unregistered', input: 'PRIVATE-CUSTOM-INPUT' } };
function fixture(calls: unknown[]) {
  const create = vi.fn().mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: null, tool_calls: calls } }] })
    .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: '5' } }] });
  return { create, options: { client: { chat: { completions: { create } } } as unknown as OpenAI,
    query: '2+3', systemPrompt: 'Use the calculator', provider: 'fixture', model: 'fixture', maxIterations: 2 } };
}
beforeEach(() => { vi.clearAllMocks(); mocks.calculate.mockReturnValue(5); });
describe('SDK tool-call discriminant', () => {
  it('executes a registered function and returns the synthetic provider reply', async () => {
    const { create, options } = fixture([functionCall]);
    const result = await orchestrateAgent(options);
    expect(mocks.calculate).toHaveBeenCalledExactlyOnceWith('2+3');
    expect(create).toHaveBeenCalledTimes(2);
    expect(result.content).toBe('5');
    expect(result.toolsUsed).toEqual([{ tool: 'calculate', arguments: { expression: '2+3' }, ok: true }]);
  });
  it.each([[customCall], [functionCall, customCall], [customCall, functionCall]])(
    'rejects the complete unsupported batch before executing any tool', async (...calls) => {
      const { create, options } = fixture(calls);
      await expect(orchestrateAgent(options)).rejects.toThrow('Unsupported agent tool call type');
      expect(mocks.calculate).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(1);
    });
});
