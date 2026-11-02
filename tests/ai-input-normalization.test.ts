import { expect, it, vi } from 'vitest';
import { askPilot } from '../src/lib/ai-pilot';
import { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';

it('normalizes surrounding whitespace before checking the same limit displayed by the UI', async () => {
  const question = 'q'.repeat(MAX_PILOT_QUESTION_CHARS - 8) + 'END-TEST';
  const raw = ' '.repeat(100) + question + '\n'.repeat(100);
  expect(raw.length).toBeGreaterThan(6000);
  const request = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    expect(JSON.parse(init!.body as string)).toEqual({ user_input: question });
    return Response.json({ status: 'success', response: 'Fixture reply', provider: 'gemini', provider_model: 'fixture' });
  });
  await askPilot('synthetic-token', raw, new AbortController().signal, request);
  expect(request).toHaveBeenCalledTimes(1);
});

it('still rejects an oversized normalized question without a request', async () => {
  const request = vi.fn();
  await expect(askPilot('synthetic-token', ' ' + 'q'.repeat(MAX_PILOT_QUESTION_CHARS + 1) + '\n', new AbortController().signal, request))
    .rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
  expect(request).not.toHaveBeenCalled();
});
