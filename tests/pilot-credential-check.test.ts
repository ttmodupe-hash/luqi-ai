import { describe, expect, it, vi } from "vitest";
import { checkPilotCredentials } from "../api/services/pilotCredentialCheck";
import { PILOT_MODELS } from "../api/services/pilotModels";

const env = {
  LUQI_AI_CREDENTIAL_CHECK_ENABLED: "true",
  LUQI_AI_PROVIDER_ENABLED: "false", LUQI_AI_BILLING_APPROVED: "false",
  LUQI_PILOT_GEMINI_API_KEY: "test-gemini-secret",
  LUQI_PILOT_OPENAI_API_KEY: "test-openai-secret",
};
const modelResponse = (url: string) => Response.json(url.includes("googleapis")
  ? { name: `models/${PILOT_MODELS.gemini}`, supportedGenerationMethods: ["generateContent"] }
  : { id: PILOT_MODELS.openai, object: "model" });

describe("opt-in pilot credential metadata check", () => {
  it.each([undefined, "false", "1", "TRUE"])("does not contact providers with flag %s", async flag => {
    const fetcher = vi.fn();
    expect(await checkPilotCredentials({ ...env, LUQI_AI_CREDENTIAL_CHECK_ENABLED: flag }, fetcher)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses only fixed GET endpoints and header credentials while paid inference stays disabled", async () => {
    const fetcher = vi.fn(async (url: string) => modelResponse(url));
    const before = { ...env };
    const results = await checkPilotCredentials(env, fetcher as typeof fetch);
    expect(results.map(x => x.status)).toEqual(["metadata_accessible", "metadata_accessible"]);
    expect(env).toEqual(before);
    expect(fetcher).toHaveBeenCalledTimes(2);
    for (const [url, options] of fetcher.mock.calls as unknown as [string, RequestInit][]) {
      expect(url).toMatch(/^https:\/\/(generativelanguage.googleapis.com\/v1beta|api.openai.com\/v1)\/models\//);
      expect(url).not.toContain("?");
      expect(options.method).toBe("GET");
      expect(options.body).toBeUndefined();
      expect(options.redirect).toBe("error");
      expect(options.signal).toBeInstanceOf(AbortSignal);
      const headers = new Headers(options.headers);
      expect(url.includes("googleapis") ? headers.get("x-goog-api-key") : headers.get("Authorization"))
        .toBe(url.includes("googleapis") ? env.LUQI_PILOT_GEMINI_API_KEY : `Bearer ${env.LUQI_PILOT_OPENAI_API_KEY}`);
    }
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  it("skips missing and malformed keys without accepting legacy keys", async () => {
    const fetcher = vi.fn();
    const results = await checkPilotCredentials({ ...env,
      LUQI_PILOT_GEMINI_API_KEY: "", LUQI_PILOT_OPENAI_API_KEY: "secret\n",
      GEMINI_API_KEY: "legacy-secret", OPENAI_API_KEY: "legacy-secret",
    }, fetcher);
    expect(results.map(x => x.status)).toEqual(["key_missing", "key_format_invalid"]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([[401, "authentication_rejected"], [403, "permission_denied"],
    [404, "model_unavailable"], [429, "rate_limited"], [500, "provider_error"],
    [302, "provider_error"]] as const)("sanitizes HTTP %s without reading error bodies", async (status, expected) => {
    const fetcher = vi.fn(async () => new Response("secret echoed by provider", { status }));
    const results = await checkPilotCredentials(env, fetcher);
    expect(results.map(x => x.status)).toEqual([expected, expected]);
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  it("checks the second provider even when the first times out, and drops raw errors", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("googleapis")) throw new Error("secret in network error");
      return modelResponse(url);
    });
    const results = await checkPilotCredentials(env, fetcher as typeof fetch);
    expect(results.map(x => x.status)).toEqual(["network_error", "metadata_accessible"]);
    expect(JSON.stringify(results)).not.toContain("secret");
  });

  it.each(["not-json", "{}", "null", "[]", JSON.stringify({ id: "different-model", object: "model" }),
    "x".repeat(16_385)])("does not accept malformed, mismatched or oversized metadata", async body => {
    const fetcher = vi.fn(async () => new Response(body));
    const results = await checkPilotCredentials(env, fetcher);
    expect(results.map(x => x.status)).toEqual(["unexpected_response", "unexpected_response"]);
  });

  it("requires Gemini to advertise text generation support", async () => {
    const fetcher = vi.fn(async () => Response.json({ name: `models/${PILOT_MODELS.gemini}`, supportedGenerationMethods: ["embedContent"] }));
    const results = await checkPilotCredentials(env, fetcher);
    expect(results[0].status).toBe("unexpected_response");
  });
});
