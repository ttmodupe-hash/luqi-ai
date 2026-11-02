// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render as renderUI,
  screen,
  act,
  within,
} from "@testing-library/react";
import OmegaTasksPage from "../src/pages/OmegaTasksPage";
import { CustomerSessionProvider } from "../src/providers/customer-session";
import {
  task,
  taskId,
  configured,
  disabled,
  budgetResult,
} from "./fixtures/omega-dashboard";
const render = (element: React.ReactElement) => renderUI(<CustomerSessionProvider>{element}</CustomerSessionProvider>);
const request = vi.fn();
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  request.mockReset();
  vi.stubGlobal("fetch", request);
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "b234fee0-6495-4b44-80dc-b736b3ecfbdd") });
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
async function login(availability = configured, tasks: unknown[] = [task]) {
  request
    .mockResolvedValueOnce(
      reply({
        token: "fixture-token",
        user: { email: "test@example.invalid" },
      }),
    )
    .mockResolvedValueOnce(reply(availability));
  if (availability.intake === "configured")
    request.mockResolvedValueOnce(reply({ tasks }));
  render(<OmegaTasksPage />);
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "test@example.invalid" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "fixture-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByText(
    availability.intake === "configured"
      ? /Task information refreshed/
      : "Tasks are not enabled yet",
  );
}
const taskButton = () =>
  within(screen.getByRole("region", { name: "Saved tasks" })).getByRole(
    "button",
    { name: /Travel budget/ },
  );
async function selectTask(saved = task) {
  request.mockResolvedValueOnce(reply({ task: saved }));
  fireEvent.click(taskButton());
  await screen.findByRole("button", { name: "Refresh selected task" });
}

describe("Omega task dashboard (synthetic account only)", () => {
  it("checks availability after authentication and does not query disabled storage or persist credentials", async () => {
    await login(disabled as typeof configured);
    expect(request).toHaveBeenCalledTimes(2);
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(screen.queryByRole("region", { name: "Saved tasks" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Run|Submit/ })).toBeNull();
  });
  it("only displays a completed result after the server confirms it, including no polling", async () => {
    await login();
    await selectTask();
    expect(screen.queryByText("ZAR 140.35")).toBeNull();
    let resolve!: (value: Response) => void;
    request.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Refresh selected task" }),
    );
    expect(screen.queryByText("ZAR 140.35")).toBeNull();
    await act(async () =>
      resolve(
        reply({
          task: {
            ...task,
            state: "completed",
            attempts: 1,
            result: budgetResult,
          },
        }),
      ),
    );
    await screen.findByText("ZAR 140.35");
    expect(screen.queryByRole("button", { name: "Cancel task" })).toBeNull();
    expect(request).toHaveBeenCalledTimes(5);
  });
  it("removes finished tasks only after confirmation and preserves the account boundary", async () => {
    const completed = { ...task, state: "completed", attempts: 1, result: budgetResult };
    await login(configured, [completed]);
    await selectTask(completed);
    fireEvent.click(screen.getByRole("button", { name: "Remove saved task" }));
    expect(request).toHaveBeenCalledTimes(4);
    expect(screen.getByRole("region", { name: "Confirm saved task removal" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep saved task" }));
    expect(request).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole("button", { name: "Remove saved task" }));
    request.mockResolvedValueOnce(reply({ removed: true, id: taskId }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await screen.findByText(/Finished task removed from active storage/);
    expect(screen.queryByText("ZAR 140.35")).toBeNull();
    expect(screen.queryByRole("button", { name: /Travel budget/ })).toBeNull();
    expect(request.mock.calls.at(-1)?.[0]).toBe(`/api/v1/omega/tasks/${taskId}/remove`);
    expect(request.mock.calls.at(-1)?.[1]).toMatchObject({ method: "POST", body: '{"confirm":true}' });
  });
  it("does not offer record removal on queued or uncertain tasks", async () => {
    await login();
    await selectTask(task);
    expect(screen.queryByRole("button", { name: "Remove saved task" })).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel task" })).toBeTruthy();
  });
  it("treats an unconfirmed removal as unresolved until manually refreshed", async () => {
    const completed = { ...task, state: "completed", attempts: 1, result: budgetResult };
    await login(configured, [completed]);
    await selectTask(completed);
    fireEvent.click(screen.getByRole("button", { name: "Remove saved task" }));
    request.mockRejectedValueOnce(new TypeError("response lost"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm removal" }));
    await screen.findByText(/Task removal could not be confirmed/);
    expect((taskButton() as HTMLButtonElement).disabled).toBe(true);
    expect(request.mock.calls.filter(([url]) => url === `/api/v1/omega/tasks/${taskId}/remove`)).toHaveLength(1);
    request.mockResolvedValueOnce(reply(configured)).mockResolvedValueOnce(reply({ tasks: [] }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh tasks" }));
    await screen.findByText(/Task information refreshed/);
    expect(screen.queryByRole("button", { name: /Travel budget/ })).toBeNull();
  });
  it("confirms cancellation, retains the record, and never sends a worker execution request", async () => {
    await login();
    await selectTask();
    fireEvent.click(screen.getByRole("button", { name: "Cancel task" }));
    expect(request).toHaveBeenCalledTimes(4);
    fireEvent.click(screen.getByRole("button", { name: "Keep task" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel task" }));
    let resolve!: (value: Response) => void;
    request.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );
    expect(screen.queryByText(/Task cancellation confirmed/)).toBeNull();
    await act(async () =>
      resolve(reply({ task: { ...task, state: "cancelled" } })),
    );
    await screen.findByText(/Task cancellation confirmed/);
    expect(taskButton().textContent).toContain("Cancelled");
    expect(request.mock.calls.at(-1)?.[0]).toBe(
      `/api/v1/omega/tasks/${taskId}/cancel`,
    );
  });
  it("blocks further cancellation after a lost response until history is refreshed", async () => {
    await login();
    await selectTask();
    fireEvent.click(screen.getByRole("button", { name: "Cancel task" }));
    request.mockRejectedValueOnce(new TypeError("Lost response"));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm cancellation" }),
    );
    await screen.findByText(/Cancellation could not be confirmed/);
    expect((taskButton() as HTMLButtonElement).disabled).toBe(true);
    request
      .mockResolvedValueOnce(reply(configured))
      .mockResolvedValueOnce(
        reply({ tasks: [{ ...task, state: "cancelled" }] }),
      );
    fireEvent.click(screen.getByRole("button", { name: "Refresh tasks" }));
    await screen.findByText(/Task information refreshed/);
    expect((taskButton() as HTMLButtonElement).disabled).toBe(false);
    expect(taskButton().textContent).toContain("Cancelled");
  });
  it("clears account information after credential revocation", async () => {
    await login();
    await selectTask();
    request.mockResolvedValueOnce(reply({}, 401));
    fireEvent.click(screen.getByRole("button", { name: "Refresh tasks" }));
    await screen.findByRole("button", { name: "Sign in" });
    expect(screen.queryByText(taskId)).toBeNull();
    expect(screen.queryByText("test@example.invalid")).toBeNull();
  });
  it("ignores a previous account's late response after sign-out and new sign-in", async () => {
    await login();
    let resolve!: (value: Response) => void;
    request.mockReturnValueOnce(
      new Promise<Response>((r) => {
        resolve = r;
      }),
    );
    fireEvent.click(taskButton());
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    request
      .mockResolvedValueOnce(
        reply({
          token: "second-token",
          user: { email: "second@example.invalid" },
        }),
      )
      .mockResolvedValueOnce(reply(disabled));
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "second@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "fixture-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Tasks are not enabled yet");
    await act(async () =>
      resolve(
        reply({ task: { ...task, state: "completed", result: budgetResult } }),
      ),
    );
    expect(screen.queryByText("ZAR 140.35")).toBeNull();
    expect(screen.queryByText(taskId)).toBeNull();
    expect(screen.getByText("second@example.invalid")).toBeTruthy();
  });
  it("clears old results when refresh fails and does not expose server details", async () => {
    await login();
    await selectTask({
      ...task,
      state: "completed",
      result: budgetResult,
    } as typeof task);
    request.mockResolvedValueOnce(reply({ detail: "secret SQL" }, 503));
    fireEvent.click(screen.getByRole("button", { name: "Refresh tasks" }));
    await screen.findByText(/Unable to verify task information/);
    expect(screen.queryByText("ZAR 140.35")).toBeNull();
    expect(screen.queryByText("secret SQL")).toBeNull();
  });
  it("uses bounded reference pagination without calling it chronological history", async () => {
    const tasks = Array.from({ length: 20 }, (_, i) => ({
      ...task,
      id: `${String(99 - i).padStart(8, "0")}-62f6-45fb-b7f9-a989521270ae`,
    }));
    await login(configured, tasks);
    request.mockResolvedValueOnce(reply({ tasks: [] }));
    fireEvent.click(screen.getByRole("button", { name: "More tasks" }));
    await act(async () => {});
    expect(request.mock.calls.at(-1)?.[0]).toContain(
      `before=${tasks.at(-1)?.id}`,
    );
    expect(screen.queryByRole("button", { name: "More tasks" })).toBeNull();
  });
});

async function reviewBudget() {
  fireEvent.change(screen.getByLabelText("Amounts, one per line"), { target: { value: "100.25\n40\n0.10" } });
  fireEvent.click(screen.getByRole("button", { name: "Review task" }));
  await screen.findByRole("heading", { name: "Review before queuing" });
}
function acknowledge() {
  fireEvent.click(screen.getByRole("checkbox", { name: "I understand this only queues the task." }));
}
const submissions = () => request.mock.calls.filter(([url, options]) =>
  url === "/api/v1/omega/tasks" && options.method === "POST");
describe("reviewed task intake", () => {
  it("reviews exact figures, requires confirmation and does not claim execution or send duplicate clicks", async () => {
    await login(configured, []);
    await reviewBudget();
    expect(request).toHaveBeenCalledTimes(3);
    const queue = screen.getByRole("button", { name: "Queue task" }) as HTMLButtonElement;
    expect(queue.disabled).toBe(true);
    acknowledge();
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(queue); fireEvent.click(queue);
    expect(submissions()).toHaveLength(1);
    expect(screen.queryByText(/Task saved to the queue/)).toBeNull();
    await act(async () => resolve(reply({ created: true, task }, 201)));
    await screen.findByText(/Task saved to the queue. It has not run/);
    expect(screen.queryByText("ZAR 140.35")).toBeNull();
    expect((screen.getByLabelText("Amounts, one per line") as HTMLTextAreaElement).value).toBe("");
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  });
  it("keeps an ambiguous submission immutable across refresh and retries only its original request", async () => {
    await login(configured, []);
    await reviewBudget(); acknowledge();
    request.mockRejectedValueOnce(new TypeError("Lost private SQL response"));
    fireEvent.click(screen.getByRole("button", { name: "Queue task" }));
    await screen.findByText(/Submission could not be confirmed/);
    expect(screen.queryByRole("button", { name: "Edit inputs" })).toBeNull();
    expect(screen.queryByLabelText("Amounts, one per line")).toBeNull();
    expect(screen.queryByText("Lost private SQL response")).toBeNull();
    expect(submissions()).toHaveLength(1);
    request.mockResolvedValueOnce(reply(configured)).mockResolvedValueOnce(reply({ tasks: [task] }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh tasks" }));
    await screen.findByText(/Task information refreshed/);
    expect(screen.getByRole("button", { name: "Retry same submission" })).toBeTruthy();
    request.mockResolvedValueOnce(reply({ created: false, task }));
    fireEvent.click(screen.getByRole("button", { name: "Retry same submission" }));
    await screen.findByText(/This submission already exists/);
    expect(submissions()).toHaveLength(2);
    expect(submissions()[0][1].body).toBe(submissions()[1][1].body);
  });
  it("rejects invalid decimal amounts before review or HTTP", async () => {
    await login();
    fireEvent.change(screen.getByLabelText("Amounts, one per line"), { target: { value: "1.234" } });
    fireEvent.submit(screen.getByRole("form", { name: "New calculation" }));
    await screen.findByRole("alert");
    expect(request).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("button", { name: "Queue task" })).toBeNull();
  });
  it("reviews vehicle intervals and dates without inventing a completed result", async () => {
    await login(configured, []);
    fireEvent.change(screen.getByLabelText("Calculation type"), { target: { value: "vehicle.schedule" } });
    for (const [label, value] of [
      ["Current odometer (km)", "24500"], ["Odometer at last service (km)", "16000"],
      ["Manufacturer service interval (km)", "10000"], ["Manufacturer service interval (days)", "365"],
      ["Last service date", "2026-01-01"], ["Assessment date", "2026-10-23"],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Review task" }));
    await screen.findByRole("heading", { name: "Review before queuing" });
    expect(screen.getByText("2026-01-01")).toBeTruthy();
    acknowledge();
    const payload = { odometerKm: 24500, lastServiceKm: 16000, intervalKm: 10000, intervalDays: 365,
      lastServiceDate: "2026-01-01", today: "2026-10-23" };
    request.mockResolvedValueOnce(reply({ created: true, task: { ...task, handler: "vehicle.schedule", payload } }, 201));
    fireEvent.click(screen.getByRole("button", { name: "Queue task" }));
    await screen.findByText(/Task saved to the queue/);
    expect(screen.queryByText("Service is due")).toBeNull();
    expect(JSON.parse(submissions()[0][1].body)).toMatchObject({ handler: "vehicle.schedule", payload });
  });
  it("shows only handlers confirmed by authenticated status", async () => {
    await login({ ...configured, handlers: ["vehicle.schedule"] });
    expect(screen.queryByRole("option", { name: "Travel budget" })).toBeNull();
    expect(screen.getByRole("option", { name: "Vehicle service schedule" })).toBeTruthy();
  });
  it("discards late submission responses after signing out", async () => {
    await login(configured, []);
    await reviewBudget(); acknowledge();
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Queue task" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => resolve(reply({ created: true, task }, 201)));
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(screen.queryByText(taskId)).toBeNull();
    expect(screen.queryByText(/Task saved to the queue/)).toBeNull();
  });
  it("does not confirm contradictory responses or silently replace the request reference", async () => {
    await login(configured, []);
    await reviewBudget(); acknowledge();
    request.mockResolvedValueOnce(reply({ created: true, task: { ...task, payload: { currency: "USD", amounts: ["1"] } } }));
    fireEvent.click(screen.getByRole("button", { name: "Queue task" }));
    await screen.findByText(/Submission could not be confirmed/);
    expect(screen.queryByText(/Task saved to the queue/)).toBeNull();
    expect(submissions()).toHaveLength(1);
  });
  it("shows login retry advice without echoing diagnostics or persisting a password", async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify({ detail: "private diagnostic" }), {
      status: 429, headers: { "Retry-After": "117" },
    }));
    render(<OmegaTasksPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText(/Wait 117 seconds/);
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(screen.queryByText("private diagnostic")).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
});

it("disables retry if refreshed authenticated status withdraws the reviewed handler", async () => {
  await login(configured, []);
  await reviewBudget(); acknowledge();
  request.mockRejectedValueOnce(new TypeError("Lost response"));
  fireEvent.click(screen.getByRole("button", { name: "Queue task" }));
  await screen.findByText(/Submission could not be confirmed/);
  request.mockResolvedValueOnce(reply({ ...configured, handlers: ["vehicle.schedule"] }))
    .mockResolvedValueOnce(reply({ tasks: [] }));
  fireEvent.click(screen.getByRole("button", { name: "Refresh tasks" }));
  await screen.findByText(/Task information refreshed/);
  expect((screen.getByRole("button", { name: "Retry same submission" }) as HTMLButtonElement).disabled).toBe(true);
  expect(submissions()).toHaveLength(1);
});

it.each([null, "text/plain", "text/html"])(
  "rejects a successful login response with Content-Type %s without requesting tasks",
  async (contentType) => {
    const headers = new Headers();
    if (contentType) headers.set("Content-Type", contentType);
    // Bytes deliberately avoid Response's automatic text/plain string header.
    const body = new TextEncoder().encode(JSON.stringify({
      token: "fixture-rejected-token",
      user: { email: "test@example.invalid" },
    }));
    const response = new Response(body, { status: 200, headers });
    expect(response.headers.get("Content-Type")).toBe(contentType);
    request.mockResolvedValueOnce(response);
    render(<OmegaTasksPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("Unable to verify task information. Please try again. No task outcome has been confirmed.");
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]?.[0]).toBe("/api/v1/auth/login");
    expect(screen.queryByRole("region", { name: "Saved tasks" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
    expect(screen.queryByText("fixture-rejected-token")).toBeNull();
    expect((screen.getByLabelText("Password") as HTMLInputElement).value).toBe("");
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  },
);
