// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import CompanionPage from "../src/pages/CompanionPage";

const downloads = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/private-conversations', async importOriginal => ({
  ...await importOriginal<typeof import('../src/lib/private-conversations')>(),
  downloadConversationExport: downloads,
}));
const request = vi.fn();
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const list = { conversations: [{ id: 4, title: "Private notes", personalityId: 1 }] };
const history = { messages: [{ id: 2, role: "user", content: "Previously saved", createdAt: "2026-10-22T12:00:00Z" }] };
beforeEach(() => { downloads.mockReset(); request.mockReset(); vi.stubGlobal("fetch", request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function login() {
  request.mockResolvedValueOnce(reply({ token: "fixture-token", user: { email: "test@example.invalid" } }))
    .mockResolvedValueOnce(reply(list));
  render(<CompanionPage />);
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.invalid" } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("button", { name: "Private notes" });
}
async function selectConversation() {
  request.mockResolvedValueOnce(reply(history));
  fireEvent.click(screen.getByRole("button", { name: "Private notes" }));
  await screen.findByText("Previously saved");
}
function draft(text = "New private note") {
  fireEvent.change(screen.getByLabelText("Your message"), { target: { value: text } });
}

describe("Companion account interactions (mock HTTP, no production account)", () => {
  it('explains login throttling, clears the password and sends no automatic retries', async () => {
    request.mockResolvedValueOnce(new Response('private diagnostics', { status: 429, headers: { 'Retry-After': '117' } }));
    render(<CompanionPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fixture@example.invalid' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText(/Wait 117 seconds/);
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('fixture@example.invalid');
    expect(screen.queryByText('private diagnostics')).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("signs in, reloads persisted history, and displays a message only after a confirmed save", async () => {
    await login(); await selectConversation(); draft();
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Save message" }));
    expect(screen.queryByText("user · saved #3")).toBeNull();
    await act(async () => resolve(reply({ id: 3, persisted: true, role: "user" }, 201)));
    await screen.findByText("user · saved #3");
    expect((screen.getByLabelText("Your message") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByRole("status").textContent).toContain("AI replies remain disabled");
    expect(request.mock.calls.at(-1)?.[1].headers.Authorization).toBe("Bearer fixture-token");
  });
  it("retains a failed draft, blocks repeated writes, and requires history refresh", async () => {
    await login(); await selectConversation(); draft();
    request.mockRejectedValueOnce(new TypeError("Connection lost after possible commit"));
    fireEvent.click(screen.getByRole("button", { name: "Save message" }));
    await screen.findByText(/Save could not be confirmed/);
    expect((screen.getByLabelText("Your message") as HTMLTextAreaElement).value).toBe("New private note");
    expect((screen.getByRole("button", { name: "Save message" }) as HTMLButtonElement).disabled).toBe(true);
    expect(request).toHaveBeenCalledTimes(4);
    expect(screen.queryByText(/I have synthesized/)).toBeNull();
    request.mockResolvedValueOnce(reply(list)).mockResolvedValueOnce(reply(history));
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved history" }));
    await screen.findByText(/Saved history refreshed/);
    expect((screen.getByRole("button", { name: "Save message" }) as HTMLButtonElement).disabled).toBe(false);
    expect(request).toHaveBeenCalledTimes(6);
  });
  it("clears private content on expiration instead of retaining another account's history", async () => {
    await login(); await selectConversation(); draft();
    request.mockResolvedValueOnce(reply({ code: "AUTH_REQUIRED" }, 401));
    fireEvent.click(screen.getByRole("button", { name: "Save message" }));
    await screen.findByRole("button", { name: "Sign in" });
    expect(screen.queryByText("Previously saved")).toBeNull();
    expect(screen.queryByLabelText("Your message")).toBeNull();
    expect(screen.queryByText("test@example.invalid")).toBeNull();
  });
  it("does not restore private state when a request completes after sign-out", async () => {
    await login();
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Private notes" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => resolve(reply(history)));
    expect(screen.queryByText("Previously saved")).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });
  it("creates a conversation only after the server confirms persistence", async () => {
    await login();
    fireEvent.change(screen.getByLabelText("Conversation title"), { target: { value: "New topic" } });
    request.mockResolvedValueOnce(reply({ id: 5, persisted: true }, 201));
    fireEvent.click(screen.getByRole("button", { name: "Create conversation" }));
    await screen.findByRole("button", { name: "New topic" });
    expect(screen.getByLabelText("Your message")).toBeTruthy();
    expect(JSON.parse(request.mock.calls.at(-1)?.[1].body)).toEqual({ title: "New topic", personalityId: 1 });
  });
  it("shows sign-in failure without exposing server error details", async () => {
    request.mockResolvedValueOnce(reply({ detail: "private database error" }, 503));
    render(<CompanionPage />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.invalid" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "fixture-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("Unable to load data"));
    expect(screen.queryByText("private database error")).toBeNull();
  });
});

describe("private conversation deletion", () => {
  it("requires confirmation, permits cancellation, and removes history only after confirmation", async () => {
    await login(); await selectConversation();
    const calls = request.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Delete selected conversation" }));
    expect(request).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole("button", { name: "Cancel deletion" }));
    expect(request).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole("button", { name: "Delete selected conversation" }));
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    expect(screen.getByRole("button", { name: "Private notes" })).toBeTruthy();
    expect(screen.queryByText(/deleted from active storage/)).toBeNull();
    await act(async () => resolve(reply({ id: 4, deleted: true })));
    await screen.findByText(/deleted from active storage/);
    expect(screen.queryByRole("button", { name: "Private notes" })).toBeNull();
    expect(screen.queryByText("Previously saved")).toBeNull();
  });
  it("blocks deletion while a draft is present and recovers from a lost deletion response by refreshing", async () => {
    await login(); await selectConversation(); draft();
    expect((screen.getByRole("button", { name: "Delete selected conversation" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Clear draft" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete selected conversation" }));
    request.mockRejectedValueOnce(new TypeError("Lost delete acknowledgement"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    await screen.findByText(/Deletion could not be confirmed/);
    expect((screen.getByRole("button", { name: "Private notes" }) as HTMLButtonElement).disabled).toBe(true);
    expect(request).toHaveBeenCalledTimes(4);
    request.mockResolvedValueOnce(reply({ conversations: [] }));
    fireEvent.click(screen.getByRole("button", { name: "Refresh saved history" }));
    await screen.findByText(/Saved history refreshed/);
    expect(screen.queryByRole("button", { name: "Private notes" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Conversation title"), { target: { value: "After refresh" } });
    expect((screen.getByRole("button", { name: "Create conversation" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("ignores a deletion response received after sign-out", async () => {
    await login(); await selectConversation();
    fireEvent.click(screen.getByRole("button", { name: "Delete selected conversation" }));
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm deletion" }));
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => resolve(reply({ id: 4, deleted: true })));
    expect(screen.queryByText(/deleted from active storage/)).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
  });
});

const exportFixture = { format: 'luqi.conversation.v1', exportedAt: '2026-10-23T06:00:00Z',
  conversation: { id: 4, title: 'Private notes', personalityId: 1, createdAt: null },
  messages: history.messages, memories: [] };
describe('private conversation download', () => {
  it('requires an explicit click, excludes unsaved drafts and downloads only a verified response', async () => {
    await login(); await selectConversation();
    expect(downloads).not.toHaveBeenCalled();
    draft();
    expect((screen.getByRole('button', { name: 'Export selected conversation' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Clear draft' }));
    request.mockResolvedValueOnce(reply(exportFixture));
    fireEvent.click(screen.getByRole('button', { name: 'Export selected conversation' }));
    await screen.findByText(/Export download started/);
    expect(downloads).toHaveBeenCalledExactlyOnceWith(exportFixture);
    expect(request.mock.calls.at(-1)?.[1].method).toBe('GET');
  });
  it.each([404, 422, 503])('never downloads partial/error data on HTTP %s', async status => {
    await login(); await selectConversation();
    request.mockResolvedValueOnce(reply({ code: 'PRIVATE_FAILURE' }, status));
    fireEvent.click(screen.getByRole('button', { name: 'Export selected conversation' }));
    await screen.findByText(status === 422 ? /No partial export was downloaded/ : /Export could not be completed/);
    expect(downloads).not.toHaveBeenCalled();
    expect(screen.getByText('Previously saved')).toBeTruthy();
  });
  it('clears private state when the export session is revoked', async () => {
    await login(); await selectConversation();
    request.mockResolvedValueOnce(reply({}, 401));
    fireEvent.click(screen.getByRole('button', { name: 'Export selected conversation' }));
    await screen.findByRole('button', { name: 'Sign in' });
    expect(screen.queryByText('Previously saved')).toBeNull();
    expect(downloads).not.toHaveBeenCalled();
  });
  it('discards an export response received after sign-out', async () => {
    await login(); await selectConversation();
    let resolve!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(r => { resolve = r; }));
    fireEvent.click(screen.getByRole('button', { name: 'Export selected conversation' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await act(async () => resolve(reply(exportFixture)));
    expect(downloads).not.toHaveBeenCalled();
    expect(screen.queryByText(/Export download started/)).toBeNull();
  });
});
