import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PILOT_MODELS } from "../api/services/pilotModels";

const { reserve } = vi.hoisted(() => ({ reserve: vi.fn() }));
vi.mock("../api/services/aiPilotBudget", async importOriginal => ({
  ...await importOriginal<typeof import("../api/services/aiPilotBudget")>(),
  reservePilotAttempt: reserve,
}));
import { runBudgetedPilotChat } from "../api/services/aiPilotGateway";
import { PilotBlocked } from "../api/services/aiPilotBudget";

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
  it("reserves first and returns Gemini text with fixed model and output bounds", async () => {
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      expect(reserve.mock.calls).toEqual([["gemini", 42]]);
      expect(url).toBe(`https://generativelanguage.googleapis.com/v1beta/models/${PILOT_MODELS.gemini}:generateContent`);
      expect(options.method).toBe("POST");
      expect(new Headers(options.headers).get("x-server-timeout")).toBe("20");
      const request = JSON.parse(options.body as string);
      expect(request.generationConfig.maxOutputTokens).toBe(512);
      expect(request).not.toHaveProperty("tools");
      return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: "Sawubona" }] } }] });
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
      return Response.json({ output: [{ content: [{ type: "output_text", text: "Hello" }] }] });
    });
    vi.stubGlobal("fetch", fetcher);
    expect((await runBudgetedPilotChat("Say hello", 42)).provider).toBe("openai");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("stops a hung Gemini request and charges a separate reservation for fallback", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(async (url: string, options: RequestInit) => {
      if (!url.includes("googleapis")) {
        return Response.json({ output: [{ content: [{ type: "output_text", text: "Hello" }] }] });
      }
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
