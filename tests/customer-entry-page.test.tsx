// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import CustomerEntryPage from '../src/pages/CustomerEntryPage';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';

const request = vi.fn();
const user = { email: 'new@example.invalid' };
const password = 'Synthetic-Unique-Password-2026!';
const valid = { token: 'synthetic-token', user };
beforeEach(() => {
  request.mockReset();
  vi.stubGlobal('fetch', request);
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function ChatFixture() {
  const { session } = useCustomerSession();
  const location = useLocation();
  return <section>
    <h2>Chat destination</h2>
    <p>{session ? 'Account verified' : 'No account'}</p>
    <p data-testid="location">{location.pathname + location.search}</p>
  </section>;
}
function Journey({ mode = 'signup', initial }: { mode?: 'signin' | 'signup'; initial?: string }) {
  return <CustomerSessionProvider><MemoryRouter initialEntries={[initial ?? (mode === 'signup' ? '/join' : '/login')]}>
    <Routes>
      <Route path="/join" element={<CustomerEntryPage initialMode="signup" />} />
      <Route path="/login" element={<CustomerEntryPage initialMode="signin" />} />
      <Route path="/chat" element={<ChatFixture />} />
    </Routes>
  </MemoryRouter></CustomerSessionProvider>;
}
function fill(mode: 'signin' | 'signup') {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  if (mode === 'signup') fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } });
}
for (const mode of ['signin', 'signup'] as const) {
  it(`confirmed ${mode} enters Chat without an extra sign-in, Notes or paid AI request`, async () => {
    request.mockResolvedValueOnce(Response.json(valid, { status: mode === 'signup' ? 201 : 200 }));
    render(<Journey mode={mode} />);
    expect(screen.getByText(/Sign in or create one account, then go straight to Chat/)).toBeTruthy();
    fill(mode);
    fireEvent.click(screen.getByRole('button', { name: mode === 'signup' ? 'Create account' : 'Sign in', exact: true }));
    await screen.findByRole('heading', { name: 'Chat destination' });
    expect(screen.getByText('Account verified')).toBeTruthy();
    expect(screen.getByTestId('location').textContent).toBe('/chat');
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe(mode === 'signup' ? '/api/v1/auth/register' : '/api/v1/auth/login');
    expect(request.mock.calls[0][1]).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error' });
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
}
it('does not forward untrusted return URLs or account credentials to Chat', async () => {
  request.mockResolvedValueOnce(Response.json(valid));
  render(<Journey mode="signin" initial="/login?next=https://example.invalid&password=private" />);
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
  fill('signin');
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByText('Account verified');
  expect(screen.getByTestId('location').textContent).toBe('/chat');
});
it('never navigates or retries when registration success cannot be confirmed', async () => {
  request.mockRejectedValueOnce(new TypeError('Synthetic lost response'));
  render(<Journey />);
  fill('signup');
  fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
  await screen.findByText(/Account creation could not be confirmed/);
  expect(screen.queryByRole('heading', { name: 'Chat destination' })).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
  expect((screen.getByRole('button', { name: 'Create account', exact: true }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Use an existing account' }));
  expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeTruthy();
});
