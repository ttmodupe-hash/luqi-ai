/** Primary Gemini, independently limited OpenAI fallback for text-only pilot.
 * Uses new LUQI_PILOT_* key names: old unguarded code never sees these keys.
 * All external calls must reserve durable budget BEFORE a provider request.
 */
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { PILOT_MODELS } from "./pilotModels";
import { buildPilotInput } from "../../src/lib/pilot-input";
import { readGeminiText, readOpenAiText, readProviderJson, PilotOutputError } from "./pilotOutput";
import {
  assertPilotEnabled, MAX_OUTPUT_TOKENS,
  PilotBlocked, reservePilotAttempt
} from "./aiPilotBudget";

export class PilotUnavailable extends Error {
  constructor(public readonly code: string = "AI_PROVIDER_UNAVAILABLE") {
    super(code);
  }
}

export interface PilotReply { response: string; provider: "gemini" | "openai"; model: string }

const PLAIN_TEXT_POLICY = `You are LUQI-AI / KHORO, a helpful multilingual African AI assistant.
Answer the user's actual question accurately and respectfully.
Preserve African linguistic and historical specificity, rather than treating Africa as a monolith.
Do not assert unverified legal, medical, financial, travel or current facts.
Say when information is uncertain and recommend authoritative sources for consequential questions.
No tools, searches, browsing, audio, image or file processing are enabled for this pilot.`;

// Export the request contract for offline tests. No provider is invoked by this.
export const GEMINI_PILOT_CONFIG = Object.freeze({
  systemInstruction: PLAIN_TEXT_POLICY,
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  // One committed reservation covers exactly one transport attempt. Do not
  // rely on changing SDK retry defaults or leave a paid request unbounded.
  httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
});

export async function runBudgetedPilotChat(
  prompt: string, userId: number, language: string = "auto",
  history: Array<{ sender: string; text: string }> = []
): Promise<PilotReply> {
  assertPilotEnabled();
  // Validate the complete formatted input BEFORE keys, reservations or requests.
  // A late qualifier in a long question must never be silently cut off.
  const input = buildPilotInput(prompt, language, history);

  const geminiKey = process.env.LUQI_PILOT_GEMINI_API_KEY;
  const openaiKey = process.env.LUQI_PILOT_OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) throw new PilotUnavailable("AI_KEYS_NOT_CONFIGURED");

  if (geminiKey) {
    try {
      await reservePilotAttempt("gemini", userId);
      const client = new GoogleGenAI({ apiKey: geminiKey });
      const result = await client.models.generateContent({
        model: PILOT_MODELS.gemini,
        contents: input,
        // No grounding/search/tools; those can incur additional charges.
        config: GEMINI_PILOT_CONFIG,
      });
      return { response: readGeminiText(result), provider: "gemini", model: PILOT_MODELS.gemini };
    } catch (error) {
      // A refusal, unfinished reply or unverified payload is terminal. Do not
      // bypass that outcome or silently pay for another provider to replace it.
      if (error instanceof PilotOutputError) throw error;
      if (error instanceof PilotBlocked &&
          error.reason !== "AI_PROVIDER_BUDGET_EXHAUSTED") throw error;
      // No API exception messages: providers may include sensitive headers.
    }
  }

  if (openaiKey) {
    try {
      await reservePilotAttempt("openai", userId);
      const result = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        redirect: "error", cache: "no-store", credentials: "omit",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: PILOT_MODELS.openai, instructions: PLAIN_TEXT_POLICY,
          input, max_output_tokens: MAX_OUTPUT_TOKENS,
          reasoning: { effort: "none" },
          store: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!result.ok) throw new Error("Provider returned non-success status");
      return { response: readOpenAiText(await readProviderJson(result)), provider: "openai", model: PILOT_MODELS.openai };
    } catch (error) {
      if (error instanceof PilotBlocked || error instanceof PilotOutputError) throw error;
    }
  }
  throw new PilotUnavailable();
}
