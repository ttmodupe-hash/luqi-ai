// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccountAccessForm from '../src/components/AccountAccessForm';
import { ConversationError, signUp, validAccountPassword } from '../src/lib/private-conversations';

const request = vi.fn();
const accepted = vi.fn();
const password = 'Synthetic-Unique-Password-2026!';
const email = 'new-user@example.invalid';
const session = { token: 'synthetic-session', user: { email } };
const reply = (body: unknown, status = 201) => Response.json(body, { status });
beforeEach(() => { request.mockReset(); accepted.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function setup() {
  render(<AccountAccessForm initialMode="signup" onAuthenticated={accepted} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } });
}

describe('new account access', () => {
  it('requires matching passwords before sending any registration request', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: 'Different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    expect(screen.getByRole('status').textContent).toContain('do not match');
    expect(request).not.toHaveBeenCalled();
    expect(accepted).not.toHaveBeenCalled();
  });
  it('matches the server password boundary including multibyte passwords', () => {
    expect(validAccountPassword('short')).toBe(false);
    expect(validAccountPassword('a'.repeat(72))).toBe(true);
    expect(validAccountPassword('a'.repeat(73))).toBe(false);
    expect(validAccountPassword('é'.repeat(36))).toBe(true);
    expect(validAccountPassword('é'.repeat(37))).toBe(false);
  });
  it('accepts only a confirmed session, clears both password fields and never sends ownership fields', async () => {
    setup(); request.mockResolvedValueOnce(reply(session));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    await waitFor(() => expect(accepted).toHaveBeenCalledExactlyOnceWith(session));
    expect(request.mock.calls[0][0]).toBe('/api/v1/auth/register');
    const options = request.mock.calls[0][1];
    expect(options).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
    expect(JSON.parse(options.body)).toEqual({ email, password });
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Confirm password') as HTMLInputElement).value).toBe('');
  });
  it('handles an existing account without accepting a session or exposing raw diagnostics', async () => {
    setup(); request.mockResolvedValueOnce(reply({ detail: 'private SQL fixture' }, 409));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    await screen.findByText(/An account already uses this email/);
    expect(accepted).not.toHaveBeenCalled();
    expect(screen.queryByText('private SQL fixture')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Use an existing account' }));
    expect(screen.getByRole('button', { name: 'Sign in', exact: true })).toBeTruthy();
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe(email);
  });
  it('blocks registration retries after a lost response and offers an explicit sign-in path', async () => {
    setup(); request.mockRejectedValueOnce(new TypeError('Lost registration response'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    await screen.findByText(/Account creation could not be confirmed/);
    expect((screen.getByRole('button', { name: 'Create account', exact: true }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    expect(request).toHaveBeenCalledTimes(1);
    expect(accepted).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Use an existing account' }));
    expect((screen.getByRole('button', { name: 'Sign in', exact: true }) as HTMLButtonElement).disabled).toBe(false);
  });
  it('ignores a cancelled registration that later returns a valid session', async () => {
    setup(); let finish!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => finish(reply(session)));
    expect(accepted).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('may already exist');
  });
  it('ignores a registration response after the form unmounts', async () => {
    setup(); let finish!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    cleanup(); expect(request.mock.calls[0][1].signal.aborted).toBe(true);
    await act(async () => finish(reply(session)));
    expect(accepted).not.toHaveBeenCalled();
  });
  it('retains the bounded throttle across auth mode changes and never repeats credentials', async () => {
    setup(); request.mockResolvedValueOnce(new Response('private diagnostic', { status: 429, headers: { 'Retry-After': '117' } }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    await screen.findByText(/Wait 117 seconds/);
    fireEvent.click(screen.getByRole('button', { name: 'Use an existing account' }));
    expect((screen.getByRole('button', { name: 'Sign in', exact: true }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it.each([{ ...session, user: { email: 'different@example.invalid' } }, { user: { email } }, { ...session, token: '' }])
  ('does not claim account success from a malformed or wrong-owner response %#', async data => {
    request.mockResolvedValueOnce(reply(data));
    await expect(signUp(email, password)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('bounds a stalled registration request and does not retry it', async () => {
    vi.useFakeTimers();
    request.mockImplementationOnce((_path, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    const outcome = signUp(email, password).catch(error => error);
    await vi.advanceTimersByTimeAsync(15_000);
    expect((await outcome).name).toBe('AbortError');
    expect(request).toHaveBeenCalledTimes(1);
  });
});

// Synthetic regressions only: never point these tests at the production account API.
for (const mode of ['signin', 'signup'] as const) {
  const submitName = mode === 'signup' ? 'Create account' : 'Sign in';
  function prepareMode() {
    render(<AccountAccessForm initialMode={mode} onAuthenticated={accepted} />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    if (mode === 'signup') fireEvent.change(screen.getByLabelText('Confirm password'), { target: { value: password } });
  }
  for (const stalled of ['fetch', 'body'] as const) {
    it(`${mode} exits a stalled ${stalled} without retry or accepting a session`, async () => {
      vi.useFakeTimers(); prepareMode(); const cancelled = vi.fn(() => new Promise<void>(() => {}));
      request.mockImplementation(() => stalled === 'fetch' ? new Promise<Response>(() => {}) : Promise.resolve(
        new Response(new ReadableStream({ cancel: cancelled }), { headers: { 'Content-Type': 'application/json' } })));
      fireEvent.click(screen.getByRole('button', { name: submitName, exact: true }));
      await act(async () => { await vi.advanceTimersByTimeAsync(15_001); });
      expect(accepted).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][1].signal.aborted).toBe(true);
      expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
      if (stalled === 'body') expect(cancelled).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('status').textContent).toContain(mode === 'signup' ? 'may already exist' : 'temporarily unavailable');
      expect((screen.getByRole('button', { name: submitName, exact: true }) as HTMLButtonElement).disabled).toBe(mode === 'signup');
      expect(screen.queryByRole('button', { name: 'Cancel request' })).toBeNull();
    });
  }
  it(`${mode} cancel propagates abort without a second credential submission`, async () => {
    prepareMode(); request.mockImplementation(() => new Promise<Response>(() => {}));
    fireEvent.click(screen.getByRole('button', { name: submitName, exact: true }));
    const signal = request.mock.calls[0][1].signal;
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel request' })); });
    expect(signal.aborted).toBe(true); expect(request).toHaveBeenCalledTimes(1); expect(accepted).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  });
  it(`${mode} unmount aborts the pending request`, async () => {
    prepareMode(); request.mockImplementation(() => new Promise<Response>(() => {}));
    fireEvent.click(screen.getByRole('button', { name: submitName, exact: true }));
    const signal = request.mock.calls[0][1].signal;
    await act(async () => { cleanup(); });
    expect(signal.aborted).toBe(true); expect(accepted).not.toHaveBeenCalled(); expect(request).toHaveBeenCalledTimes(1);
  });
}
it('rejects plausible account JSON without JSON media type', async () => {
  request.mockResolvedValue(new Response(JSON.stringify(session)));
  await expect(signUp(email, password)).rejects.toThrow('Account request failed');
  expect(request).toHaveBeenCalledTimes(1);
});
it('does not submit credentials when the caller already cancelled', async () => {
  const controller = new AbortController(); controller.abort();
  await expect(signUp(email, password, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(request).not.toHaveBeenCalled();
});
it('reports invalid account schema without retaining token-bearing validation errors', async () => {
  request.mockResolvedValue(reply({ token: 'fixture-sensitive-token', user: { email: 'not-an-email' } }));
  await expect(signUp(email, password)).rejects.toThrow('Account response could not be verified');
});

it('registers the optional preferred name and retains the returned account name', async () => {
  setup();
  fireEvent.change(screen.getByLabelText('What should Luqi call you? (optional)'), { target: { value: 'Naledi' } });
  request.mockResolvedValue(reply({ ...session, user: { email, name: 'Naledi' } }));
  fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
  await waitFor(() => expect(accepted).toHaveBeenCalled());
  expect(JSON.parse(request.mock.calls[0][1].body).name).toBe('Naledi');
  expect(accepted.mock.calls[0][0].user.name).toBe('Naledi');
});

it('requires an unchecked explicit private-device choice before requesting persistence', async () => {
  request.mockResolvedValue(reply(session));
  render(<AccountAccessForm onAuthenticated={accepted} />);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  const checkbox = screen.getByRole('checkbox', { name: 'Keep me signed in on this private device' });
  expect((checkbox as HTMLInputElement).checked).toBe(false);
  fireEvent.click(checkbox);
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await waitFor(() => expect(accepted).toHaveBeenCalledOnce());
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ email, password, rememberMe: true });
});
