import { beforeAll, expect, it } from "vitest";
import RELEASE_SYNC from "@jitl/quickjs-wasmfile-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  type QuickJSWASMModule,
} from "quickjs-emscripten-core";
import {
  allDraftTestsPass,
  checkedDraftReport,
  DRAFT_CASES,
  parseAiDraft,
  REFERENCE_DRAFT,
  sourceDigest,
} from "../src/features/devsecnet/draft-contract";
import { executeDraft } from "../src/features/devsecnet/draft-runner";
let module: QuickJSWASMModule;
beforeAll(async () => {
  module = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC);
});
const run = async (code: string) =>
  executeDraft(module, code, await sourceDigest(code));
it("executes the real interpreter and verifies the exact integer contract", async () => {
  const report = await run(REFERENCE_DRAFT);
  expect(allDraftTestsPass(report)).toBe(true);
  expect(report.rows).toHaveLength(DRAFT_CASES.length);
  expect(JSON.parse(report.rows[0].actual!)).toEqual({
    contributionCents: 1500,
    revenueCents: 250000,
    profitCents: 50000,
    breakEvenUnits: 67,
  });
  expect(report.rows.filter((x) => x.outcome === "throw")).toHaveLength(5);
  expect(checkedDraftReport(report, report.digest)).toEqual(report);
});
it("fails broken arithmetic, promises, malformed source and forged reports", async () => {
  for (const code of [
    REFERENCE_DRAFT.replace("priceCents * units", "priceCents + units"),
    "function solve(){return Promise.resolve({});}",
    "function solve( {",
    "function solve(){return {passed:true};}",
  ])
    expect(allDraftTestsPass(await run(code))).toBe(false);
  const report = await run(REFERENCE_DRAFT);
  expect(() => checkedDraftReport(report, "0".repeat(64))).toThrow();
  expect(() =>
    checkedDraftReport(
      { ...report, rows: [...report.rows].reverse() },
      report.digest,
    ),
  ).toThrow();
  expect(() =>
    checkedDraftReport(
      { ...report, rows: report.rows.map((x) => ({ ...x, passed: true })) },
      report.digest,
    ),
  ).toThrow();
});
it("interrupts infinite guest code and contains memory exhaustion", async () => {
  const start = Date.now(),
    loop = await run("function solve(){while(true){}}");
  expect(loop.rows.every((x) => x.outcome === "limit")).toBe(true);
  expect(Date.now() - start).toBeLessThan(8000);
  const memory = await run(
    "function solve(){const values=[];while(true)values.push(new Array(10000).fill(1));}",
  );
  expect(allDraftTestsPass(memory)).toBe(false);
  expect(memory.rows.every((x) => x.outcome !== "value")).toBe(true);
  // A failed guest cannot poison the next runtime or retain globals.
  expect(allDraftTestsPass(await run(REFERENCE_DRAFT))).toBe(true);
}, 12000);
it("exposes no host I/O, parent messaging or module loader and isolates each case", async () => {
  const probe = `if (['fetch','XMLHttpRequest','WebSocket','document','localStorage','postMessage','process','require'].some(k=>typeof globalThis[k]!=='undefined')) throw Error('host API exposed');\nif(globalThis.seen)throw Error('state leaked');globalThis.seen=true;\n${REFERENCE_DRAFT}`;
  expect(allDraftTestsPass(await run(probe))).toBe(true);
  expect(
    allDraftTestsPass(
      await run(
        'import {readFile} from "node:fs"; function solve(){return readFile("x");}',
      ),
    ),
  ).toBe(false);
});
it("accepts only a bounded structured AI draft without executing it", () => {
  expect(
    parseAiDraft(
      JSON.stringify({ code: REFERENCE_DRAFT, explanation: "Review me." }),
    ).code,
  ).toBe(REFERENCE_DRAFT);
  expect(
    parseAiDraft(
      "```json\n" +
        JSON.stringify({ code: "function solve(){}", explanation: "" }) +
        "\n```",
    ).code,
  ).toBe("function solve(){}");
  for (const text of [
    "plain prose",
    '{"code":"x","explanation":"", "tested":true}',
    JSON.stringify({ code: "x".repeat(14001), explanation: "" }),
  ])
    expect(() => parseAiDraft(text)).toThrow();
});
