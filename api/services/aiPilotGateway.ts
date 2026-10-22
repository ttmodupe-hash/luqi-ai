/** Primary Gemini, independently limited OpenAI fallback for text-only pilot.
 * Uses new LUQI_PILOT_* key names: old unguarded code never sees these keys.
 * All external calls must reserve durable budget BEFORE a provider request.
 */
import { GoogleGenAI } from "@google/genai";
import {
  assertPilotEnabled, MAX_INPUT_CHARS, MAX_OUTPUT_TOKENS,
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

export async function runBudgetedPilotChat(
  prompt: string, language: string = "auto",
  history: Array<{ sender: string; text: string }> = []
): Promise<PilotReply> {
  assertPilotEnabled();
  if (!prompt.trim() || prompt.length > MAX_INPUT_CHARS) {
    throw new PilotUnavailable("INVALID_INPUT");
  }
  // Limit the TOTAL provider input, not just the most recent message.
  const past = (Array.isArray(history) ? history.slice(-4) : [])
    .filter(x => x && (x.sender === "user" || x.sender === "ai") && typeof x.text === "string")
    .map(x => `${x.sender}: ${x.text.slice(0, 350)}`).join("\n").slice(0, 1400);
  const input = `Language preference: ${language.slice(0, 50)}
Recent conversation:
${past}
User: ${prompt}`.slice(0, MAX_INPUT_CHARS);

  const geminiKey = process.env.LUQI_PILOT_GEMINI_API_KEY;
  const openaiKey = process.env.LUQI_PILOT_OPENAI_API_KEY;
  if (!geminiKey && !openaiKey) throw new PilotUnavailable("AI_KEYS_NOT_CONFIGURED");

  if (geminiKey) {
    try {
      await reservePilotAttempt("gemini");
      const client = new GoogleGenAI({ apiKey: geminiKey });
      const result = await client.models.generateContent({
        model: "gemini-3.8-flash",
        contents: input,
        config: {
          systemInstruction: PLAIN_TEXT_POLICY,
          maxOutputTokens: MAX_OUTPUT_TOKENS,
          temperature: 0.3,
          // No grounding/search/tools; those can incur additional charges.
        },
      });
      if (result.text?.trim()) {
        return { response: result.text.trim(), provider: "gemini", model: "gemini-3.8-flash" };
      }
    } catch (error) {
      if (error instanceof PilotBlocked &&
          error.reason !== "AI_PROVIDER_BUDGET_EXHAUSTED") throw error;
      // No API exception messages: providers may include sensitive headers.
    }
  }

  if (openaiKey) {
    try {
      await reservePilotAttempt("openai");
      const result = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}` },
        body: JSON.stringify({
          model: "gpt-6-luna", instructions: PLAIN_TEXT_POLICY,
          input, max_output_tokens: MAX_OUTPUT_TOKENS,
          reasoning: { effort: "none" },
          store: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!result.ok) throw new Error("Provider returned non-success status");
      const data: any = await result.json();
      const response = (data.output ?? [])
        .flatMap((item: any) => Array.isArray(item.content) ? item.content : [])
        .filter((item: any) => item.type === "output_text" && typeof item.text === "string")
        .map((item: any) => item.text).join("\n").trim();
      if (response) return { response, provider: "openai", model: "gpt-6-luna" };
    } catch (error) {
      if (error instanceof PilotBlocked) throw error;
    }
  }
  throw new PilotUnavailable();
}
