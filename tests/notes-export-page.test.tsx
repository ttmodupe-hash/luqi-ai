// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render as renderUI, screen, waitFor } from '@testing-library/react';
import CompanionPage from '../src/pages/CompanionPage';
import { NOTES_EXPORT_TIMEOUT_MS } from '../src/lib/notes-export-request';
import { CustomerSessionProvider } from '../src/providers/customer-session';
const render = (element: React.ReactElement) => renderUI(<CustomerSessionProvider>{element}</CustomerSessionProvider>);

const exportRequest = vi.fn();
const createUrl = vi.fn(() => 'blob:synthetic-notes');
const revokeUrl = vi.fn();
const BrowserURL = globalThis.URL;
const fixture = { format: 'luqi.private-notes.v1', scope: 'saved_notes_only',
  exportedAt: '2026-10-24T14:00:00Z', conversations: [], messages: [], memories: [] };
beforeEach(() => {
  exportRequest.mockReset(); createUrl.mockClear(); revokeUrl.mockClear();
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.stubGlobal('URL', class extends BrowserURL {
    static createObjectURL = createUrl;
    static revokeObjectURL = revokeUrl;
  });
  vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
    if (path === '/api/v1/auth/login') return Response.json({ token: 'synthetic-token', user: { email: 'fixture@example.invalid' } });
    if (path === '/api/v1/companion/conversations?limit=50') return Response.json({ conversations: [] });
    if (path === '/api/v1/companion/conversations/export') return exportRequest(init);
    throw new Error('Unexpected synthetic test path');
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function signIn() {
  render(<CompanionPage />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'fixture@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Synthetic-Password-Only!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByRole('button', { name: 'Sign out' });
  await waitFor(() => expect((screen.getByRole('button', { name: 'Download all saved notes' }) as HTMLButtonElement).disabled).toBe(false));
}
for (const stalled of ['fetch', 'body'] as const) {
  it(`re-enables the page after a stalled ${stalled} without starting a download or retry`, async () => {
    await signIn(); vi.useFakeTimers();
    exportRequest.mockImplementation(() => stalled === 'fetch' ? new Promise<Response>(() => {}) :
      Promise.resolve(new Response(new ReadableStream({ cancel() { return new Promise<void>(() => {}); } }),
        { headers: { 'Content-Type': 'application/json' } })));
    fireEvent.click(screen.getByRole('button', { name: 'Download all saved notes' }));
    await act(async () => { await vi.advanceTimersByTimeAsync(NOTES_EXPORT_TIMEOUT_MS + 1); });
    expect(screen.getByRole('status').textContent).toContain('All-notes export could not be completed. No file was downloaded.');
    expect((screen.getByRole('button', { name: 'Refresh saved history' }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole('button', { name: 'Download all saved notes' }) as HTMLButtonElement).disabled).toBe(false);
    expect(createUrl).not.toHaveBeenCalled(); expect(exportRequest).toHaveBeenCalledTimes(1);
    expect(exportRequest.mock.calls[0][0].signal.aborted).toBe(true);
    // Only an explicit second click may start another GET and a complete file.
    exportRequest.mockResolvedValueOnce(Response.json(fixture));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Download all saved notes' })); });
    expect(exportRequest).toHaveBeenCalledTimes(2); expect(createUrl).toHaveBeenCalledTimes(1);
  });
}
it('sign-out aborts export and drops a late complete snapshot', async () => {
  await signIn(); let finish!: (response: Response) => void;
  exportRequest.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Download all saved notes' }));
  const signal = exportRequest.mock.calls[0][0].signal;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Sign out' })); });
  expect(signal.aborted).toBe(true);
  await act(async () => finish(Response.json(fixture)));
  expect(createUrl).not.toHaveBeenCalled(); expect(exportRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeTruthy();
});
it('timeout discards a late successful snapshot without signing the user out', async () => {
  await signIn(); vi.useFakeTimers(); let finish!: (response: Response) => void;
  exportRequest.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Download all saved notes' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(NOTES_EXPORT_TIMEOUT_MS + 1); });
  await act(async () => finish(Response.json(fixture)));
  expect(createUrl).not.toHaveBeenCalled(); expect(exportRequest).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('No file was downloaded');
});
