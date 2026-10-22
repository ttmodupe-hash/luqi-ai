import { afterEach, describe, expect, it, vi } from "vitest";
import { KhoroCognitiveBrain } from "../api/services/khoroCognitiveBrain";
import { MultiModelMasterOrchestrator } from "../api/services/multiModelMasterCore";

const keys = [
  "GEMINI_API_KEY", "GOOGLE_GENAI_API_KEY", "GOOGLE_API_KEY",
  "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY",
  "KIMI_API_KEY", "MOONSHOT_API_KEY",
];

afterEach(() => vi.unstubAllEnvs());

describe("AI outage integrity", () => {
  it("never passes a canned greeting or advice as a live reasoning reply", async () => {
    for (const key of keys) vi.stubEnv(key, "");
    const answer = await KhoroCognitiveBrain.reasonAndRespond("How do I solve a complex maths problem?");
    expect(answer).toBeNull();
    const debt = await KhoroCognitiveBrain.reasonAndRespond("My car is in arrears");
    expect(debt).toBeNull();
  });

  it("reports no available model when providers are unconfigured", async () => {
    for (const key of keys) vi.stubEnv(key, "");
    await expect(MultiModelMasterOrchestrator.executeDominantModel(
      "Explain photosynthesis", "BULK_COMPUTATION"
    )).rejects.toThrow("AI_PROVIDER_UNAVAILABLE");
  });
});
