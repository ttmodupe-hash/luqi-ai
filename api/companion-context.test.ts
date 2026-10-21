import { describe, expect, it } from "vitest";
import { formatCompanionHistory, selectRelevantCompanionMemories } from "./companion-context";

describe("companion context", () => {
  it("keeps only the most recent turns in chronological order", () => {
    expect(formatCompanionHistory([
      { role: "user", content: "old" },
      { role: "assistant", content: "reply" },
      { role: "user", content: "new" },
    ], 2)).toBe("Assistant: reply\nUser: new");
  });

  it("does not render system turns as user speech", () => {
    expect(formatCompanionHistory([
      { role: "system", content: "internal" },
      { role: "user", content: "hello" },
    ])).toBe("User: hello");
  });

  it("prioritizes relevant memories over unrelated high-importance ones", () => {
    const memories = [
      { content: "Enjoys astronomy", importance: 10 },
      { content: "Prefers isiZulu explanations", importance: 3 },
    ];
    expect(selectRelevantCompanionMemories(memories, "Please explain in isiZulu", 1)[0].content)
      .toBe("Prefers isiZulu explanations");
  });

  it("ignores empty memories and enforces a selection limit", () => {
    const memories = [
      { content: "" },
      { content: "Prefers Sesotho", importance: 7 },
      { content: "Enjoys science", importance: 4 },
    ];
    expect(selectRelevantCompanionMemories(memories, "Sesotho", 1))
      .toEqual([{ content: "Prefers Sesotho", importance: 7 }]);
    expect(selectRelevantCompanionMemories(memories, "Sesotho", 0)).toEqual([]);
  });

  it("does not mutate retrieved memories", () => {
    const memories = [{ content: "A", importance: 2 }, { content: "B", importance: 9 }];
    selectRelevantCompanionMemories(memories, "unrelated");
    expect(memories[0].content).toBe("A");
  });
});
