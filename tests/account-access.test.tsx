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
const reply = (body: unknown, status = 201) => new Response(JSON.stringify(body), { status });
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
    expect(options).toMatchObject({ method: 'POST', cache: 'no-store', credentials: 'omit', redirect: 'error' });
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
    await act(async () => finish(reply(session)));
    expect(accepted).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('may already exist');
  });
  it('ignores a registration response after the form unmounts', async () => {
    setup(); let finish!: (response: Response) => void;
    request.mockReturnValueOnce(new Promise<Response>(resolve => { finish = resolve; }));
    fireEvent.click(screen.getByRole('button', { name: 'Create account', exact: true }));
    cleanup(); await act(async () => finish(reply(session)));
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
