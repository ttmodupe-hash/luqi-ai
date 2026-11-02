// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';
import { ChatWorkspaceProvider, useOptionalChatWorkspace } from '../src/providers/chat-workspace';
const mocks = vi.hoisted(() => ({ hint: vi.fn(), restore: vi.fn(), revoke: vi.fn() }));
vi.mock('../src/lib/customer-resume', () => ({
  hasCustomerResumeHint: mocks.hint, restoreCustomerSession: mocks.restore,
  revokeCustomerSession: mocks.revoke, clearCustomerResumeHint: vi.fn(),
}));
const session = (family: string, seconds: number) => ({
  token: 'fixture.' + btoa(JSON.stringify({ sid: 'luqi-rs1-' + family.repeat(64),
    exp: Math.floor(Date.now() / 1000) + seconds })) + '.fixture',
  user: { email: 'fixture@example.invalid', name: 'Naledi' },
});
function Panel() {
  const account = useCustomerSession(), workspace = useOptionalChatWorkspace()!;
  const [draft, setDraft] = useState('');
  return <>
    <button onClick={() => account.acceptSession(session('a', 120))}>Initial login</button>
    <button onClick={() => account.acceptSession(session('b', 900))}>Different device family</button>
    <label>Retained draft<input value={draft} onChange={e => setDraft(e.target.value)} /></label>
    <button onClick={() => workspace.setProviderAcknowledged(true)}>Acknowledge</button>
    <p>{workspace.providerAcknowledged ? 'Acknowledged' : 'No acknowledgement'}</p>
    <p>{account.session?.user.name}</p>
    <output aria-label="Current token">{account.session?.token}</output>
  </>;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T04:00:00Z'));
  mocks.hint.mockReset().mockReturnValue(false); mocks.restore.mockReset();
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('keeps the current conversation approval and mounted draft across a verified token rotation', async () => {
  render(<CustomerSessionProvider><ChatWorkspaceProvider><Panel /></ChatWorkspaceProvider></CustomerSessionProvider>);
  fireEvent.click(screen.getByText('Initial login'));
  fireEvent.change(screen.getByLabelText('Retained draft'), { target: { value: 'My unsent question' } });
  fireEvent.click(screen.getByText('Acknowledge'));
  mocks.hint.mockReturnValue(true);
  const rotated = session('a', 900); mocks.restore.mockResolvedValue(rotated);
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(screen.getByLabelText('Current token').textContent).toBe(rotated.token);
  expect((screen.getByLabelText('Retained draft') as HTMLInputElement).value).toBe('My unsent question');
  expect(screen.getByText('Acknowledged')).toBeTruthy();
  expect(screen.getByText('Naledi')).toBeTruthy();
  expect(mocks.restore).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText('Different device family'));
  expect(screen.getByText('No acknowledgement')).toBeTruthy();
});
