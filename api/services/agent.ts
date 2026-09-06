// =====================================================================
// AGENT LOOP — real tool-calling pipeline
// The LLM decides when to call a tool; the backend executes it for real
// and re-invokes the model with the result. Only tools that genuinely
// exist are registered — nothing here fabricates a result.
//
//   execute_web_research → real Serper search
//   calculate            → sandboxed math evaluator (labs engine)
//
// Supported providers: OpenAI-compatible tool calling (kimi, openai).
// Anthropic/Gemini continue via the standard orchestrateRequest path.
// Supports multi-turn memory via the optional history parameter.
// =====================================================================

import type OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";
import { evaluateMathExpression } from "./labs/engine";

export interface AgentToolCallRecord {
  tool: string;
  arguments: Record<string, unknown>;
  ok: boolean;
}

export interface AgentResult {
  content: string;
  provider: string;
  model: string;
  toolsUsed: AgentToolCallRecord[];
  sources: { title: string; link: string; snippet: string }[];
  iterations: number;
  latencyMs: number;
}

// ── Tool registry: ONLY real capabilities ────────────────────────────

const AGENT_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "execute_web_research",
      description:
        "Search live internet sources for verified, current facts. Use for anything time-sensitive (prices, news, schedules, regulations, current rates). Returns real titles, links and snippets.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The web search query" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calculate",
      description:
        "Evaluate a mathematical expression exactly (arithmetic, powers, sqrt, trig, log). Use for any computation instead of estimating.",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Pure math expression, e.g. (185000-95750)*0.26" },
        },
        required: ["expression"],
      },
    },
  },
];

async function executeAgentTool(
  name: string,
  args: Record<string, any>,
  sourcesAcc: { title: string; link: string; snippet: string }[]
): Promise<string> {
  if (name === "execute_web_research") {
    try {
      const { searchWeb } = await import("./serper");
      const results = await searchWeb(String(args.query || ""), { numResults: 5 });
      if (!results?.organic?.length) {
        return JSON.stringify({ results: [], note: "Search unavailable or returned nothing — answer from general knowledge and say so." });
      }
      const items = results.organic.slice(0, 5);
      for (const r of items) sourcesAcc.push({ title: r.title, link: r.link, snippet: r.snippet });
      return JSON.stringify({
        results: items.map((r) => ({ title: r.title, link: r.link, snippet: r.snippet, date: r.date ?? null })),
        answerBox: results.answerBox ?? null,
      });
    } catch (e: any) {
      return JSON.stringify({ error: `web research failed: ${e?.message || e}` });
    }
  }

  if (name === "calculate") {
    try {
      const value = evaluateMathExpression(String(args.expression || ""));
      return JSON.stringify({ expression: args.expression, value });
    } catch (e: any) {
      return JSON.stringify({ error: `calculation failed: ${e?.message || e}` });
    }
  }

  return JSON.stringify({ error: `Unknown tool: ${name}` });
}

// ── Agent loop ───────────────────────────────────────────────────────

export async function orchestrateAgent(options: {
  query: string;
  systemPrompt: string;
  client: OpenAI;
  provider: string;
  model: string;
  maxIterations?: number;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<AgentResult> {
  const start = Date.now();
  const maxIterations = options.maxIterations ?? 3;
  const toolsUsed: AgentToolCallRecord[] = [];
  const sources: { title: string; link: string; snippet: string }[] = [];

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:
        options.systemPrompt +
        "\n\nYou have tools available. Call execute_web_research for any current/factual/time-sensitive claim instead of relying on memory, and calculate for any arithmetic. Never invent figures.",
    },
    ...(options.history ?? []).map((t) => ({ role: t.role, content: t.content }) as ChatCompletionMessageParam),
    { role: "user", content: options.query },
  ];

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const response = await options.client.chat.completions.create({
      model: options.model,
      messages,
      tools: AGENT_TOOLS,
      tool_choice: "auto",
    });

    const message = response.choices[0]?.message;
    if (!message) break;

    // No tool calls → final answer
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return {
        content: message.content || "",
        provider: options.provider,
        model: options.model,
        toolsUsed,
        sources,
        iterations: iteration + 1,
        latencyMs: Date.now() - start,
      };
    }

    // Execute each tool call for real, then re-invoke with results
    messages.push(message as ChatCompletionMessageParam);
    for (const toolCall of message.tool_calls) {
      const fnName = toolCall.function.name;
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch {
        args = {};
      }
      const output = await executeAgentTool(fnName, args, sources);
      toolsUsed.push({ tool: fnName, arguments: args, ok: !output.includes('"error"') });
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: output,
      });
    }
  }

  // Iteration cap reached — ask for the final answer without tools
  const finalResponse = await options.client.chat.completions.create({
    model: options.model,
    messages,
  });

  return {
    content: finalResponse.choices[0]?.message?.content || "",
    provider: options.provider,
    model: options.model,
    toolsUsed,
    sources,
    iterations: maxIterations,
    latencyMs: Date.now() - start,
  };
}
