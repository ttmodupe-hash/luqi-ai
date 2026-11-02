// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AiPilotPage from '../src/pages/AiPilotPage';
import { CustomerSessionProvider } from '../src/providers/customer-session';

const inference = vi.fn();
beforeEach(() => {
  inference.mockReset();
  vi.stubGlobal('fetch', vi.fn(async (path: string, options?: RequestInit) => {
    if (path === '/v1/readiness') return Response.json({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } });
    if (path === '/api/v1/auth/login') return Response.json({ token: 'fixture-token', user: { email: 'trial@example.invalid' } });
    if (path === '/api/v1/luqi-core') return inference(options);
    throw new Error('Unexpected fixture path');
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function prepare() {
  render(<MemoryRouter><CustomerSessionProvider><AiPilotPage /></CustomerSessionProvider></MemoryRouter>);
  await screen.findByText(/Provider access is configured/);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'trial@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Fixture-Password-2026!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByLabelText('Your question');
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Ordinary fixture question' } });
  fireEvent.click(screen.getByRole('checkbox'));
}
for (const status of [500, 502, 503]) {
  it(`requires an explicit new question after an unconfirmed HTTP ${status}`, async () => {
    inference.mockResolvedValue(Response.json({ code: 'private-fixture-diagnostic' }, { status }));
    await prepare(); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
    await screen.findByText(/The reply could not be confirmed/);
    expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.queryByText('private-fixture-diagnostic')).toBeNull();
    fireEvent.submit(screen.getByLabelText('Your question').closest('form')!);
    expect(inference).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Start a new question' }));
    expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('');
    expect(inference).toHaveBeenCalledTimes(1);
  });
}
it('unlocks a transport that ignores cancellation without replaying the paid request', async () => {
  await prepare(); vi.useFakeTimers();
  inference.mockImplementation(() => new Promise<Response>(() => {}));
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(45_001); });
  expect(screen.getByText(/The reply could not be confirmed/)).toBeTruthy();
  expect(screen.queryByText('Waiting for a reply…')).toBeNull();
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(inference).toHaveBeenCalledTimes(1);
  expect(inference.mock.calls[0][0].signal.aborted).toBe(true);
});
