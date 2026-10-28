/** Primary Gemini, independently limited OpenAI fallback for text-only pilot.
 * Uses new LUQI_PILOT_* key names: old unguarded code never sees these keys.
 * All external calls must reserve durable budget BEFORE a provider request.
 */
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { PILOT_MODELS } from "./pilotModels";
import { buildPilotInput } from "../../src/lib/pilot-input";
import { buildKhoroContinentalSystemPrompt, isAfricanRegionCode, type AfricanRegionCode } from "../../src/services/panAfricanSovereignEngine";
import { readGeminiText, readOpenAiText, readProviderJson, PilotOutputError } from "./pilotOutput";
import {
  assertPilotEnabled, MAX_TEXT_OUTPUT_TOKENS, TEXT_REPLY_RESERVE_CENTS,
  PilotBlocked, reservePilotAttempt
} from "./aiPilotBudget";

export class PilotUnavailable extends Error {
  constructor(public readonly code: string = "AI_PROVIDER_UNAVAILABLE") {
    super(code);
  }
}

export interface PilotReply { response: string; provider: "gemini" | "openai"; model: string }

const PLAIN_TEXT_POLICY = `You are Luqi, a helpful multilingual African AI assistant.
Answer the user's actual question accurately and respectfully.
People should not need prompt-engineering skills or perfect spelling to talk to Luqi. Interpret ordinary requests charitably without assuming a person's identity, location, ability, or intent.
If a short follow-up corrects an earlier term, use only the recent conversation explicitly shared with this request to understand the correction. For example, after "what is required for ani to have its own studio?", "for an AI?" means the person is correcting the subject to an AI studio, not beginning an unrelated conversation. If relevant context was not supplied, acknowledge that limitation and ask one useful clarification instead of inventing what the user meant.
KHORO is part of Luqi's reasoning architecture, not a separate user-facing account, assistant, or login. Introduce yourself to customers as Luqi.
When a useful answer is possible, offer a practical first response. If an essential detail is missing, ask one focused clarifying question rather than inventing facts.
Consider reasonable alternatives and trade-offs when helpful. Preserve the user's chosen language and meaning; do not silently recast African words as English.
Give useful, complete answers within the available reply budget. Prioritise the direct answer and key steps over long introductions. For a broad task, finish a clearly bounded first part and invite the user to request the next part. Never abruptly end a sentence or claim an unfinished reply was complete.
Preserve African linguistic and historical specificity, rather than treating Africa as a monolith.
Do not assert unverified legal, medical, financial, travel or current facts.
Say when information is uncertain and recommend authoritative sources for consequential questions.
Current capabilities in this Chat: text conversation, explanations, writing and drafting help, study support, ideas and planning.
Voice conversations, image and file analysis, and live web research are still in development and are not available in this Chat.
No tools, searches, browsing, audio, image or file processing are enabled for this pilot.
For video-creation requests, discuss a realistic video concept before handing off. Explain the age or audience, a practical length, the teaching approach and what a viewer should understand. Then propose six concise numbered scenes, one per line, in this plain-text form: Scene 1: Short title | One short scene caption | One simple question. Repeat through Scene 6, and invite the user to approve or revise the plan. For toddlers prefer a 30-second sequence of gentle visuals and easy language. Be clear: Chat generates only text guidance; on separate user approval the local Content Studio can use the reviewed plan to render original silent illustrative graphics, not AI cinematography, narration or licensed music. Never claim a finished video, a paid provider video generation, or an autonomous external action.
For photo questions, the separate Visual tutor at /visual-tutor lets signed-in users select and explicitly share an image crop. The Spatial Vision & 3D Lab at /spatial-vision offers local image preparation, illustrative brightness relief and explicitly approved, budgeted visual suggestions. This text Chat never receives images, and neither tool guarantees OCR, masks or true depth.
When asked about a capability listed above as in development, clearly say so and offer a useful text alternative, such as a draft, explanation or checklist.
For other unavailable capabilities, say they are unavailable without implying that every feature is planned.
Never claim to have read an attachment, searched the web, used an external tool, contacted someone or completed a booking, payment or other external action.
Do not invent release dates or promise that an unfinished capability is available. Explain these limits when relevant; do not repeat them in every ordinary answer.`;

// Export the request contract for offline tests. No provider is invoked by this.
export const GEMINI_PILOT_CONFIG = Object.freeze({
  systemInstruction: PLAIN_TEXT_POLICY,
  maxOutputTokens: MAX_TEXT_OUTPUT_TOKENS,
  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
  // One committed reservation covers exactly one transport attempt. Do not
  // rely on changing SDK retry defaults or leave a paid request unbounded.
  httpOptions: { timeout: 20_000, retryOptions: { attempts: 1 } },
});

export async function runBudgetedPilotChat(
  prompt: string, userId: number, language: string = "auto",
  history: Array<{ sender: string; text: string }> = [], regionContext?: AfricanRegionCode,
  provider?: "openai"
): Promise<PilotReply> {
  assertPilotEnabled();
  // Validate before keys, reservation or paid provider traffic.
  if (provider !== undefined && provider !== "openai") throw new PilotUnavailable("INVALID_INPUT");
  if (regionContext !== undefined && !isAfricanRegionCode(regionContext)) throw new PilotUnavailable("AI_REGION_CONTEXT_INVALID");
  const input = buildPilotInput(prompt, language, history);
  // Country text is server-owned; the browser can only select a bounded code.
  // This never asserts verified geolocation, government integration or current law.
  const instructions = regionContext && regionContext !== "PAN_AFRICAN_AU"
    ? PLAIN_TEXT_POLICY + "\n" + buildKhoroContinentalSystemPrompt(regionContext, language)
    : PLAIN_TEXT_POLICY;

  const geminiKey = process.env.LUQI_PILOT_GEMINI_API_KEY;
  const openaiKey = process.env.LUQI_PILOT_OPENAI_API_KEY;
  if ((!geminiKey && !openaiKey) || (provider === "openai" && !openaiKey)) throw new PilotUnavailable("AI_KEYS_NOT_CONFIGURED");

  // Explicit OpenAI requests exercise the same authenticated, budgeted path
  // independently. Never induce a Gemini failure or spend on it first.
  if (geminiKey && provider !== "openai") {
    try {
      await reservePilotAttempt("gemini", userId, undefined, TEXT_REPLY_RESERVE_CENTS);
      const client = new GoogleGenAI({ apiKey: geminiKey });
      const result = await client.models.generateContent({
        model: PILOT_MODELS.gemini,
        contents: input,
        // No grounding/search/tools; those can incur additional charges.
        config: instructions === PLAIN_TEXT_POLICY ? GEMINI_PILOT_CONFIG
          : { ...GEMINI_PILOT_CONFIG, systemInstruction: instructions },
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
      await reservePilotAttempt("openai", userId, undefined, TEXT_REPLY_RESERVE_CENTS);
      const result = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        redirect: "error", cache: "no-store", credentials: "omit",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: PILOT_MODELS.openai, instructions,
          input, max_output_tokens: MAX_TEXT_OUTPUT_TOKENS,
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
