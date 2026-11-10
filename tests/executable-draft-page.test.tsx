// @vitest-environment jsdom
import React from "react";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { unzipSync, strFromU8 } from "fflate";
import ExecutableDraftWorkflow from "../src/features/devsecnet/ExecutableDraftWorkflow";
import {
  DRAFT_CASES,
  DRAFT_CONTRACT,
  REFERENCE_DRAFT,
} from "../src/features/devsecnet/draft-contract";
import { askPilot } from "../src/lib/ai-pilot";
let identity: string | null = null;
vi.mock("../src/providers/customer-session", () => ({
  useOptionalCustomerSession: () => ({
    session: identity ? { token: identity } : null,
  }),
}));
vi.mock("../src/lib/ai-pilot", () => ({
  askPilot: vi.fn(),
  PilotChatError: class extends Error {
    code = "UNAVAILABLE";
  },
}));
class LocalWorker {
  static instances: LocalWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    LocalWorker.instances.push(this);
  }
}
beforeEach(() => {
  identity = null;
  LocalWorker.instances = [];
  vi.stubGlobal("Worker", LocalWorker);
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("fetch", vi.fn());
  vi.mocked(askPilot).mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const mount = () =>
  render(
    <MemoryRouter>
      <ExecutableDraftWorkflow />
    </MemoryRouter>,
  );
function plan() {
  fireEvent.change(screen.getByLabelText("Project idea for this function"), {
    target: { value: "A school connectivity offer" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "Confirm plan and contract" }),
  );
}
function reference() {
  fireEvent.click(
    screen.getByRole("button", { name: "Load local reference (no AI)" }),
  );
}
async function run() {
  fireEvent.click(screen.getByRole("button", { name: "Run isolated tests" }));
  await waitFor(() => expect(LocalWorker.instances).toHaveLength(1));
  return LocalWorker.instances[0];
}
function confirm(w: LocalWorker) {
  const command = w.postMessage.mock.calls[0][0];
  act(() =>
    w.onmessage?.({
      data: {
        ok: true,
        result: {
          contract: DRAFT_CONTRACT,
          digest: command.digest,
          rows: DRAFT_CASES.map((x) => ({
            id: x.id,
            outcome: x.expected === null ? "throw" : "value",
            ...(x.expected ? { actual: JSON.stringify(x.expected) } : {}),
          })),
        },
      },
    } as MessageEvent),
  );
}
it("requires a plan, explicit execution and human review, and invalidates approval on edits", async () => {
  mount();
  expect(
    screen.queryByRole("button", { name: "Run isolated tests" }),
  ).toBeNull();
  plan();
  reference();
  expect(LocalWorker.instances).toHaveLength(0);
  expect(askPilot).not.toHaveBeenCalled();
  expect(
    screen
      .getByRole("button", { name: "Approve draft for export" })
      .hasAttribute("disabled"),
  ).toBe(true);
  const w = await run();
  confirm(w);
  expect(screen.getAllByText("PASS")).toHaveLength(DRAFT_CASES.length);
  expect(
    screen
      .getByRole("button", { name: "Approve draft for export" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed this source, executed results and limitations.",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Approve draft for export" }),
  );
  expect(
    screen
      .getByRole("button", { name: "Download reviewed draft bundle" })
      .hasAttribute("disabled"),
  ).toBe(false);
  fireEvent.change(screen.getByLabelText("JavaScript draft"), {
    target: { value: "function solve(){return 0;}" },
  });
  expect(screen.queryByText("PASS")).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Download reviewed draft bundle" })
      .hasAttribute("disabled"),
  ).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
it("exports the exact reviewed source and result digest, then revokes the download on account change", async () => {
  let saved: Blob | undefined;
  const revoke = vi.fn();
  class DownloadURL extends URL {
    static createObjectURL(blob: Blob) {
      saved = blob;
      return "blob:reviewed-draft";
    }
    static revokeObjectURL = revoke;
  }
  vi.stubGlobal("URL", DownloadURL);
  let activated:
    { target: string; rel: string; connected: boolean } | undefined;
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      activated = {
        target: this.target,
        rel: this.rel,
        connected: this.isConnected,
      };
    });
  const page = mount();
  plan();
  reference();
  const w = await run();
  confirm(w);
  const command = w.postMessage.mock.calls[0][0];
  fireEvent.click(
    screen.getByLabelText(
      "I reviewed this source, executed results and limitations.",
    ),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Approve draft for export" }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Download reviewed draft bundle" }),
  );
  expect(activated).toEqual({
    target: "_blank",
    rel: "noopener noreferrer",
    connected: true,
  });
  expect(saved).toBeDefined();
  const bytes = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(saved!);
  });
  const files = unzipSync(new Uint8Array(bytes));
  expect(Object.keys(files).sort()).toEqual([
    "README.md",
    "draft.js",
    "review.json",
    "test-cases.json",
  ]);
  expect(strFromU8(files["draft.js"])).toBe(REFERENCE_DRAFT);
  const review = JSON.parse(strFromU8(files["review.json"]));
  expect(review.report.digest).toBe(command.digest);
  expect(review.humanAcknowledgement).toBe(true);
  expect(review.productionApproval).toBe(false);
  expect(JSON.parse(strFromU8(files["test-cases.json"]))).toEqual(DRAFT_CASES);
  identity = "other-account";
  page.rerender(
    <MemoryRouter>
      <ExecutableDraftWorkflow />
    </MemoryRouter>,
  );
  expect(revoke).toHaveBeenCalledWith("blob:reviewed-draft");
  click.mockRestore();
});
it("gates AI by authentication and explicit consent, never executes or retries a reply", async () => {
  identity = "account-token";
  vi.mocked(askPilot).mockResolvedValue({
    status: "success",
    response: JSON.stringify({
      code: REFERENCE_DRAFT,
      explanation: "Check it.",
    }),
    provider: "openai",
    provider_model: "fixture-model",
  });
  mount();
  plan();
  expect(
    screen
      .getByRole("button", { name: "Request AI draft" })
      .hasAttribute("disabled"),
  ).toBe(true);
  fireEvent.click(screen.getByLabelText(/I consent to send/));
  fireEvent.click(screen.getByRole("button", { name: "Request AI draft" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("JavaScript draft") as HTMLTextAreaElement).value,
    ).toBe(REFERENCE_DRAFT),
  );
  expect(askPilot).toHaveBeenCalledTimes(1);
  expect(vi.mocked(askPilot).mock.calls[0][0]).toBe("account-token");
  expect(vi.mocked(askPilot).mock.calls[0][4]).toEqual([]);
  expect(vi.mocked(askPilot).mock.calls[0][7]).toBe("draft");
  expect(LocalWorker.instances).toHaveLength(0);
  expect(
    screen
      .getByRole("button", { name: "Request AI draft" })
      .hasAttribute("disabled"),
  ).toBe(true);
  vi.mocked(askPilot).mockResolvedValue({
    status: "success",
    response: "invalid format",
    provider: "openai",
    provider_model: "fixture-model",
  });
  fireEvent.click(screen.getByLabelText(/I consent to send/));
  fireEvent.click(screen.getByRole("button", { name: "Request AI draft" }));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("did not match"),
  );
  expect(askPilot).toHaveBeenCalledTimes(2);
  expect(LocalWorker.instances).toHaveLength(0);
});
it("rejects mismatched results and ignores cancelled or edited late replies", async () => {
  mount();
  plan();
  reference();
  const w = await run();
  act(() =>
    w.onmessage?.({
      data: { ok: true, result: { digest: "wrong" } },
    } as MessageEvent),
  );
  expect(screen.getByRole("status").textContent).toContain(
    "could not be confirmed",
  );
  fireEvent.click(screen.getByRole("button", { name: "Run isolated tests" }));
  await waitFor(() => expect(LocalWorker.instances).toHaveLength(2));
  const late = LocalWorker.instances[1];
  fireEvent.click(
    screen.getByRole("button", { name: "Cancel draft operation" }),
  );
  confirm(late);
  expect(screen.queryByText("PASS")).toBeNull();
  expect(late.terminate).toHaveBeenCalled();
});
it("aborts and clears drafts on account change before a late AI reply", async () => {
  identity = "first";
  let resolve!: (v: any) => void;
  vi.mocked(askPilot).mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const page = mount();
  plan();
  reference();
  fireEvent.click(screen.getByLabelText(/I consent to send/));
  fireEvent.click(screen.getByRole("button", { name: "Request AI draft" }));
  const signal = vi.mocked(askPilot).mock.calls[0][2];
  identity = "second";
  page.rerender(
    <MemoryRouter>
      <ExecutableDraftWorkflow />
    </MemoryRouter>,
  );
  expect(signal.aborted).toBe(true);
  expect(
    (
      screen.getByLabelText(
        "Project idea for this function",
      ) as HTMLTextAreaElement
    ).value,
  ).toBe("");
  await act(async () =>
    resolve({
      status: "success",
      response: JSON.stringify({ code: REFERENCE_DRAFT, explanation: "" }),
      provider: "openai",
      provider_model: "fixture",
    }),
  );
  expect(screen.queryByLabelText("JavaScript draft")).toBeNull();
});
