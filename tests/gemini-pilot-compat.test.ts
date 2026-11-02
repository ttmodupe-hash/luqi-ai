import { describe, expect, it } from "vitest";
import { ThinkingLevel } from "@google/genai";
import { GEMINI_PILOT_CONFIG } from "../api/services/aiPilotGateway";

describe("Gemini 3.8 Flash production pilot compatibility", () => {
  it("uses supported low thinking, without deprecated sampling overrides", () => {
    expect(GEMINI_PILOT_CONFIG.thinkingConfig.thinkingLevel).toBe(ThinkingLevel.LOW);
    expect(GEMINI_PILOT_CONFIG.maxOutputTokens).toBe(1024);
    expect(GEMINI_PILOT_CONFIG).not.toHaveProperty("temperature");
    expect(GEMINI_PILOT_CONFIG).not.toHaveProperty("topP");
    expect(GEMINI_PILOT_CONFIG).not.toHaveProperty("topK");
    expect(GEMINI_PILOT_CONFIG).not.toHaveProperty("tools");
  });
});
