/**
 * Keep companion context deterministic and bounded. These helpers do not access
 * the database; ownership must be enforced before retrieving their inputs.
 */
export type CompanionTurn = { role: "user" | "assistant" | "system"; content: string };
export type CompanionMemory = { content: string; importance?: string | number | null; category?: string | null };

export function formatCompanionHistory(messages: CompanionTurn[], maxTurns = 20): string {
  return messages.slice(-Math.max(0, Math.min(50, Math.trunc(maxTurns))))
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => `${message.role === "assistant" ? "Assistant" : "User"}: ${message.content}`)
    .join("\n");
}

export function selectRelevantCompanionMemories(
  memories: CompanionMemory[], query: string, limit = 10,
): CompanionMemory[] {
  const terms = new Set((query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []));
  return memories.filter((memory) => typeof memory.content === "string" && memory.content.trim().length > 0).map((memory, index) => {
    const content = `${memory.category || ""} ${memory.content}`.toLowerCase();
    const matches = [...terms].filter((term) => content.includes(term)).length;
    const importance = Math.min(10, Math.max(0, Number(memory.importance) || 0));
    return { memory, index, score: matches * 20 + importance };
  }).sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, Math.max(0, Math.min(20, Math.trunc(limit)))).map(({ memory }) => memory);
}
