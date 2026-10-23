import { describe, expect, it, vi } from "vitest";
import { omegaClient, OmegaError } from "../src/lib/omega-tasks";
import contracts from "./fixtures/omega-web-contracts.json";
import {
  task,
  taskId,
  configured,
  disabled,
  budgetResult,
} from "./fixtures/omega-dashboard";
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });

describe("Omega dashboard HTTP boundary", () => {
  it("uses same-origin authenticated uncached requests without browser credentials or redirects", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(reply(configured))
      .mockResolvedValueOnce(reply({ tasks: [task] }))
      .mockResolvedValueOnce(reply({ task }))
      .mockResolvedValueOnce(reply({ task: { ...task, state: "cancelled" } }));
    const api = omegaClient("fixture-token", request);
    await api.status();
    await api.list(taskId);
    await api.get(taskId);
    await api.cancel(taskId);
    expect(request.mock.calls.map((call) => call[0])).toEqual([
      "/api/v1/omega/tasks/status",
      `/api/v1/omega/tasks/?limit=20&before=${taskId}`,
      `/api/v1/omega/tasks/${taskId}`,
      `/api/v1/omega/tasks/${taskId}/cancel`,
    ]);
    for (const [, options] of request.mock.calls)
      expect(options).toMatchObject({
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        headers: { Authorization: "Bearer fixture-token" },
      });
    expect(request.mock.calls.at(-1)?.[1]).toMatchObject({
      method: "POST",
      body: '{"confirm":true}',
    });
  });
  it("accepts both supported status contracts without claiming worker verification", async () => {
    for (const status of [configured, disabled])
      expect(
        await omegaClient(
          "token",
          vi.fn().mockResolvedValue(reply(status)),
        ).status(),
      ).toEqual(status);
  });
  for (const fixture of contracts.filter((item) => item.valid))
    it(`accepts real Node/Python result contract: ${fixture.name}`, async () => {
      const saved = {
        ...task,
        handler: fixture.handler,
        payload: fixture.payload,
        result: fixture.result,
        state: "completed",
        attempts: 1,
      };
      expect(
        (
          await omegaClient(
            "token",
            vi.fn().mockResolvedValue(reply({ task: saved })),
          ).get(taskId)
        ).task.result,
      ).toEqual(fixture.result);
    });
  it.each([
    { state: "completed", result: null },
    { state: "pending", result: budgetResult },
    { state: "invented" },
    { version: "web-v2" },
    { handler: "shell.exec" },
    { state: "completed", result: { ...budgetResult, currency: "USD" } },
    {
      state: "completed",
      result: { ...budgetResult, total: "<script>alert(1)</script>" },
    },
    { createdAt: "bad-date" },
    { attempts: 4 },
  ])("rejects malformed or contradictory outcomes %j", async (patch) => {
    await expect(
      omegaClient(
        "token",
        vi.fn().mockResolvedValue(reply({ task: { ...task, ...patch } })),
      ).get(taskId),
    ).rejects.toThrow();
  });
  it("binds response IDs and requires an explicit cancelled state", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        reply({
          task: { ...task, id: "ba9c1eb2-62f6-45fb-b7f9-a989521270ae" },
        }),
      )
      .mockResolvedValueOnce(reply({ task }));
    const api = omegaClient("token", request);
    await expect(api.get(taskId)).rejects.toThrow();
    await expect(api.cancel(taskId)).rejects.toThrow();
  });
  it("does not accept external paths, unbounded pages, or unverified status extensions", async () => {
    const request = vi.fn();
    const api = omegaClient("token", request);
    expect(() => api.get("https://evil.example")).toThrow();
    expect(() => api.list("../other")).toThrow();
    expect(request).not.toHaveBeenCalled();
    request
      .mockResolvedValueOnce(reply({ tasks: Array(21).fill(task) }))
      .mockResolvedValueOnce(reply({ ...configured, workerVerified: true }));
    await expect(api.list()).rejects.toThrow();
    await expect(api.status()).rejects.toThrow();
  });
  it("does not expose server errors or retry a cancellation after a lost response", async () => {
    const request = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Connection lost"));
    await expect(
      omegaClient("token", request).cancel(taskId),
    ).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    const failed = omegaClient(
      "token",
      vi.fn().mockResolvedValue(reply({ detail: "secret database info" }, 503)),
    );
    await expect(failed.status()).rejects.toEqual(new OmegaError(503));
  });
  it("aborts stalled requests after a bounded wait without retrying", async () => {
    vi.useFakeTimers();
    try {
      const request = vi.fn(
        (_url, options) =>
          new Promise<Response>((_resolve, reject) => {
            options.signal.addEventListener("abort", () =>
              reject(new Error("Aborted")),
            );
          }),
      );
      const operation = expect(
        omegaClient("token", request).status(),
      ).rejects.toThrow("Aborted");
      await vi.advanceTimersByTimeAsync(15_000);
      await operation;
      expect(request).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
