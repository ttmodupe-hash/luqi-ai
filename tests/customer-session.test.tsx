// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';

afterEach(() => cleanup());
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
