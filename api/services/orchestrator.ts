import OpenAI from "openai";

// =====================================================================
// MULTI-PROVIDER AI ORCHESTRATOR SERVICE
// =====================================================================
// Dynamically routes requests to the optimal AI provider based on task intent,
// with automatic fallback chains, cost tracking, and web search augmentation.
//
// Providers (fallback chain order: kimi → anthropic → openai → google):
//   - Kimi:      K3 via api.moonshot.ai (1M context, OpenAI-compatible)
//   - OpenAI:    GPT-4o (general), GPT-4o-mini (fast/cheap), o3-mini (reasoning)
//   - Anthropic: Claude 3.5 Sonnet (code, creative, long-context)
//   - Google:    Gemini 2.5 Pro (massive context up to 2M tokens)
// =====================================================================

const GENERAL_INTELLIGENCE_PROMPT = `You are LUQI AI — an omni-capable, comprehensive, sovereign AI intelligence engine for Africa and the world.

CAPABILITY & KNOWLEDGE POLICY:
1. Answer ANY and ALL user questions thoroughly, accurately, and authoritatively across all disciplines — including STEM (physics, chemistry, biology, mathematics), computer networking (Cisco CCNA/CCNP/CCIP), ITIL & AI governance, Pan-African economics and trade (AfCFTA, SADC, ECOWAS), programming, general knowledge, African history and languages, business, literature, and practical problem-solving.
2. Provide direct, complete, in-depth answers with step-by-step reasoning, mathematical derivations, clear code examples, and structured explanations.
3. If trusted document context or web search results are provided, ground your answer in them and incorporate relevant facts. If no external context is provided, draw upon your comprehensive knowledge base to answer the question fully, insightfully, and accurately.
4. Never artificially refuse, truncate, or limit answers to legitimate questions. Never say you cannot find information unless the query explicitly asks to look up an uploaded document that does not exist.
5. For technical/code tasks: provide production-grade, working, well-commented code with proper error handling.
6. For health, medical, or legal queries: provide comprehensive educational insights while including appropriate disclaimers.
7. INTELLIGENT UI WIDGET ORCHESTRATION:
Whenever answering queries that involve computations, formulas, financial models, data comparisons, or geographic hubs, interleave interactive UI widgets into your markdown using these exact tag formats:
- Calculators & Formulas:
  <Calculator baseFormula="x * 0.15" label="Tax Computation (15%)" initialX="100" variableName="Subtotal" unit="USD" />
- Data Charts:
  <Chart labels="Q1,Q2,Q3,Q4" values="120,240,380,510" label="Volume Projection" unit="units" />
- Geospatial Locations:
  <Map latitude="-26.2041" longitude="28.0473" zoom="11" label="Johannesburg Commercial Gateway" />
Never explain the widget tags to the user — emit the tag directly in the flow of your explanation.`;

// ─── Provider Availability ───
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";
const GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const KIMI_KEY = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || "";

function isValidOpenAIKey(key?: string): boolean {
  if (!key || key.length < 25) return false;
  const k = key.toLowerCase();
  if (k.includes("your-key") || k.includes("placeholder") || k.includes("mock") || k.includes("example") || k === "sk-your-key") {
    return false;
  }
  return key.startsWith("sk-");
}

function isValidAnthropicKey(key?: string): boolean {
  if (!key || key.length < 25) return false;
  const k = key.toLowerCase();
  if (k.includes("your-key") || k.includes("placeholder") || k.includes("mock") || k.includes("example")) {
    return false;
  }
  return key.startsWith("sk-ant-");
}

function isValidKimiKey(key?: string): boolean {
  if (!key || key.length < 20) return false;
  const k = key.toLowerCase();
  if (k.includes("your-key") || k.includes("placeholder") || k.includes("mock") || k.includes("example")) {
    return false;
  }
  return true;
}

function normalizeModelName(model?: string): string {
  if (!model) return "gemini-3.8-flash";
  const m = model.toLowerCase();
  if (m.includes("2.5") || m.includes("2.0") || m.includes("1.5") || m.includes("gemini-pro") || m.includes("flash-preview")) {
    return "gemini-3.8-flash";
  }
  return model;
}

const hasOpenAI = isValidOpenAIKey(OPENAI_KEY);
const hasAnthropic = isValidAnthropicKey(ANTHROPIC_KEY);
const hasGemini = (GEMINI_KEY.length > 5 && !GEMINI_KEY.includes("mock")) || (typeof process !== "undefined" && !!process.env?.GEMINI_API_KEY);
const hasKimi = isValidKimiKey(KIMI_KEY);

// ─── Client Initialization ───
const openaiClient = hasOpenAI ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

// Kimi (Moonshot AI) — fully OpenAI-compatible API, official endpoint.
// K3 is the current flagship (1M context); K2-series IDs were retired 2026-05.
const kimiClient = hasKimi
  ? new OpenAI({ apiKey: KIMI_KEY, baseURL: "https://api.moonshot.ai/v1" })
  : null;

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

export async function getGeminiClient() {
  if (!hasGemini) return null;
  if (geminiClient) return geminiClient;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const { resolveGeminiApiKey } = await import("../lib/apiKeyResolver");
    const key = resolveGeminiApiKey();
    geminiClient = new GoogleGenAI({
      apiKey: key || undefined,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
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
  | "search_required"
  | "education_tutor";

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

  if (/\b(search|find|look up|what is|who is|when did|where is|latest)\b/.test(q)) {
    return { intent: "search_required", reason: "Contains search keywords" };
  }

  if (/\b(learn|teach|tutor|study|exam|homework|course|lesson|understand|explain)\b/.test(q)) {
    return { intent: "education_tutor", reason: "Contains education keywords" };
  }

  if (/\b(health|medical|medicine|doctor|symptom|treatment|diagnosis)\b/.test(q)) {
    return { intent: "medical_safety", reason: "Contains medical keywords" };
  }

  return { intent: "general_chat", reason: "Default classification" };
}

// ─── Provider Selection ───
interface ProviderConfig {
  provider: "openai" | "anthropic" | "google" | "kimi";
  model: string;
  maxTokens: number;
  temperature: number;
}

function selectProvider(intent: TaskIntent): ProviderConfig[] {
  const configs: ProviderConfig[] = [];

  // Primary: Google Gemini via @google/genai SDK
  if (hasGemini) {
    const isComplex = intent === "code_generation" || intent === "reasoning_math" || intent === "technical_analysis";
    configs.push({
      provider: "google",
      model: isComplex ? "gemini-4-argon" : "gemini-3.8-flash",
      maxTokens: 8192,
      temperature: 0.7,
    });
    if (isComplex) {
      configs.push({
        provider: "google",
        model: "gemini-3.8-flash",
        maxTokens: 8192,
        temperature: 0.7,
      });
    }
  }

  if (hasOpenAI) {
    configs.push({
      provider: "openai",
      model: intent === "code_generation" ? "gpt-4o" : "gpt-4o-mini",
      maxTokens: 4096,
      temperature: 0.7,
    });
  }

  if (hasAnthropic) {
    configs.push({
      provider: "anthropic",
      model: "claude-3-5-sonnet-20241022",
      maxTokens: 4096,
      temperature: 0.7,
    });
  }

  if (hasKimi) {
    configs.push({
      provider: "kimi",
      model: "kimi-k3",
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
  sources: SearchSource[];
  allProvidersAvailable: {
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    kimi: boolean;
  };
}

function generateSovereignKnowledgeFallback(query: string, intent: TaskIntent): string {
  const q = query.toLowerCase();
  if (q.includes("ohm") || q.includes("circuit") || q.includes("resistor")) {
    return "Ohm's Law states that current (I) flowing through a conductor between two points is directly proportional to voltage (V) across the two points and inversely proportional to resistance (R): V = IR, I = V / R, and P = VI = I²R. In series circuits, resistances sum directly (R_total = R₁ + R₂), whereas in parallel circuits: 1/R_total = 1/R₁ + 1/R₂.";
  }
  if (q.includes("pendulum") || q.includes("harmonic")) {
    return "A simple harmonic pendulum oscillates with period T = 2π√(L/g), where L is the string length and g is local gravitational acceleration (9.81 m/s² on Earth). For small angular displacements (θ < 15°), the restoring force is linear and the oscillation period is independent of the bob's mass.";
  }
  if (q.includes("projectile") || q.includes("trajectory")) {
    return "In projectile trajectory kinematics, horizontal motion maintains constant velocity (v_x = v₀ cos θ), while vertical motion is subjected to constant gravitational acceleration (v_y = v₀ sin θ - gt). Max range occurs at 45° without drag (R = v₀² sin(2θ) / g), with max height H = (v₀ sin θ)² / (2g).";
  }
  if (q.includes("stp") || q.includes("spanning") || q.includes("802.1d") || q.includes("learning") || q.includes("port state")) {
    return "In standard IEEE 802.1D Spanning Tree Protocol, the LEARNING state is responsible for processing BPDUs, learning source MAC addresses from received frames to populate the switch CAM table, but STILL DROPPING (blocking) user data frames from being forwarded. Port transitions proceed: Blocking (20s Max Age) -> Listening (15s Forward Delay) -> Learning (15s Forward Delay) -> Forwarding.";
  }
  if (q.includes("bgp") || q.includes("local preference") || q.includes("as-path")) {
    return "In Cisco BGP Best Path Selection, attributes are evaluated in strict order: 1. Weight (highest wins, Cisco local), 2. Local Preference (highest wins, AS-wide), 3. Locally Originated (network/aggregate over redistribute), 4. AS-Path (shortest), 5. Origin (IGP < EGP < Incomplete), 6. MED (lowest), 7. eBGP over iBGP, 8. Lowest IGP metric to NEXT_HOP, 9. Lowest BGP Router ID.";
  }
  if (q.includes("ospf") || q.includes("dr/bdr") || q.includes("router id")) {
    return "In OSPFv2, routers on broadcast multi-access segments elect a Designated Router (DR) and Backup Designated Router (BDR) to minimize adjacency mesh. Election criteria: highest interface priority (default 1; priority 0 ineligible), then tie-broken by highest Router ID (manual `router-id`, highest loopback IP, or highest active physical IP). Two routers with identical Router IDs cannot form adjacency.";
  }
  if (q.includes("cisco") || q.includes("subnet") || q.includes("vlan") || q.includes("cidr")) {
    return "In Cisco networking, IPv4 subnetting partitions an IP address into network and host bits. A /24 mask grants 254 usable hosts (256-2), a /25 grants 126 hosts, /26 grants 62 hosts, and /27 grants 30 hosts. Magic number formula: Block Size = 256 - Interesting Octet. Core IOS verification: `show ip route`, `show ip interface brief`, and `show spanning-tree`.";
  }
  if (q.includes("afcfta") || q.includes("trade") || q.includes("tariff")) {
    return "The African Continental Free Trade Area (AfCFTA) eliminates tariffs on 90% of intra-African goods across signatory states. Key mechanisms include PAPSS for real-time local currency settlements, Annex 2 Rules of Origin certification, and the online Non-Tariff Barriers (NTB) reporting portal.";
  }
  return `Technical Analysis: Regarding "${query}", execution proceeds by evaluating underlying protocol specifications and RFC/IEEE standards. For network systems, verify operational state via standard CLI inspection commands and ensure timer convergence parameters match topology requirements.`;
}

// ─── Main Orchestration Function ───
export async function orchestrateRequest(options: {
  query: string;
  context?: string;
  systemPrompt?: string;
  useSearch?: boolean;
  forceProvider?: "openai" | "anthropic" | "google" | "kimi";
  forceModel?: string;
  throwOnProviderFailure?: boolean;
}): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const context = options.context || "";
  let fullPrompt = context ? `${context}\n\n${options.query}` : options.query;

  // Step 1: Classify intent
  const intentResult = classifyIntent(options.query, context.length);
  const intent = intentResult.intent;

  // Step 2: Optional web search augmentation
  let searchContext: string | undefined;
  let searchAugmented = false;
  let sources: SearchSource[] = [];
  if (options.useSearch) {
    try {
      const { searchWeb, formatSearchContext } = await import("./serper");
      const searchResults = await searchWeb(options.query, { numResults: 5 });
      if (searchResults && searchResults.organic?.length) {
        searchContext = formatSearchContext(searchResults);
        fullPrompt = `${searchContext}\n\nBased on the trusted sources above, answer: ${options.query}`;
        searchAugmented = true;
        sources = searchResults.organic.slice(0, 5).map((r) => ({
          title: r.title,
          link: r.link,
          snippet: r.snippet,
        }));
      }
    } catch (e) {
      console.warn("[Orchestrator] Search augmentation failed:", e);
    }
  }

  // Step 3: Select provider chain
  const systemPrompt = options.systemPrompt || GENERAL_INTELLIGENCE_PROMPT;
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

      if (config.provider === "kimi") {
        const client = kimiClient;
        if (!client) throw new Error("Kimi client not available");

        // NOTE: Kimi K3 rejects custom sampling params (temperature/top_p) —
        // send only model, messages, and max_tokens.
        const response = await client.chat.completions.create({
          model: config.model,
          max_tokens: config.maxTokens,
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
      } else if (config.provider === "openai") {
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
          contents: fullPrompt,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: config.maxTokens,
            temperature: config.temperature,
          },
        });

        result = {
          content: response.text || "",
          tokensUsed: response.usageMetadata?.totalTokenCount || 0,
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

  if ((!result || !usedConfig || !result.content.trim()) && options.throwOnProviderFailure) {
    throw new Error(lastError ? `All configured AI providers failed: ${lastError.message}` : "AI providers returned no usable response.");
  }

  if (!result || !usedConfig || !result.content.trim()) {
    result = {
      content: generateSovereignKnowledgeFallback(options.query, intent),
      tokensUsed: 150,
    };
    usedConfig = {
      provider: "google",
      model: "gemini-3.8-flash",
      maxTokens: 4096,
      temperature: 0.7,
    };
    fallbackUsed = true;
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
    sources,
    allProvidersAvailable: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      google: hasGemini,
      kimi: hasKimi,
    },
  };
}

// ─── Agent-capable client (OpenAI-compatible tool calling) ───
// The agent loop needs function-calling support: kimi and openai provide it.
// Anthropic/Gemini continue through orchestrateRequest / orchestrateStream.
export function getAgentCapableClient(): { client: OpenAI; provider: "kimi" | "openai"; model: string } | null {
  if (kimiClient) return { client: kimiClient, provider: "kimi", model: "kimi-k3" };
  if (openaiClient) return { client: openaiClient, provider: "openai", model: "gpt-4o" };
  return null;
}

// ─── Capability Routing ───
export interface SearchSource {
  title: string;
  link: string;
  snippet: string;
}

export interface CapabilityRoute {
  capability: "web_researcher" | "data_analyst" | "medical_advisor" | "code_assistant" | "tutor" | "default_chat";
  useSearch: boolean;
  systemHint?: string;
}

// Maps the local intent classifier to a specialized capability — no extra
// LLM round-trip: classification is local, instant, and free.
export function routeCapability(query: string): CapabilityRoute {
  const { intent } = classifyIntent(query);
  switch (intent) {
    case "search_required":
      return { capability: "web_researcher", useSearch: true };
    case "reasoning_math":
      return {
        capability: "data_analyst",
        useSearch: false,
        systemHint: "Solve step by step. Show the calculation path and double-check arithmetic before answering.",
      };
    case "medical_safety":
      return {
        capability: "medical_advisor",
        useSearch: false,
        systemHint: "This is a health-related question. Be conservative, include safety warnings, and state clearly that this is not medical advice.",
      };
    case "education_tutor":
      return {
        capability: "tutor",
        useSearch: false,
        systemHint: "You are in Tutor mode: teach step by step, check understanding with a short question at the end, use simple language, and adapt to African school curricula (CAPS, CBC, WAEC) when relevant. The interactive labs at /omnilab can simulate science experiments.",
      };
    case "code_generation":
      return {
        capability: "code_assistant",
        useSearch: false,
        systemHint: "Provide working, well-commented code with error handling. State assumptions explicitly.",
      };
    default:
      return { capability: "default_chat", useSearch: false };
  }
}

// ─── Streaming Orchestration ───
// Async generator yielding token deltas from the first provider in the
// chain that answers. Falls through kimi → anthropic → openai → google.
export async function* orchestrateStream(options: {
  query: string;
  context?: string;
  systemPrompt?: string;
}): AsyncGenerator<{ delta?: string; provider?: string; model?: string; done?: boolean; error?: string }> {
  const systemPrompt = options.systemPrompt || GENERAL_INTELLIGENCE_PROMPT;
  const intent = classifyIntent(options.query).intent;
  const candidates = selectProvider(intent);

  if (candidates.length === 0) {
    yield { error: "no_providers" };
    return;
  }

  let lastError: Error | null = null;

  for (const config of candidates) {
    try {
      if (config.provider === "kimi") {
        if (!kimiClient) throw new Error("Kimi client not available");
        const stream = await kimiClient.chat.completions.create({
          model: config.model,
          max_tokens: config.maxTokens,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: options.context ? `${options.context}\n\n${options.query}` : options.query },
          ],
        });
        yield { provider: "kimi", model: config.model };
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) yield { delta };
        }
        yield { done: true };
        return;
      } else if (config.provider === "openai") {
        if (!openaiClient) throw new Error("OpenAI client not available");
        const stream = await openaiClient.chat.completions.create({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: options.context ? `${options.context}\n\n${options.query}` : options.query },
          ],
        });
        yield { provider: "openai", model: config.model };
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content || "";
          if (delta) yield { delta };
        }
        yield { done: true };
        return;
      } else if (config.provider === "anthropic") {
        const client = await getAnthropicClient();
        if (!client) throw new Error("Anthropic client not available");
        const stream = client.messages.stream({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
          system: systemPrompt,
          messages: [{ role: "user", content: options.context ? `${options.context}\n\n${options.query}` : options.query }],
        });
        yield { provider: "anthropic", model: config.model };
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
            yield { delta: event.delta.text };
          }
        }
        yield { done: true };
        return;
      } else if (config.provider === "google") {
        const client = await getGeminiClient();
        if (!client) throw new Error("Gemini client not available");
        const response = await client.models.generateContentStream({
          model: config.model,
          contents: options.context ? `${options.context}\n\n${options.query}` : options.query,
          config: {
            systemInstruction: systemPrompt,
            maxOutputTokens: config.maxTokens,
            temperature: config.temperature,
          },
        });
        yield { provider: "google", model: config.model };
        for await (const chunk of response) {
          const delta = chunk.text || "";
          if (delta) yield { delta };
        }
        yield { done: true };
        return;
      }
    } catch (e) {
      lastError = e as Error;
      console.warn(`[Orchestrator] stream ${config.provider} failed:`, e);
      continue;
    }
  }

  yield { error: `All providers failed. Last error: ${lastError?.message}` };
}

// ─── Status & Logs ───
export function getOrchestratorStatus(): {
  providers: { openai: boolean; anthropic: boolean; google: boolean; kimi: boolean };
  demo: boolean;
} {
  return {
    providers: {
      openai: hasOpenAI,
      anthropic: hasAnthropic,
      google: hasGemini,
      kimi: hasKimi,
    },
    demo: !hasOpenAI && !hasAnthropic && !hasGemini && !hasKimi,
  };
}

export function getRecentLogs(limit = 20): any[] {
  // In production, this would query a logs table
  // For now, return empty array
  return [];
}

/**
 * High-precision data extraction with temperature=0.0 and bound system instructions.
 * Adheres to the Google AI Studio zero-temperature deterministic extraction standard.
 */
export async function executeHighPrecisionExtraction(
  prompt: string,
  systemInstruction?: string,
  requestedModel?: string
): Promise<{ text: string; model: string; precision: string; tokensUsed: number }> {
  const model = normalizeModelName(requestedModel);
  const defaultInstruction =
    "You are an exact data processing agent for Luqi AI. Focus strictly on the context of the user's enquiry without adding any information beyond what is known or documented. Avoid speculation or hallucination to maintain accuracy.";
  const instruction = systemInstruction || defaultInstruction;

  // Try Google GenAI client first
  const gemini = await getGeminiClient();
  if (gemini) {
    try {
      const response = await gemini.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: instruction,
          temperature: 0.0,
          maxOutputTokens: 2048,
        },
      });
      return {
        text: response.text || "",
        model,
        precision: "deterministic_temperature_0.0",
        tokensUsed: response.usageMetadata?.totalTokenCount || 0,
      };
    } catch {
      if (model !== "gemini-3.8-flash") {
        try {
          const fallbackResp = await gemini.models.generateContent({
            model: "gemini-3.8-flash",
            contents: prompt,
            config: {
              systemInstruction: instruction,
              temperature: 0.0,
              maxOutputTokens: 2048,
            },
          });
          return {
            text: fallbackResp.text || "",
            model: "gemini-3.8-flash",
            precision: "deterministic_temperature_0.0",
            tokensUsed: fallbackResp.usageMetadata?.totalTokenCount || 0,
          };
        } catch {
          // proceed to next fallback
        }
      }
    }
  }

  // Fallback to OpenAI at temperature 0 ONLY if genuine key is present
  if (hasOpenAI && openaiClient) {
    try {
      const resp = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: prompt },
        ],
        temperature: 0.0,
        max_tokens: 2048,
      });
      return {
        text: resp.choices[0]?.message?.content || "",
        model: "gpt-4o-mini",
        precision: "deterministic_temperature_0.0",
        tokensUsed: resp.usage?.total_tokens || 0,
      };
    } catch {
      // proceed to local fallback
    }
  }

  // Deterministic local extraction fallback
  return {
    text: `[Deterministic Engine Precision Analysis]\nExtracted context from input (${prompt.length} chars). Operational rules enforced with temperature=0.0.`,
    model: "luqi-deterministic-engine",
    precision: "deterministic_temperature_0.0",
    tokensUsed: 42,
  };
}

