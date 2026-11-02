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
  it("removes only an explicitly confirmed terminal record with no automatic retry", async () => {
    const request = vi.fn().mockResolvedValueOnce(reply({ removed: true, id: taskId }))
      .mockResolvedValueOnce(reply({ removed: true, id: "ba9c1eb2-62f6-45fb-b7f9-a989521270ae" }));
    const api = omegaClient("fixture-token", request);
    await expect(api.removeFinished(taskId)).resolves.toEqual({ removed: true, id: taskId });
    expect(request.mock.calls[0][0]).toBe(`/api/v1/omega/tasks/${taskId}/remove`);
    expect(request.mock.calls[0][1]).toMatchObject({
      method: "POST", cache: "no-store", credentials: "omit", redirect: "error",
      headers: { Authorization: "Bearer fixture-token" },
      body: '{"confirm":true}',
    });
    await expect(api.removeFinished(taskId)).rejects.toThrow();
    expect(() => api.removeFinished("../someone")).toThrow();
    expect(request).toHaveBeenCalledTimes(2);
    const lost = vi.fn().mockRejectedValue(new TypeError("Request lost"));
    await expect(omegaClient("fixture-token", lost).removeFinished(taskId)).rejects.toThrow();
    expect(lost).toHaveBeenCalledTimes(1);
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

describe("reviewed Omega submissions", () => {
  const input = { handler: "travel.budget" as const, payload: task.payload, idempotencyKey: "synthetic-request-0001" };
  it("sends only allowlisted inputs to the owned queue with private HTTP settings", async () => {
    const request = vi.fn().mockResolvedValue(reply({ created: true, task }, 201));
    expect(await omegaClient("fixture-token", request).submit(input)).toEqual({ created: true, task });
    expect(request).toHaveBeenCalledExactlyOnceWith("/api/v1/omega/tasks", expect.objectContaining({
      method: "POST", cache: "no-store", credentials: "omit", redirect: "error",
      headers: { Authorization: "Bearer fixture-token", "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }));
  });
  for (const fixture of contracts.filter(item => item.valid)) {
    it("accepts supported submission inputs: " + fixture.name, async () => {
      const request = vi.fn().mockResolvedValue(reply({ created: true,
        task: { ...task, handler: fixture.handler, payload: fixture.payload } }));
      await expect(omegaClient("token", request).submit({
        handler: fixture.handler, payload: fixture.payload, idempotencyKey: "synthetic-request-0001",
      } as never)).resolves.toMatchObject({ created: true });
    });
  }
  it.each([
    { ...input, handler: "shell.exec" },
    { ...input, idempotencyKey: "short" },
    { ...input, ownerId: 99 },
    ...["1e2", "-1", "01", "1.234", ""].map(value => ({ ...input, payload: { currency: "ZAR", amounts: [value] } })),
    { ...input, payload: { currency: "ZAR", amounts: Array(51).fill("1") } },
    { ...input, payload: { currency: "ZAR", amounts: ["1"], command: "run" } },
    { ...input, payload: { currency: "TOOLONG", amounts: ["1"] } },
  ])("rejects unsupported/unbounded submissions before HTTP %#", input => {
    const request = vi.fn();
    expect(() => omegaClient("token", request).submit(input as never)).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("rejects contradictory schedule input before HTTP", () => {
    const fixture = contracts.find(item => item.name === "service schedule")!;
    const request = vi.fn(), api = omegaClient("token", request);
    for (const patch of [
      { odometerKm: -1 }, { odometerKm: 1 }, { intervalKm: 0 }, { intervalDays: 3651 },
      { today: "2100-01-01" }, { lastServiceDate: "2026-02-30" }, { lastServiceDate: "2026-12-01" },
    ]) expect(() => api.submit({ handler: "vehicle.schedule", payload: { ...fixture.payload, ...patch },
      idempotencyKey: "synthetic-request-0001" } as never)).toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it.each([
    { created: true, task: { ...task, payload: { currency: "USD", amounts: ["1"] } } },
    { created: true, task: { ...task, state: "completed", attempts: 1, result: budgetResult } },
    { created: true, task: { ...task, attempts: 1 } },
    { task },
  ])("never confirms a mismatched or contradictory submission response %#", async response => {
    const request = vi.fn().mockResolvedValue(reply(response));
    await expect(omegaClient("token", request).submit(input)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("does not retry automatically and reuses exactly the same body when explicitly called again", async () => {
    const request = vi.fn().mockRejectedValueOnce(new TypeError("Lost response"))
      .mockResolvedValueOnce(reply({ created: false, task: { ...task, state: "completed", attempts: 1, result: budgetResult } }));
    const api = omegaClient("token", request);
    await expect(api.submit(input)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
    await expect(api.submit(input)).resolves.toMatchObject({ created: false, task: { state: "completed" } });
    expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
  });
});
