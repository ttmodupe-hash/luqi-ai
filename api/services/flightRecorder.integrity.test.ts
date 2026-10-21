import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root = "";

async function moduleUnderTest() {
  vi.resetModules();
  return import("./flightRecorder");
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "luqi-checkpoints-"));
  vi.stubEnv("LUQI_CHECKPOINTS_DIR", root);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  fs.rmSync(root, { recursive: true, force: true });
});

describe("flight recorder integrity, restart and fail-closed behavior", () => {
  it("lists no fictional checkpoints in an empty archive", async () => {
    const recorder = await moduleUnderTest();
    expect(await recorder.listActiveThreads()).toEqual([]);
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("persists real checkpoints, restores across module restart and increments sequentially", async () => {
    const recorder = await moduleUnderTest();
    const first = await recorder.recordGraphCheckpoint({
      threadId: "trusted-session_42",
      nodeName: "authenticate",
      channelValues: { result: "accepted" },
      toolCalls: [{ toolName: "lookup", arguments: {}, result: true, durationMs: 4 }],
    });
    expect(first.step).toBe(1);
    const restored = await moduleUnderTest();
    expect((await restored.getThreadCheckpoints("trusted-session_42"))[0]).toEqual(first);
    const second = await restored.recordGraphCheckpoint({
      threadId: "trusted-session_42",
      nodeName: "complete",
      channelValues: { reviewed: false },
    });
    expect(second.step).toBe(2);
    const list = await restored.listActiveThreads();
    expect(list).toEqual([
      expect.objectContaining({
        threadId: "trusted-session_42",
        totalSteps: 2,
        lastNode: "complete",
        toolCallsCount: 1,
      }),
    ]);
  });

  it("rejects traversal on writes and reads without creating an external journal", async () => {
    const recorder = await moduleUnderTest();
    for (const value of ["../outside", "../../tmp", "bad/name", "bad\\name", ""]) {
      await expect(recorder.recordGraphCheckpoint({
        threadId: value, nodeName: "node", channelValues: {},
      })).rejects.toThrow("Invalid checkpoint thread identifier");
      await expect(recorder.getThreadCheckpoints(value)).rejects.toThrow("Invalid checkpoint thread identifier");
    }
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it("rejects forged checkpoint data and incomplete records", async () => {
    const recorder = await moduleUnderTest();
    await recorder.recordGraphCheckpoint({
      threadId: "tamper_target",
      nodeName: "first",
      channelValues: { grade: "unverified" },
    });
    const file = path.join(root, "tamper_target.jsonl");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("unverified", "verified"));
    await expect(recorder.getThreadCheckpoints("tamper_target")).rejects.toThrow("checksum mismatch");
    await expect(recorder.listActiveThreads()).rejects.toThrow("checksum mismatch");
    fs.writeFileSync(file, '{"checkpointId":');
    await expect(recorder.getThreadCheckpoints("tamper_target")).rejects.toThrow("incomplete");
  });

  it("rejects symlink redirects instead of writing into other files", async () => {
    const recorder = await moduleUnderTest();
    const external = path.join(root, "target.log");
    fs.writeFileSync(external, "untouched");
    fs.symlinkSync(external, path.join(root, "evil.jsonl"));
    await expect(recorder.recordGraphCheckpoint({
      threadId: "evil", nodeName: "node", channelValues: {},
    })).rejects.toThrow();
    expect(fs.readFileSync(external, "utf8")).toBe("untouched");
    await expect(recorder.getThreadCheckpoints("evil")).rejects.toThrow();
  });

  it("reads a legacy valid JSONL record but does not seed any samples", async () => {
    const timestamp = "2026-10-19T08:00:00.000Z";
    const data = {
      threadId: "real_legacy",
      step: 1,
      nodeName: "observer",
      channelValues: { observed: true },
      toolCalls: [],
      stateDiff: undefined,
      version: 1,
      timestamp,
    };
    const hash = crypto.createHash("sha256")
      .update(JSON.stringify(data)).digest("hex").slice(0, 16);
    const cp = {
      checkpointId: `chk_real_legacy_step1_${hash.slice(0, 8)}`,
      ...data,
      hash,
    };
    fs.writeFileSync(path.join(root, "real_legacy.jsonl"), JSON.stringify(cp) + "\n");
    const recorder = await moduleUnderTest();
    expect(await recorder.getThreadCheckpoints("real_legacy")).toEqual([cp]);
    expect((await recorder.listActiveThreads())[0].threadId).toBe("real_legacy");
  });

  it("rejects unpersistable paths instead of inventing a stored record", async () => {
    const blocker = path.join(root, "not-a-directory");
    fs.writeFileSync(blocker, "no");
    vi.stubEnv("LUQI_CHECKPOINTS_DIR", blocker);
    const recorder = await moduleUnderTest();
    await expect(recorder.recordGraphCheckpoint({
      threadId: "safe", nodeName: "node", channelValues: {},
    })).rejects.toThrow();
    expect(fs.readFileSync(blocker, "utf8")).toBe("no");
  });
});
