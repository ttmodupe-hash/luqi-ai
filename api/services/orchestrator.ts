// =====================================================================
// MULTI-PROVIDER AI ORCHESTRATOR SERVICE
// =====================================================================
// Dynamically routes requests to the optimal AI provider based on task intent,
// with automatic fallback chains, cost tracking, and web search augmentation.
//
// Providers:
//   - OpenAI:    GPT-4o (general), GPT-4o-mini (fast/cheap), o3-mini (reasoning)
//   - Anthropic: Claude 3.5 Sonnet (code, creative, long-context)
//   - Google:    Gemini 2.5 Pro (massive context up to 2M tokens)
// =====================================================================

const ANTI_HALLUCINATION_PROMPT = `You are an elite-tier AI assistant operating within LUQI's multi-provider intelligence network.

STRICT GROUNDING RULES:
1. Generate responses based EXCLUSIVELY on the trusted context provided.
2. If the context does not contain explicit data, say exactly: "I cannot find this information in the trusted sources."
3. NEVER fabricate citations, statistics, or facts.
4. Distinguish between verified facts, preliminary research, and traditional knowledge.
5. For health/medicine topics: always include safety warnings and a disclaimer that information is not medical advice.
6. For technical/code tasks: provide working, well-commented code with error handling.
7. For reasoning tasks: show your step-by-step logic clearly.
8. If uncertain about ANY claim, express uncertainty rather than guessing.`;

// ─── Provider Availability ───
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";

const hasOpenAI = OPENAI_KEY.length > 10 && !OPENAI_KEY.includes("mock");
const hasAnthropic = ANTHROPIC_KEY.length > 10 && !ANTHROPIC_KEY.includes("mock");
const hasGemini = GEMINI_KEY.length > 10 && !GEMINI_KEY.includes("mock");

// ─── Client Initialization ───
const openaiClient = hasOpenAI ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// Lazy-load optional providers to avoid import errors if packages missing
let anthropicClient: any = null;
let geminiClient: any = null;

async function getAnthropicClient() {
  if (!hasAnthropic) return null;
  if (anthropicClient) return anthropicClient;
  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    anthropicClient = new Anthropic({ apiKey: ANTHROPIC_KEY });
    return anthropicClient;
  } catch {
    console.warn("[Orchestrator] Anthropic SDK not available");
    return null;
  }
}

async function getGeminiClient() {
  if (!hasGemini) return null;
  if (geminiClient) return geminiClient;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_KEY });
    return geminiClient;
  } catch {
    console.warn("[Orchestrator] Google GenAI SDK not available");
    return null;
  }
}

// ─── Intent Classification ───
export type TaskIntent =
  | "code_generation"
  | "technical_analysis"
  | "reasoning_math"
  | "creative_writing"
  | "massive_context"
  | "general_chat"
  | "medical_safety"
  | "search_required";

export function classifyIntent(query: string, contextLength = 0): { intent: TaskIntent; reason: string } {
  const q = query.toLowerCase();

  if (contextLength > 100000) {
    return { intent: "massive_context", reason: "Context exceeds 100K tokens" };
  }

  if (/\b(code|function|script|debug|error|typescript|javascript|python|sql|api)\b/.test(q)) {
    return { intent: "code_generation", reason: "Contains code-related keywords" };
  }

  if (/\b(analyze|research|compare|evaluate|assess|review|study|investigate)\b/.test(q)) {
    return { intent: "technical_analysis", reason: "Contains analysis keywords" };
  }

  if (/\b(calculate|compute|solve|equation|math|formula|algorithm|logic)\b/.test(q)) {
    return { intent: "reasoning_math", reason: "Contains math/reasoning keywords" };
  }

  if (/\b(write|create|generate|compose|draft|story|poem|essay|article)\b/.test(q)) {
    return { intent: "creative_writing", reason: "Contains creative writing keywords" };
  }

  if (/\b(search|find|look up|what is|who is|when did|where is)\b/.test(q)) {
    return { intent: "search_required", reason: "Contains search keywords" };
  }

  if (/\b(health|medical|medicine|doctor|symptom|treatment|diagnosis)\b/.test(q)) {
    return { intent: "medical_safety", reason: "Contains medical keywords" };
  }

  return { intent: "general_chat", reason: "Default classification" };
}

// ─── Provider Selection ───
interface ProviderConfig {
  provider: "openai" | "anthropic" | "google";
  model: string;
  maxTokens: number;
  temperature: number;
}

function selectProvider(intent: TaskIntent): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  if (hasAnthropic) {
    configs.push({
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 4096,
      temperature: 0.7,
    });
  }

  if (hasOpenAI) {
    configs.push({
      provider: "openai",
      model: intent === "code_generation" ? "gpt-4o" : "gpt-4o-mini",
      maxTokens: 4096,
      temperature: 0.7,
    });
  }

  if (hasGemini) {
    configs.push({
      provider: "google",
      model: "gemini-2.5-pro",
      maxTokens: 8192,
      temperature: 0.7,
    });
  }

  return configs;
}

// ─── Orchestration Result ───
export interface OrchestratorResult {
  content: string;
  provider: string;
  model: string;
  intent: TaskIntent;
  intentReason: string;
  fallbackUsed: boolean;
  latencyMs: number;
  tokensUsed: number;
  costEstimate: string;
  searchAugmented: boolean;
  allProvidersAvailable: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
  };
}

// ─── Main Orchestration Function ───
export async function orchestrateRequest(options: {
  query: string;
  context?: string;
  systemPrompt?: string;
  useSearch?: boolean;
  forceProvider?: "openai" | "anthropic" | "google";
  forceModel?: string;
}): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const context = options.context || "";
  const fullPrompt = context ? `${context}\n\n${options.query}` : options.query;

  // Step 1: Classify intent
  const intentResult = classifyIntent(options.query, context.length);
  const intent = intentResult.intent;

  // Step 2: Optional web search augmentation
  let searchContext: string | undefined;
  let searchAugmented = false;
  if (options.useSearch) {
    try {
      const { searchWeb, formatSearchContext } = await import("./serper");
      const searchResults = await searchWeb(options.query, { num: 5 });
      if (searchResults) {
        searchContext = formatSearchContext(searchResults);
        searchAugmented = true;
      }
    } catch (e) {
      console.warn("[Orchestrator] Search augmentation failed:", e);
    }
  }

  // Step 3: Select provider chain
  const systemPrompt = options.systemPrompt || ANTI_HALLUCINATION_PROMPT;
  let candidates: ProviderConfig[];

  if (options.forceProvider && options.forceModel) {
    candidates = [{
      provider: options.forceProvider,
      model: options.forceModel,
      maxTokens: 4096,
      temperature: 0.5,
    }];
  } else {
    candidates = selectProvider(intent);
  }

  // Step 4: Execute with fallback chain
  let lastError: Error | null = null;
  let result: { content: string; tokensUsed: number } | null = null;
  let usedConfig: ProviderConfig | null = null;
  let fallbackUsed = false;

  for (let i = 0; i < candidates.length; i++) {
    const config = candidates[i];
    if (i > 0) fallbackUsed = true;

    try {
      console.log(`[Orchestrator] Trying ${config.provider}/${config.model} for intent: ${intent}`);

      if (config.provider === "openai") {
        const client = openaiClient;
        if (!client) throw new Error("OpenAI client not available");

        const response = await client.chat.completions.create({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: fullPrompt },
          ],
        });

        result = {
          content: response.choices[0]?.message?.content || "",
          tokensUsed: response.usage?.total_tokens || 0,
        };
        usedConfig = config;
        break;
      } else if (config.provider === "anthropic") {
        const client = await getAnthropicClient();
        if (!client) throw new Error("Anthropic client not available");

        const response = await client.messages.create({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: fullPrompt }],
        });

        result = {
          content: response.content[0]?.type === "text" ? response.content[0].text : "",
          tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0,
        };
        usedConfig = config;
        break;
      } else if (config.provider === "google") {
        const client = await getGeminiClient();
        if (!client) throw new Error("Gemini client not available");

        const response = await client.models.generateContent({
          model: config.model,
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: config.maxTokens,
            temperature: config.temperature,
          },
        });

        result = {
          content: response.text || "",
          tokensUsed: response.usage?.totalTokens || 0,
        };
        usedConfig = config;
        break;
      }
    } catch (e) {
      lastError = e as Error;
      console.warn(`[Orchestrator] ${config.provider} failed:`, e);
      continue;
    }
  }

  if (!result || !usedConfig) {
    throw new Error(`All providers failed. Last error: ${lastError?.message}`);
  }

  const latencyMs = Date.now() - startTime;
  const costEstimate = `$${(result.tokensUsed * 0.00001).toFixed(4)}`;

  return {
    content: result.content,
    provider: usedConfig.provider,
    model: usedConfig.model,
    intent,
    intentReason: intentResult.reason,
    fallbackUsed,
    latencyMs,
    tokensUsed: result.tokensUsed,
    costEstimate,
    searchAugmented,
    allProvidersAvailable: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      google: hasGemini,
    },
  };
}

// ─── Status & Logs ───
export function getOrchestratorStatus(): {
  providers: { openai: boolean; anthropic: boolean; google: boolean };
  demo: boolean;
} {
  return {
    providers: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      google: hasGemini,
    },
    demo: !hasOpenAI && !hasAnthropic && !hasGemini,
  };
}

export function getRecentLogs(limit = 20): any[] {
  // In production, this would query a logs table
  // For now, return empty array
  return [];
}
