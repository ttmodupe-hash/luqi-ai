from pathlib import Path
import hashlib

EXPECTED = {
'api/adaptive.ts':'35cc074e6f99a0ef9426ca7342048c45ee76b2453f1ae88ad4cdaae614f93755',
'api/guardian.ts':'59fabaa3b2f3e133c2ab9cb4d4525aa84744e55c62a2d4cce61e3c6a03858263',
'api/knowledge.ts':'d3202e3f2ba324947a8815bdf65eecda6ab4a5fd5b0be8ed0af281aabb6eb3fb',
'api/rest-compat.ts':'4a81ddff7604014fc12db683abfbb65a48dd07a665bbdfcc811c2ff85e75fa11',
'api/search.ts':'07afa39fee4578277d107ab37186f9f2789ea172b1205e8a251f1e87ca8e60f7',
'api/self-healing.ts':'ff32ec21e92f07f5e155e7dde4ad98982422598ac4eec5351a061dbbded18d1d',
'api/services/agent.ts':'83997b07180824b5b2a5a98ec4e65d79cc238651f8dd6df3d78f453d2b1c0417',
'api/services/orchestrator.ts':'41b126b41271aa8e4b5f1c5135f3803c54cbfbececddc16b16cc8376253188c6',
'api/services/session.ts':'d62d9d02f9bdfea5d60b31742cb977bc5995f15a95944e7f8faca616efe51de9',
'api/video.ts':'4d45dd90de85edfe845679a72d1a57b7a371cb9de72089802fc995e0c55be196',
}
texts = {}
for name, digest in EXPECTED.items():
    data = Path(name).read_bytes()
    assert hashlib.sha256(data).hexdigest() == digest, f'Source changed; review before editing {name}'
    texts[name] = data.decode()

def replace(name, before, after, count=1):
    assert texts[name].count(before) == count, f'Unexpected patch context: {name}: {before[:70]}'
    texts[name] = texts[name].replace(before, after)

replace('api/adaptive.ts', 'const recent = await db', 'const recent: Array<{ labSlug: string | null; avgScore: number | string | null; attempts: number }> = await db')
replace('api/adaptive.ts', '(r.avgScore ?? 0) < 60', 'Number(r.avgScore ?? 0) < 60')
replace('api/adaptive.ts', 'completed: input.completed ? 1 : 0,', 'completed: input.completed,')
for name, count in [('api/guardian.ts',1),('api/self-healing.ts',6),('api/video.ts',1)]:
    texts[name] = 'import { readSqlCount } from "./lib/queryResults";\n' + texts[name]
    replace(name, '.then((r) => Number(r[0]?.count ?? 0))', '.then(readSqlCount)', count)
replace('api/knowledge.ts', 'const articles = await db', 'const articles: Array<typeof knowledgeArticles.$inferSelect> = await db')
replace('api/rest-compat.ts', 'orchestrateRequest, orchestrateStream,', 'orchestrateRequest,')
replace('api/rest-compat.ts', 'import { streamSSE } from "hono/streaming";\n', '')
text = texts['api/rest-compat.ts']
start = text.index('// ─── SSE STREAMING CHAT')
end = text.index('// ─── STATUS', start)
old = text[start:end]
assert old.count('restCompat.post(') == 1 and old.count('sessionId') == 5
texts['api/rest-compat.ts'] = text[:start] + '''// The old stream has no authenticated owner/budget boundary. Reject here as
// well as in boot middleware; never restore ownerless session/cache access.
restCompat.post("/api/v25/ai-brain/stream", (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ status: "unavailable", code: "AI_LEGACY_ROUTE_DISABLED",
    message: "This legacy AI capability is not yet connected to the budgeted gateway." }, 503);
});

''' + text[end:]
replace('api/rest-compat.ts', 'const rows = await db\n      .select()\n      .from(knowledgeArticles)', 'const rows: Array<typeof knowledgeArticles.$inferSelect> = await db\n      .select()\n      .from(knowledgeArticles)', 2)
replace('api/rest-compat.ts', 'const rows = await db.select({ category: knowledgeArticles.category }).from(knowledgeArticles);', 'const rows: Array<Pick<typeof knowledgeArticles.$inferSelect, "category">> = await db.select({ category: knowledgeArticles.category }).from(knowledgeArticles);')
replace('api/rest-compat.ts', '      context,\n      taskType: "technical"', '      context')
replace('api/search.ts', '{ num:', '{ numResults:', 5)
replace('api/self-healing.ts', 'eq(errorLogs.resolved, 1)', 'eq(errorLogs.resolved, true)')
replace('api/self-healing.ts', 'eq(systemMetrics.isAnomaly, 1)', 'eq(systemMetrics.isAnomaly, true)')
replace('api/self-healing.ts', '.set({ resolved: 1,', '.set({ resolved: true,')
replace('api/self-healing.ts', 'eq(benchmarkFeeds.processed, input.status === "processed" ? 1 : 0)', 'eq(benchmarkFeeds.processed, input.status === "processed")')
replace('api/self-healing.ts', 'const rows = await db\n        .select({ status: healingPatches.status, count: count() })', 'const rows: Array<{ status: typeof healingPatches.$inferSelect["status"]; count: number | string }> = await db\n        .select({ status: healingPatches.status, count: count() })')
replace('api/services/agent.ts', '''    // Execute each tool call for real, then re-invoke with results
    messages.push(message as ChatCompletionMessageParam);
    for (const toolCall of message.tool_calls) {''', '''    // Validate the complete batch before any tool side effect. The SDK also
    // models custom tool calls; these are not in LUQI's function registry.
    const toolCalls = message.tool_calls.map((call) => {
      if (call.type !== "function") throw new Error("Unsupported agent tool call type");
      return call;
    });
    messages.push(message as ChatCompletionMessageParam);
    for (const toolCall of toolCalls) {''')
replace('api/services/orchestrator.ts', 'options.systemPrompt || ANTI_HALLUCINATION_PROMPT', 'options.systemPrompt || GENERAL_INTELLIGENCE_PROMPT')
replace('api/services/session.ts', 'const rows = await db', 'const rows: Array<Pick<typeof chatSessions.$inferSelect, "role" | "content">> = await db')
replace('api/services/session.ts', '''return rows.slice(-limit).map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));''', '''return rows.slice(-limit).flatMap((r): SessionTurn[] =>
      r.role === "user" || r.role === "assistant" ? [{ role: r.role, content: r.content }] : []);''')
for name, text in texts.items():
    Path(name).write_text(text)
    print('Patched', name)
