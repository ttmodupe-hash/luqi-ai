// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  const firstUseConsent = screen.queryByRole('checkbox', { name: /I understand AI text may go/i });
  if (firstUseConsent) fireEvent.click(firstUseConsent);
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
  expect(screen.queryByRole('checkbox', { name: /I understand AI text may go/i })).toBeNull();
  expect(screen.getByText(/AI text sharing approved for this signed-in tab/)).toBeTruthy();
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

it('never sends a saved note by merely loading/selecting it and shares it for one explicit reply', async () => {
  request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/v1/readiness') return Response.json({
      checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
    });
    if (path === '/api/v1/auth/login') return Response.json({
      token: 'synthetic-token', user: { email: 'pilot@example.invalid' },
    });
    if (path === '/api/v1/companion/conversations?limit=50') return Response.json({
      conversations: [{ id: 55, title: 'Personal preference', personalityId: 1 }],
    });
    if (path === '/api/v1/companion/conversations/55/messages?limit=50') return Response.json({
      messages: [{ id: 70, role: 'user', content: 'I like numbered steps.', createdAt: null }],
    });
    if (path === '/api/v1/luqi-core') return result(JSON.parse(String(options?.body)).user_input);
    throw new Error('Unexpected synthetic route');
  });
  render(<Fixture />);
  await login();
  fireEvent.click(screen.getByText('More options: companion, context and writing help'));
  fireEvent.click(screen.getByText('Conversation context, country guide and limits (optional)'));
  fireEvent.click(screen.getByText('Personalise this reply with one saved private note'));
  expect(request.mock.calls.some(([path]) => String(path).includes('/companion/conversations'))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Load my saved notes' }));
  const conversation = await screen.findByRole('button', { name: 'Personal preference' });
  fireEvent.click(conversation);
  fireEvent.click(await screen.findByRole('button', { name: 'Select this note' }));
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  await ask('No note should leave Chat yet.');
  const first = JSON.parse(String(request.mock.calls.find(([path]) => path === '/api/v1/luqi-core')?.[1]?.body));
  expect(first.user_input).toBe('No note should leave Chat yet.');
  const share = screen.getByRole('checkbox', { name: /Include the selected note in this one provider request/ });
  expect((share as HTMLInputElement).checked).toBe(false);
  fireEvent.click(share);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'With my chosen note.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await waitFor(() => expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(2));
  const paidCalls = request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core');
  const second = JSON.parse(String(paidCalls[1][1]?.body));
  expect(second.user_input).toContain('I like numbered steps.');
  expect(second.user_input).toContain('With my chosen note.');
  expect((share as HTMLInputElement).checked).toBe(false);
  expect(request.mock.calls.filter(([path]) => String(path).includes('/companion/conversations')).every(([, opts]) => opts?.method === 'GET')).toBe(true);
});

it('requires first-use provider acknowledgement but not repeated checkboxes for each new chat', async () => {
  render(<Fixture />);
  await login();
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'First approved message' } });
  const send = screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement;
  expect(send.disabled).toBe(true);
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  const approval = screen.getByRole('checkbox', { name: /I understand AI text may go/i });
  fireEvent.click(approval);
  expect(screen.queryByRole('checkbox', { name: /I understand AI text may go/i })).toBeNull();
  expect(send.disabled).toBe(false);
  fireEvent.click(send);
  await screen.findByText('Verified response to First approved message');
  const rail = await screen.findByRole('complementary', { name: 'Luqi Chat sidebar' });
  fireEvent.click(within(rail).getByRole('button', { name: 'New chat' }));
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Second approved message' } });
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText('Verified response to Second approved message');
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', { name: 'Change consent' }));
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('checkbox', { name: /I understand AI text may go/i })).toBeTruthy();
});

it('sends on Enter only after approval and treats Shift+Enter as a newline', async () => {
  render(<Fixture />);
  await login();
  const input = screen.getByLabelText('Your question') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: 'Keyboard fixture message' } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand AI text may go/i }));
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  await screen.findByText('Verified response to Keyboard fixture message');
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Check availability' })).toBeNull();
  expect(screen.getAllByRole('link', { name: 'Service status' }).length).toBeGreaterThan(0);
});

it('does not reuse first-account provider approval when the signed-in account changes', async () => {
  render(<Fixture extra={<Switch />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Account one' }));
  await screen.findByLabelText('Your question');
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand AI text may go/i }));
  expect(screen.getByText(/AI text sharing approved for this signed-in tab/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Account two' }));
  const input = screen.getByLabelText('Your question');
  fireEvent.change(input, { target: { value: 'Second account must consent' } });
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('checkbox', { name: /I understand AI text may go/i })).toBeTruthy();
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
});

function syntheticTextFile(name: string, content: string, type = 'text/plain') {
  const file = new File([content], name, { type });
  Object.defineProperty(file, 'arrayBuffer', {
    value: async () => new TextEncoder().encode(content).buffer,
  });
  return file;
}
async function attachTextFile(file: File) {
  fireEvent.change(screen.getByLabelText('Choose a text document'), { target: { files: [file] } });
  await screen.findByRole('region', { name: 'Local document preview' });
}
it('reads a local text attachment without a network request and sends it only after separate approval', async () => {
  render(<Fixture />);
  await login();
  await attachTextFile(syntheticTextFile('fixture-private.txt', 'SYNTHETIC_DOCUMENT_TEXT_123'));
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  expect(screen.getByText(/Local text only/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'What is the topic?' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand AI text may go/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText('Verified response to What is the topic?');
  const first = JSON.parse(String(request.mock.calls.find(([path]) => path === '/api/v1/luqi-core')?.[1]?.body));
  expect(first.user_input).toBe('What is the topic?');
  const share = screen.getByRole('checkbox', { name: /Include this reviewed text with my next question/ });
  expect((share as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByText('Review all document text before sharing'));
  expect(screen.getByText('SYNTHETIC_DOCUMENT_TEXT_123')).toBeTruthy();
  fireEvent.click(share);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Summarise this document.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await waitFor(() => expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(2));
  const second = JSON.parse(String(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')[1][1]?.body));
  expect(second.user_input).toContain('SYNTHETIC_DOCUMENT_TEXT_123');
  expect(second.user_input).not.toContain('fixture-private.txt');
  expect(screen.queryByRole('region', { name: 'Local document preview' })).toBeNull();
});

it('rejects unsupported PDF without a provider call and clears private document on account switch', async () => {
  render(<Fixture extra={<Switch />} />);
  fireEvent.click(screen.getByRole('button', { name: 'Account one' }));
  await screen.findByLabelText('Your question');
  fireEvent.change(screen.getByLabelText('Choose a text document'), {
    target: { files: [syntheticTextFile('fixture.pdf', 'PDF_BYTES', 'application/pdf')] },
  });
  await screen.findByText(/PDF and Word support is still in development/);
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  await attachTextFile(syntheticTextFile('one-account.txt', 'FIRST_ACCOUNT_PRIVATE_FIXTURE'));
  fireEvent.click(screen.getByRole('checkbox', { name: /Include this reviewed text with my next question/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Account two' }));
  expect(screen.queryByText('FIRST_ACCOUNT_PRIVATE_FIXTURE')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Local document preview' })).toBeNull();
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
});

it('blocks sending an opted-in document that exceeds the complete provider input limit', async () => {
  render(<Fixture />);
  await login();
  await attachTextFile(syntheticTextFile('large.txt', 'A'.repeat(4000)));
  fireEvent.click(screen.getByRole('checkbox', { name: /Include this reviewed text with my next question/ }));
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'B'.repeat(2500) } });
  fireEvent.click(screen.getByRole('checkbox', { name: /I understand AI text may go/i }));
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(request.mock.calls.filter(([path]) => path === '/api/v1/luqi-core')).toHaveLength(0);
  expect(screen.getByText(/Question and optional context exceed the allowed input/)).toBeTruthy();
});
