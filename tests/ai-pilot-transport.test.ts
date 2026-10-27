import { buildPilotInput, MAX_PILOT_INPUT_CHARS } from '../src/lib/pilot-input';
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PILOT_MODELS } from "../api/services/pilotModels";

const { reserve } = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock("../api/services/aiPilotBudget", async importOriginal => ({
  ...await importOriginal<typeof import("../api/services/aiPilotBudget")>(),
  reservePilotAttempt: reserve,
}));
import { runBudgetedPilotChat } from "../api/services/aiPilotGateway";
import { PilotBlocked } from "../api/services/aiPilotBudget";

const geminiReply = (text: string) => ({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text }] } }] });
const openaiReply = (text: string) => ({ status: 'completed', error: null, incomplete_details: null,
  output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] }] });

beforeEach(() => {
  for (const [name, value] of Object.entries({
    LUQI_AI_PROVIDER_ENABLED: "true", LUQI_AI_BILLING_APPROVED: "true",
    LUQI_AI_MONTHLY_USD: "100", LUQI_GEMINI_MONTHLY_USD: "60",
    LUQI_OPENAI_MONTHLY_USD: "40", LUQI_PILOT_GEMINI_API_KEY: "fixture-gemini",
    LUQI_PILOT_OPENAI_API_KEY: "fixture-openai",
  })) vi.stubEnv(name, value);
  reserve.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("paid pilot transport with real Gemini SDK and synthetic HTTP", () => {
  it('uses only OpenAI and its own reservation when explicitly selected, even with both keys present', async () => {
    const fetcher = vi.fn(async (url: string) => {
      expect(url).toBe('https://api.openai.com/v1/responses');
      expect(reserve.mock.calls).toEqual([['openai', 42]]);
      return Response.json(openaiReply('Independent reply'));
    });
    vi.stubGlobal('fetch', fetcher);
    expect(await runBudgetedPilotChat('Say hello', 42, 'auto', [], undefined, 'openai')).toEqual({
      response: 'Independent reply', provider: 'openai', model: PILOT_MODELS.openai,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('never falls back to Gemini when explicit OpenAI has no key, fails or exhausts its budget', async () => {
    const fetcher = vi.fn(async () => Response.json({ error: { message: 'PRIVATE-ERROR' } }, { status: 503 }));
    vi.stubGlobal('fetch', fetcher);
    vi.stubEnv('LUQI_PILOT_OPENAI_API_KEY', '');
    await expect(runBudgetedPilotChat('Say hello', 42, 'auto', [], undefined, 'openai'))
      .rejects.toMatchObject({ code: 'AI_KEYS_NOT_CONFIGURED' });
    expect(reserve).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv('LUQI_PILOT_OPENAI_API_KEY', 'fixture-openai');
    await expect(runBudgetedPilotChat('Say hello', 42, 'auto', [], undefined, 'openai'))
      .rejects.toMatchObject({ code: 'AI_PROVIDER_UNAVAILABLE' });
    expect(reserve.mock.calls).toEqual([['openai', 42]]); expect(fetcher).toHaveBeenCalledTimes(1);
    reserve.mockReset().mockRejectedValue(new PilotBlocked('AI_PROVIDER_BUDGET_EXHAUSTED'));
    fetcher.mockClear();
    await expect(runBudgetedPilotChat('Say hello', 42, 'auto', [], undefined, 'openai'))
      .rejects.toMatchObject({ reason: 'AI_PROVIDER_BUDGET_EXHAUSTED' });
    expect(reserve.mock.calls).toEqual([['openai', 42]]); expect(fetcher).not.toHaveBeenCalled();
  });

  it("reserves first and returns Gemini text with fixed model and output bounds", async () => {
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      expect(reserve.mock.calls).toEqual([["gemini", 42]]);
      expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${PILOT_MODELS.gemini}:generateContent`);
      expect(options.method).toBe("POST");
      expect(new Headers(options.headers).get("x-server-timeout")).toBe("20");
      const request = JSON.parse(options.body as string);
      expect(request.generationConfig.maxOutputTokens).toBe(512);
      expect(request).not.toHaveProperty("tools");
      return Response.json(geminiReply('Sawubona'));
    });
    vi.stubGlobal("fetch", fetcher);
    expect(await runBudgetedPilotChat("Say hello", 42)).toEqual({
      response: "Sawubona", provider: "gemini", model: PILOT_MODELS.gemini,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not retry a Gemini 503 and reserves independently before OpenAI fallback", async () => {
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (url.includes("googleapis")) {
        expect(reserve.mock.calls).toEqual([["gemini", 42]]);
        return Response.json({ error: { code: 503, message: "fixture failure" } }, { status: 503 });
      }
      expect(reserve.mock.calls).toEqual([["gemini", 42], ["openai", 42]]);
      expect(url).toBe("https://api.openai.com/v1/responses");
      expect(options).toMatchObject({ method: "POST", redirect: "error", cache: "no-store", credentials: "omit" });
      expect(options.signal).toBeInstanceOf(AbortSignal);
      expect(JSON.parse(options.body as string)).toMatchObject({
        model: PILOT_MODELS.openai, max_output_tokens: 512, store: false,
        reasoning: { effort: "none" },
      });
      return Response.json(openaiReply('Hello'));
    });
    vi.stubGlobal("fetch", fetcher);
    expect((await runBudgetedPilotChat("Say hello", 42)).provider).toBe("openai");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops a hung Gemini request and charges a separate reservation for fallback", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (!url.includes("googleapis")) return Response.json(openaiReply('Hello'));
      return new Promise<Response>((_, reject) => {
        options.signal!.addEventListener("abort", () => reject(new Error("fixture timeout")), { once: true });
      });
    });
    vi.stubGlobal("fetch", fetcher);
    const answer = runBudgetedPilotChat("Say hello", 42);
    // Native AbortSignal.timeout is not driven by fake timers; the SDK also
    // arms a JS timer. Its explicit 20s deadline must trigger this fallback.
    await vi.advanceTimersByTimeAsync(20_001);
    expect((await answer).provider).toBe("openai");
    expect(reserve.mock.calls).toEqual([["gemini", 42], ["openai", 42]]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("never makes a provider call when durable reservations fail", async () => {
    reserve.mockRejectedValue(new PilotBlocked("AI_BUDGET_STORE_UNAVAILABLE"));
    const fetcher = vi.fn(); vi.stubGlobal("fetch", fetcher);
    await expect(runBudgetedPilotChat("Say hello", 42)).rejects.toMatchObject({ reason: "AI_BUDGET_STORE_UNAVAILABLE" });
    expect(fetcher).not.toHaveBeenCalled();
    expect(reserve).toHaveBeenCalledTimes(1);
  });

  it("cannot spend on fallback after its independent budget is exhausted", async () => {
    reserve.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new PilotBlocked("AI_PROVIDER_BUDGET_EXHAUSTED"));
    const fetcher = vi.fn(async () => Response.json({ error: { code: 503 } }, { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    await expect(runBudgetedPilotChat("Say hello", 42)).rejects.toMatchObject({ reason: "AI_PROVIDER_BUDGET_EXHAUSTED" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('complete paid input boundary', () => {
  it.each(['gemini', 'openai'] as const)('preserves the entire exact-limit prompt on %s', async provider => {
    if (provider === 'openai') vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', '');
    const history = [{ sender: 'user', text: 'x'.repeat(350) }, { sender: 'ai', text: 'y'.repeat(350) },
      { sender: 'user', text: 'z'.repeat(350) }, { sender: 'ai', text: 'w'.repeat(342) + 'HIST-END' }];
    const language = 'isiZulu';
    const room = MAX_PILOT_INPUT_CHARS - buildPilotInput('x', language, history).length + 1;
    const prompt = 'p'.repeat(room - 8) + 'END-TEST';
    const expected = buildPilotInput(prompt, language, history);
    const fetcher = vi.fn(async (_url: string, options: RequestInit) => {
      expect(reserve.mock.calls).toEqual([[provider, 42]]);
      const body = JSON.parse(options.body as string);
      const sent = provider === 'gemini' ? body.contents[0].parts[0].text : body.input;
      expect(sent).toBe(expected); expect(sent.length).toBe(6000);
      expect(sent).toContain('HIST-END'); expect(sent.endsWith('END-TEST')).toBe(true);
      return Response.json(provider === 'gemini' ? geminiReply('Fixture reply') : openaiReply('Fixture reply'));
    });
    vi.stubGlobal('fetch', fetcher);
    expect((await runBudgetedPilotChat(prompt, 42, language, history)).provider).toBe(provider);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('rejects formatted overflow before reservations, transport or fallback', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('x'.repeat(6000), 42)).rejects.toMatchObject({ code: 'AI_INPUT_TOO_LARGE' });
    expect(reserve).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects an oversized history turn rather than clipping it at the service boundary', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('Hello', 42, 'auto', [{ sender: 'user', text: 'x'.repeat(351) }]))
      .rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(reserve).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('provider output must be complete before it is presented as an answer', () => {
  it.each([
    ['MAX_TOKENS', 'AI_REPLY_INCOMPLETE'], ['SAFETY', 'AI_RESPONSE_BLOCKED'],
    ['RECITATION', 'AI_RESPONSE_BLOCKED'], ['SPII', 'AI_RESPONSE_BLOCKED'],
    ['OTHER', 'AI_RESPONSE_INVALID'], [undefined, 'AI_RESPONSE_INVALID'],
  ])('Gemini %s is terminal: one attempt, no OpenAI fallback', async (finishReason, code) => {
    const fetcher = vi.fn(async () => Response.json({ candidates: [{ finishReason,
      content: { role: 'model', parts: [{ text: 'PRIVATE-PARTIAL-OUTPUT' }] } }] }));
    vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('Synthetic question', 42)).rejects.toMatchObject({ code });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(reserve.mock.calls).toEqual([['gemini', 42]]);
  });
  it('Gemini prompt filtering without candidates does not fall through to another provider', async () => {
    const fetcher = vi.fn(async () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }));
    vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('Synthetic question', 42)).rejects.toMatchObject({ code: 'AI_RESPONSE_BLOCKED' });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(reserve.mock.calls).toEqual([['gemini', 42]]);
  });
  it.each([
    ['incomplete', 'max_output_tokens', 'AI_REPLY_INCOMPLETE'],
    ['incomplete', 'content_filter', 'AI_RESPONSE_BLOCKED'],
    ['in_progress', undefined, 'AI_RESPONSE_INVALID'], ['failed', undefined, 'AI_RESPONSE_INVALID'],
  ])('OpenAI %s/%s does not publish text or retry', async (status, reason, code) => {
    vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', '');
    const response = { ...openaiReply('PRIVATE-PARTIAL-OUTPUT'), status,
      incomplete_details: reason ? { reason } : null };
    const fetcher = vi.fn(async () => Response.json(response)); vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('Synthetic question', 42)).rejects.toMatchObject({ code });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(reserve.mock.calls).toEqual([['openai', 42]]);
  });
  it('OpenAI refusal is not a transport outage', async () => {
    vi.stubEnv('LUQI_PILOT_GEMINI_API_KEY', '');
    const fetcher = vi.fn(async () => Response.json({ status: 'completed', output: [{ type: 'message',
      role: 'assistant', status: 'completed', content: [{ type: 'refusal', refusal: 'PRIVATE-REFUSAL' }] }] }));
    vi.stubGlobal('fetch', fetcher);
    await expect(runBudgetedPilotChat('Synthetic question', 42)).rejects.toMatchObject({ code: 'AI_RESPONSE_BLOCKED' });
    expect(fetcher).toHaveBeenCalledTimes(1); expect(reserve.mock.calls).toEqual([['openai', 42]]);
  });
});
