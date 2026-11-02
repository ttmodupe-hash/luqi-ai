// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';

afterEach(() => { cleanup(); vi.useRealTimers(); });
const fixture = { token: 'synthetic-token', user: { email: 'fixture@example.invalid' } };
function AccountPanel() {
  const { session, acceptSession, signOut } = useCustomerSession();
  return <section>
    <p>{session ? 'Signed in' : 'Signed out'}</p>
    <button onClick={() => acceptSession(fixture)}>Sign in fixture</button>
    <button onClick={signOut}>Sign out fixture</button>
  </section>;
}
function OtherCustomerTool() {
  const { session } = useCustomerSession();
  return <p>{session ? 'Customer session shared' : 'No customer session'}</p>;
}
function Harness() {
  const [tool, setTool] = React.useState(false);
  return <CustomerSessionProvider>
    <button onClick={() => setTool(value => !value)}>Switch tool</button>
    {tool ? <OtherCustomerTool /> : <AccountPanel />}
  </CustomerSessionProvider>;
}
it('shares one verified customer token between mounted routes without storing it or requesting AI', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  try {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in fixture' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch tool' }));
    expect(screen.getByText('Customer session shared')).toBeTruthy();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Switch tool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign out fixture' }));
    fireEvent.click(screen.getByRole('button', { name: 'Switch tool' }));
    expect(screen.getByText('No customer session')).toBeTruthy();
  } finally { vi.unstubAllGlobals(); }
});

function expiringSession(email: string, expiresIn: number) {
  // Unsigned synthetic claim: used only for client expiry UI, never server auth.
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresIn }));
  return { token: `fixture.${payload}.not-a-signature`, user: { email } };
}
function LifetimeHarness() {
  const { session, acceptSession } = useCustomerSession();
  return <>
    <p>{session?.user.email ?? 'No active account'}</p>
    <button onClick={() => acceptSession(expiringSession('first@example.invalid', 60))}>First account</button>
    <button onClick={() => acceptSession(expiringSession('second@example.invalid', 300))}>Second account</button>
    <button onClick={() => acceptSession(expiringSession('expired@example.invalid', -1))}>Expired account</button>
    <OtherCustomerTool />
  </>;
}
it('expires the shared identity without an API call and drops every customer view', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  render(<CustomerSessionProvider><LifetimeHarness /></CustomerSessionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'First account' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(screen.queryByText('first@example.invalid')).toBeNull();
  expect(screen.getByText('No customer session')).toBeTruthy();
});
it('does not let the first account deadline end a later account session', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  render(<CustomerSessionProvider><LifetimeHarness /></CustomerSessionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'First account' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  fireEvent.click(screen.getByRole('button', { name: 'Second account' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(screen.getByText('second@example.invalid')).toBeTruthy();
  await act(async () => { await vi.advanceTimersByTimeAsync(270_000); });
  expect(screen.getByText('No active account')).toBeTruthy();
});
it('checks the clock when a suspended mobile tab resumes and rejects an already expired session', () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  render(<CustomerSessionProvider><LifetimeHarness /></CustomerSessionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'First account' }));
  vi.setSystemTime(new Date('2026-10-26T12:02:00Z'));
  fireEvent(window, new Event('pageshow'));
  expect(screen.getByText('No active account')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Expired account' }));
  expect(screen.getByText('No active account')).toBeTruthy();
});

it('caps a future expiry hint at 24 hours and never trusts malformed claims as a session', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  function Bounds() {
    const { session, acceptSession } = useCustomerSession();
    return <>
      <p>{session ? 'Bounded session' : 'No bounded session'}</p>
      <button onClick={() => acceptSession(expiringSession('future@example.invalid', 7 * 86400))}>Future hint</button>
      <button onClick={() => acceptSession({ ...fixture, token: 'fixture.not-json.invalid' })}>Broken hint</button>
    </>;
  }
  render(<CustomerSessionProvider><Bounds /></CustomerSessionProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Future hint' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000); });
  expect(screen.getByText('No bounded session')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Broken hint' }));
  expect(screen.getByText('No bounded session')).toBeTruthy();
});
