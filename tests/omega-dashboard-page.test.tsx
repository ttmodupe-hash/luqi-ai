// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  act,
  within,
} from "@testing-library/react";
import OmegaTasksPage from "../src/pages/OmegaTasksPage";
import {
  task,
  taskId,
  configured,
  disabled,
  budgetResult,
} from "./fixtures/omega-dashboard";
const request = vi.fn();
const reply = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status });
beforeEach(() => {
  request.mockReset();
  vi.stubGlobal("fetch", request);
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
