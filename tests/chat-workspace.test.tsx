// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CustomerSessionProvider, useCustomerSession } from '../src/providers/customer-session';
import { ChatWorkspaceProvider } from '../src/providers/chat-workspace';
import WorkspaceLayout from '../src/components/WorkspaceLayout';
import LuqiChatWorkspacePage from '../src/pages/LuqiChatWorkspacePage';

const request = vi.fn();
const result = (question: string) => Response.json({
  status: 'success', response: 'Verified response to ' + question,
  provider: 'gemini', provider_model: 'fixture-model',
});
beforeEach(() => {
  request.mockReset().mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/v1/readiness') return Response.json({
      checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
    });
    if (path === '/api/v1/auth/login') return Response.json({
      token: 'synthetic-token', user: { email: 'pilot@example.invalid' },
    });
    if (path === '/api/v1/luqi-core') return result(JSON.parse(String(options?.body)).user_input);
    throw new Error('Unexpected synthetic route');
  });
  vi.stubGlobal('fetch', request);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function Fixture({ extra }: { extra?: React.ReactNode }) {
  return <MemoryRouter initialEntries={['/chat']}><CustomerSessionProvider><ChatWorkspaceProvider>
    {extra}<WorkspaceLayout><LuqiChatWorkspacePage /></WorkspaceLayout>
  </ChatWorkspaceProvider></CustomerSessionProvider></MemoryRouter>;
}
async function login() {
  fireEvent.click(screen.getByText('Prefer to sign in here?'));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'pilot@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'synthetic-safe-password-2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByLabelText('Your question');
}
async function ask(question: string) {
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: question } });
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand this question may go/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText('Verified response to ' + question);
}
it('renders a two-panel chat-first layout and real service shortcuts without an AI call', async () => {
  render(<Fixture />);
  const sidebar = await screen.findByRole('complementary', { name: 'Luqi Chat sidebar' });
  expect(within(sidebar).getByRole('navigation', { name: 'Jump into Luqi services' })).toBeTruthy();
  expect(within(sidebar).getByRole('link', { name: 'Business desk' }).getAttribute('href')).toBe('/business-desk');
  expect(within(sidebar).getByRole('link', { name: 'Private notes' }).getAttribute('href')).toBe('/companion');
  expect(screen.getByRole('heading', { name: 'Luqi Chat' })).toBeTruthy();
  expect(within(sidebar).getByText(/history is not saved automatically/i)).toBeTruthy();
  expect(request.mock.calls.some(([path]) => path === '/api/v1/luqi-core')).toBe(false);
});
it('shows only confirmed in-tab chats and selecting one never repeats metered inference', async () => {
  render(<Fixture />);
  await login();
  expect(screen.queryByText('Unverified or fabricated chat')).toBeNull();
  await ask('My verified first question');
  const sidebar = await screen.findByRole('complementary', { name: 'Luqi Chat sidebar' });
  const history = within(sidebar).getByRole('group', { name: 'Chats from this tab' });
  expect(within(history).getByRole('button', { name: 'My verified first question', exact: true })).toBeTruthy();
  fireEvent.click(within(sidebar).getByRole('button', { name: 'New chat' }));
  expect(screen.queryByText('Verified response to My verified first question')).toBeNull();
  fireEvent.click(within(history).getByRole('button', { name: 'My verified first question', exact: true }));
  await screen.findByText('Verified response to My verified first question');
  expect((screen.getByRole('checkbox', { name: /I understand this question may go/i }) as HTMLInputElement).checked).toBe(false);
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(1);
});
it('removes confirmed chats immediately on sign-out and never loads private notes', async () => {
  render(<Fixture />);
  await login();
  await ask('Private first account question');
  const sidebar = await screen.findByRole('complementary', { name: 'Luqi Chat sidebar' });
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByText('Verified response to Private first account question')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Private first account question' })).toBeNull();
  expect(request.mock.calls.some(([path]) => String(path).includes('/companion/conversations'))).toBe(false);
});
function Switch() {
  const { acceptSession } = useCustomerSession();
  return <div><button onClick={() => acceptSession({ token: 'one-fixture', user: { email: 'one@example.invalid' } })}>Account one</button>
    <button onClick={() => acceptSession({ token: 'two-fixture', user: { email: 'two@example.invalid' } })}>Account two</button></div>;
}
it('clears the prior identity’s recent thread before painting the next identity', async () => {
  render(<Fixture extra={<Switch />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Account one' }));
  await screen.findByLabelText('Your question');
  await ask('Only the first account knows this');
  fireEvent.click(screen.getByRole('button', { name: 'Account two' }));
  expect(screen.queryByText('Verified response to Only the first account knows this')).toBeNull();
  const sidebar = await screen.findByRole('complementary', { name: 'Luqi Chat sidebar' });
  expect(within(sidebar).queryByRole('button', { name: 'Only the first account knows this' })).toBeNull();
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(1);
});


it('keeps the dock reachable and lets signed-in users manage many in-tab chats without silent storage', async () => {
  render(<Fixture />);
  const dock = screen.getByRole('navigation', { name: 'Mobile chat navigation' });
  expect(within(dock).getByRole('button', { name: 'Show recent chats' })).toBeTruthy();
  await login();
  const sidebar = await screen.findByRole('complementary', { name: 'Luqi Chat sidebar' });
  for (let i = 1; i <= 14; i++) {
    await ask('Synthetic chat topic ' + i);
    fireEvent.click(within(sidebar).getByRole('button', { name: 'New chat' }));
  }
  expect(within(sidebar).getByText('Showing 12 of 14 in-tab chats.')).toBeTruthy();
  fireEvent.click(within(sidebar).getByRole('button', { name: /Show more chats/ }));
  expect(within(sidebar).getByRole('button', { name: 'Synthetic chat topic 1', exact: true })).toBeTruthy();
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Forget Synthetic chat topic 1 from this tab' }));
  expect(within(sidebar).getByRole('group', { name: 'Forget recent chat' })).toBeTruthy();
  fireEvent.click(within(sidebar).getByRole('button', { name: 'Remove from tab' }));
  expect(within(sidebar).queryByRole('button', { name: 'Synthetic chat topic 1' })).toBeNull();
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(14);
  expect(request.mock.calls.some(([path]) => String(path).includes('/companion/conversations'))).toBe(false);
});
