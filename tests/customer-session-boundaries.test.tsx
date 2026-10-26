// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';
import CompanionPage from '../src/pages/CompanionPage';
import AiPilotPage from '../src/pages/AiPilotPage';
import AskLuqiPage from '../src/pages/AskLuqiPage';
import OmegaTasksPage from '../src/pages/OmegaTasksPage';
import { configured, task } from './fixtures/omega-dashboard';

const request = vi.fn();
function SwitchAccount() {
  const { acceptSession } = useCustomerSession();
  return <nav aria-label="Synthetic account controls">{['first', 'second'].map(name =>
    <button key={name} onClick={() => acceptSession({ token: `${name}-fixture`, user: { email: `${name}@example.invalid` } })}>
      Use {name} account
    </button>)}<button onClick={() => acceptSession({
      token: `fixture.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 5 }))}.not-a-signature`,
      user: { email: 'expiring@example.invalid' },
    })}>Use short session</button></nav>;
}
function mount(page: React.ReactNode) {
  render(<MemoryRouter><CustomerSessionProvider><SwitchAccount />{page}</CustomerSessionProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Use first account' }));
}
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

it('removes the former account notes immediately and ignores its pending history response', async () => {
  let oldHistory!: (response: Response) => void;
  let newHistory!: (response: Response) => void;
  request.mockImplementation(async (path: string, options: RequestInit) => {
    if (path.includes('/4/messages')) return new Promise<Response>(resolve => { oldHistory = resolve; });
    if ((options.headers as Record<string, string>).Authorization === 'Bearer second-fixture') {
      return new Promise<Response>(resolve => { newHistory = resolve; });
    }
    return Response.json({ conversations: [{ id: 4, title: 'First account private title', personalityId: 1 }] });
  });
  mount(<CompanionPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'First account private title' }));
  await waitFor(() => expect(oldHistory).toBeTypeOf('function'));
  fireEvent.click(screen.getByRole('button', { name: 'Use second account' }));
  expect(screen.queryByText('First account private title')).toBeNull();
  await waitFor(() => expect(newHistory).toBeTypeOf('function'));
  await act(async () => { oldHistory(Response.json({ messages: [{ id: 8, role: 'user', content: 'Late first account private message', createdAt: null }] })); });
  expect(screen.queryByText('Late first account private message')).toBeNull();
  await act(async () => { newHistory(Response.json({ conversations: [] })); });
  expect(screen.getByText('second@example.invalid')).toBeTruthy();
});

it('drops the former account Omega history before loading the new identity', async () => {
  let newStatus!: (response: Response) => void;
  request.mockImplementation(async (path: string, options: RequestInit) => {
    if ((options.headers as Record<string, string>).Authorization === 'Bearer second-fixture') {
      return new Promise<Response>(resolve => { newStatus = resolve; });
    }
    return Response.json(path.endsWith('/status') ? configured : { tasks: [task] });
  });
  mount(<OmegaTasksPage />);
  await screen.findByRole('region', { name: 'Saved tasks' });
  fireEvent.click(screen.getByRole('button', { name: 'Use second account' }));
  expect(screen.queryByRole('region', { name: 'Saved tasks' })).toBeNull();
  await waitFor(() => expect(newStatus).toBeTypeOf('function'));
  await act(async () => { newStatus(Response.json({ intake: 'disabled', execution: 'disabled', workerVerified: false, handlers: [] })); });
  await screen.findByText('Tasks are not enabled yet');
});

it('cancels a pending Chat reply on account switch and requires fresh consent', async () => {
  let oldReply!: (response: Response) => void;
  let signal!: AbortSignal;
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/v1/readiness') return Response.json({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } });
    if (path === '/api/v1/luqi-core') {
      signal = options!.signal!;
      return new Promise<Response>(resolve => { oldReply = resolve; });
    }
    throw new Error('Unexpected synthetic route');
  });
  mount(<AiPilotPage />);
  await screen.findByText(/Provider access is configured/);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'First account private draft' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await waitFor(() => expect(oldReply).toBeTypeOf('function'));
  fireEvent.click(screen.getByRole('button', { name: 'Use second account' }));
  expect(signal.aborted).toBe(true);
  await act(async () => { oldReply(Response.json({ status: 'success', response: 'Late first account reply', provider: 'gemini', provider_model: 'fixture-model' })); });
  expect(screen.queryByText('Late first account reply')).toBeNull();
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(1);
});

it('aborts a pending Chat request when its session expires and never shows a late reply', async () => {
  let oldReply!: (response: Response) => void;
  let signal!: AbortSignal;
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/v1/readiness') return Response.json({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } });
    signal = options!.signal!;
    return new Promise<Response>(resolve => { oldReply = resolve; });
  });
  mount(<AiPilotPage />);
  await screen.findByText(/Provider access is configured/);
  vi.useFakeTimers();
  fireEvent.click(screen.getByRole('button', { name: 'Use short session' }));
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Synthetic expiring request' } });
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  expect(oldReply).toBeTypeOf('function');
  await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
  expect(signal.aborted).toBe(true);
  await act(async () => { oldReply(Response.json({ status: 'success', response: 'Expired account late reply', provider: 'gemini', provider_model: 'fixture-model' })); });
  expect(screen.queryByText('Expired account late reply')).toBeNull();
  expect(screen.queryByLabelText('Your question')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Sign in to your LUQI account' })).toBeTruthy();
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(1);
});

it('clears the optional local guide and its handoff draft on an account change', async () => {
  request.mockResolvedValue(Response.json({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } }));
  mount(<AskLuqiPage />);
  await screen.findByText(/Provider access is configured/);
  fireEvent.change(screen.getByLabelText('What would you like help with?'), { target: { value: 'Help me plan my visit to Cape Town' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find my next step' }));
  fireEvent.click(screen.getByRole('button', { name: 'Use my question in Chat above' }));
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('Help me plan my visit to Cape Town');
  fireEvent.click(screen.getByRole('button', { name: 'Use second account' }));
  expect((screen.getByLabelText('What would you like help with?') as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('');
  expect(screen.queryByRole('button', { name: 'Use my question in Chat above' })).toBeNull();
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
});
