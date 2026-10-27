// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';

const mocks = vi.hoisted(() => ({
  hasHint: vi.fn(), restore: vi.fn(), revoke: vi.fn(), clearHint: vi.fn(),
}));
vi.mock('../src/lib/customer-resume', () => ({
  hasCustomerResumeHint: mocks.hasHint,
  restoreCustomerSession: mocks.restore,
  revokeCustomerSession: mocks.revoke,
  clearCustomerResumeHint: mocks.clearHint,
}));

const signedIn = { token: 'synthetic-restored-token', user: { email: 'restored@example.invalid' } };
function Panel() {
  const { session, signOut, acceptSession } = useCustomerSession();
  return <>
    <p>{session?.user.email ?? 'Signed out'}</p>
    <button onClick={signOut}>Sign out</button>
    <button onClick={() => acceptSession({ token: 'new-synthetic-token', user: { email: 'new@example.invalid' } })}>
      Sign in new account
    </button>
  </>;
}
beforeEach(() => {
  mocks.hasHint.mockReset().mockReturnValue(false);
  mocks.restore.mockReset(); mocks.revoke.mockReset(); mocks.clearHint.mockReset();
});
afterEach(() => { cleanup(); });

it('guests never issue an automatic restore or paid provider call', () => {
  render(<CustomerSessionProvider><Panel /></CustomerSessionProvider>);
  expect(screen.getByText('Signed out')).toBeTruthy();
  expect(mocks.restore).not.toHaveBeenCalled();
});

it('restores a validated session once and hides private tools until confirmation', async () => {
  mocks.hasHint.mockReturnValue(true);
  let resolve!: (v: typeof signedIn) => void;
  mocks.restore.mockImplementation(() => new Promise(r => { resolve = r; }));
  render(<CustomerSessionProvider><Panel /></CustomerSessionProvider>);
  expect(screen.getByText(/Checking your secure Luqi sign-in/)).toBeTruthy();
  expect(screen.queryByText('Signed out')).toBeNull();
  await act(async () => { resolve(signedIn); });
  expect(screen.getByText(signedIn.user.email)).toBeTruthy();
  expect(mocks.restore).toHaveBeenCalledOnce();
});

it('manual sign-in wins over any late restore of another account', async () => {
  mocks.hasHint.mockReturnValue(true);
  let resolve!: (v: typeof signedIn) => void;
  mocks.restore.mockImplementation(() => new Promise(r => { resolve = r; }));
  render(<CustomerSessionProvider><Panel /></CustomerSessionProvider>);
  // Expose only a synthetic controller for an external, legitimate sign-in.
  // An automatic restore cannot replace the new account after it arrives.
  // Simulate it through a descendant while the old request is outstanding.
  await act(async () => { resolve(signedIn); });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in new account' }));
  expect(screen.getByText('new@example.invalid')).toBeTruthy();
  expect(screen.queryByText('restored@example.invalid')).toBeNull();
});

it('keeps a visible warning when server-side logout revocation is uncertain', async () => {
  mocks.hasHint.mockReturnValue(false);
  render(<CustomerSessionProvider><Panel /></CustomerSessionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in new account' }));
  mocks.hasHint.mockReturnValue(true);
  mocks.revoke.mockRejectedValue(new Error('synthetic failure'));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.getByText('Signed out')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('server sign-out could not be verified'));
  expect(mocks.clearHint).toHaveBeenCalledOnce();
  expect(mocks.revoke).toHaveBeenCalledOnce();
});
