// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AiPilotPage from '../src/pages/AiPilotPage';
import { CustomerSessionProvider } from '../src/providers/customer-session';
import { MAX_PILOT_QUESTION_CHARS } from '../src/lib/pilot-input';

let available = true;
const inference = vi.fn(); const request = vi.fn();
const answer = () => Response.json({ status: 'success', response: '<script>fixture</script> Sawubona', provider: 'gemini', provider_model: 'fixture-model' });
beforeEach(() => {
  available = true; inference.mockReset().mockImplementation(async () => answer());
  request.mockReset().mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/v1/readiness') return Response.json({ checks: { persistence: 'connected', ai_pilot: available ? 'configured_not_verified' : 'disabled' } }, { status: available ? 200 : 503 });
    if (path === '/api/v1/auth/login') return Response.json({ token: 'fixture-token', user: { email: 'trial@example.invalid' } });
    if (path === '/api/v1/luqi-core') return inference(options);
    throw new Error('Unexpected fixture path');
  });
  vi.stubGlobal('fetch', request);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function login() {
  render(<MemoryRouter><CustomerSessionProvider><AiPilotPage /></CustomerSessionProvider></MemoryRouter>);
  await screen.findByText(/Provider access is configured|AI requests are paused/);
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'trial@example.invalid' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Fixture-Password-2026!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
  await screen.findByLabelText('Your question');
}
function draft() {
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Say hello in isiZulu' } });
}
function consent() { fireEvent.click(screen.getByRole('checkbox')); }

it('requires explicit provider acknowledgement and sends only the entered question once', async () => {
  await login(); draft();
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(inference).not.toHaveBeenCalled(); consent();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  expect(screen.getByText('<script>fixture</script> Sawubona')).toBeTruthy();
  expect(document.querySelector('main script')).toBeNull();
  expect(inference).toHaveBeenCalledTimes(1);
  expect(JSON.parse(inference.mock.calls[0][0].body)).toEqual({ language: 'English', user_input: 'Say hello in isiZulu' });
});
it('keeps submission disabled when the pilot is paused', async () => {
  available = false; await login(); draft(); consent();
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(inference).not.toHaveBeenCalled();
});
it('recovers availability without reloading, losing the signed-in draft or sending it automatically', async () => {
  available = false; await login(); draft(); consent();
  available = true;
  fireEvent.click(screen.getByRole('button', { name: 'Check availability again' }));
  await screen.findByText(/Provider access is configured/);
  expect(screen.getByText(/Signed in as trial@example.invalid/)).toBeTruthy();
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('Say hello in isiZulu');
  expect(request.mock.calls.filter(([path]) => path === '/v1/readiness')).toHaveLength(2);
  expect(inference).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  expect(inference).toHaveBeenCalledTimes(1);
});
it('bounds an availability recheck to ten seconds even if the transport ignores cancellation', async () => {
  await login(); draft(); consent(); vi.useFakeTimers();
  request.mockImplementation(() => new Promise<Response>(() => {}));
  fireEvent.click(screen.getByRole('button', { name: 'Check availability again' }));
  const checking = screen.getByRole('button', { name: 'Checking availability…' }) as HTMLButtonElement;
  expect(checking.disabled).toBe(true);
  fireEvent.click(checking);
  expect(request.mock.calls.filter(([path]) => path === '/v1/readiness')).toHaveLength(2);
  await act(async () => { await vi.advanceTimersByTimeAsync(10_001); });
  expect((screen.getByRole('button', { name: 'Check availability again' }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.getByText(/AI requests are paused/)).toBeTruthy();
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('Say hello in isiZulu');
  expect(request.mock.calls.at(-1)![1].signal.aborted).toBe(true);
  expect(inference).not.toHaveBeenCalled();
});
it('fills a useful starting question without making an AI or Notes request', async () => {
  await login();
  fireEvent.click(screen.getByRole('button', { name: 'Help me study' }));
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('Explain one useful study technique and give me a short example.');
  expect(document.activeElement).toBe(screen.getByLabelText('Your question'));
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(inference).not.toHaveBeenCalled();
  expect(request.mock.calls.some(([path]) => path.includes('conversations'))).toBe(false);
});
it('keeps the last confirmed reply visible during and after a failed follow-up', async () => {
  await login(); draft(); consent();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  let reject!: (error: Error) => void;
  inference.mockImplementation(() => new Promise<Response>((_, fail) => { reject = fail; }));
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'A follow-up question' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  expect(screen.getByText('<script>fixture</script> Sawubona')).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Check availability again' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => reject(new TypeError('synthetic lost reply')));
  await screen.findByText(/The reply could not be confirmed/);
  expect(screen.getByText('<script>fixture</script> Sawubona')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Check availability again' }));
  await screen.findByText(/Provider access is configured/);
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).disabled).toBe(true);
  expect(inference).toHaveBeenCalledTimes(2);
});
it('rejects an incomplete provider answer without displaying partial text or retrying the provider', async () => {
  await login(); draft(); consent();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  inference.mockResolvedValue(Response.json({
    code: 'AI_REPLY_INCOMPLETE',
    response: 'INCOMPLETE_SYNTHETIC_FRAGMENT_SHOULD_NOT_RENDER',
  }, { status: 502 }));
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Please explain the next step' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText(/The provider stopped before completing a reply/);
  expect(screen.getByText('<script>fixture</script> Sawubona')).toBeTruthy();
  expect(screen.queryByText(/INCOMPLETE_SYNTHETIC_FRAGMENT_SHOULD_NOT_RENDER/)).toBeNull();
  expect(inference).toHaveBeenCalledTimes(2);
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(false);
});

it('starts a clean chat without ending the account session or carrying over provider consent', async () => {
  await login(); draft(); consent();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Unsaved follow-up' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Include recent conversation context/ }));
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(screen.getByText('Chat cleared. You are still signed in.')).toBeTruthy();
  expect(screen.getByText(/Signed in as trial@example.invalid/)).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'AI reply' })).toBeNull();
  expect(screen.queryByLabelText(/Include recent conversation context/)).toBeNull();
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('');
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  expect(inference).toHaveBeenCalledTimes(1);
});
it('prevents double sends and discards a late response after signing out', async () => {
  let resolve!: (value: Response) => void;
  inference.mockImplementation(() => new Promise<Response>(r => { resolve = r; }));
  await login(); draft(); consent();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  fireEvent.click(screen.getByRole('button', { name: 'Waiting for a reply…' }));
  expect(inference).toHaveBeenCalledTimes(1);
  const signal = inference.mock.calls[0][0].signal;
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(signal.aborted).toBe(true);
  await act(async () => resolve(answer()));
  expect(screen.queryByRole('heading', { name: 'AI reply' })).toBeNull();
  expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('');
  expect(screen.queryByText('trial@example.invalid')).toBeNull();
});
it('does not retry an ambiguous failure and requires an explicit new-question action', async () => {
  inference.mockRejectedValue(new TypeError('private fixture diagnostic'));
  await login(); draft(); consent(); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText(/The reply could not be confirmed/);
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  expect(inference).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Start a new question' }));
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('');
  expect(inference).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('private fixture diagnostic')).toBeNull();
});
it('clears the account when authorization expires', async () => {
  inference.mockResolvedValue(new Response('', { status: 401 }));
  await login(); draft(); consent(); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText('Your session ended. Sign in again.');
  expect(screen.queryByLabelText('Your question')).toBeNull();
  expect(screen.queryByText('trial@example.invalid')).toBeNull();
});
it('reports the daily allowance separately from the monthly allowance', async () => {
  inference.mockResolvedValue(Response.json({ code: 'AI_USER_DAILY_QUOTA_EXHAUSTED' }, { status: 429 }));
  await login(); draft(); consent(); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText(/Your daily allowance of 20/);
  expect(inference).toHaveBeenCalledTimes(1);
});
it('aborts after 45 seconds without making a second provider request', async () => {
  await login(); draft(); consent(); vi.useFakeTimers();
  inference.mockImplementation((options: RequestInit) => new Promise<Response>((_, reject) => {
    options.signal!.addEventListener('abort', () => reject(new Error('fixture timeout')), { once: true });
  }));
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await act(async () => { await vi.advanceTimersByTimeAsync(45_001); });
  expect(screen.getByText(/The reply could not be confirmed/)).toBeTruthy();
  expect(inference).toHaveBeenCalledTimes(1);
});

it('keeps an over-limit draft intact and blocks both button and form submission', async () => {
  await login(); consent();
  const question = 'x'.repeat(MAX_PILOT_QUESTION_CHARS) + 'END-TEST';
  const input = screen.getByLabelText('Your question') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value: question } });
  expect(input.value).toBe(question);
  expect(input.getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByText(/It will not be sent or shortened automatically/)).toBeTruthy();
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.submit(input.closest('form')!);
  expect(inference).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: 'A corrected question' } });
  expect(input.hasAttribute('aria-invalid')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  expect(inference).toHaveBeenCalledTimes(1);
});
it('allows a padded draft when the exact trimmed question fits and sends only that question', async () => {
  await login(); consent();
  const accepted = 'x'.repeat(MAX_PILOT_QUESTION_CHARS - 11) + 'END-TEST';
  const draft = ' '.repeat(100) + accepted + '\n'.repeat(100);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: draft } });
  expect((screen.getByRole('button', { name: 'Send question' }) as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  expect(inference).toHaveBeenCalledTimes(1);
  expect(JSON.parse(inference.mock.calls[0][0].body)).toEqual({ language: 'English', user_input: accepted });
});

it('reports pre-spend input failure without a charged-attempt warning or clearing the draft', async () => {
  inference.mockResolvedValue(Response.json({ code: 'AI_INPUT_TOO_LARGE' }, { status: 400 }));
  await login(); draft(); consent(); fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByText(/no provider attempt was started/);
  expect((screen.getByLabelText('Your question') as HTMLTextAreaElement).value).toBe('Say hello in isiZulu');
  expect(screen.queryByText(/Failed provider attempts may/)).toBeNull();
  expect(inference).toHaveBeenCalledTimes(1);
});

it('keeps conversation in memory and sends follow-up context only with explicit opt-in', async () => {
  await login(); consent(); draft();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  expect(inference).toHaveBeenCalledTimes(1);
  expect(JSON.parse(inference.mock.calls[0][0].body)).toEqual({ language: 'English', user_input: 'Say hello in isiZulu' });

  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'What about Durban?' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await waitFor(() => expect(inference).toHaveBeenCalledTimes(2));
  await screen.findByRole('heading', { name: 'Earlier conversation' });
  expect(JSON.parse(inference.mock.calls[1][0].body)).toEqual({ language: 'English', user_input: 'What about Durban?' });

  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'How do I plan my visit?' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Include recent conversation context/ }));
  expect(screen.getByText(/Review the conversation context to be sent/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await waitFor(() => expect(inference).toHaveBeenCalledTimes(3));
  const body = JSON.parse(inference.mock.calls[2][0].body);
  expect(body.user_input).toBe('How do I plan my visit?');
  expect(body.history).toHaveLength(4);
  expect(body.history[0]).toEqual({ sender: 'user', text: 'Say hello in isiZulu' });
  expect(JSON.stringify(body)).not.toContain('trial@example.invalid');
  await screen.findByRole('heading', { name: 'AI reply' });
  const contextToggle = screen.getByRole('checkbox', { name: /Include recent conversation context/ }) as HTMLInputElement;
  expect(contextToggle.checked).toBe(false);
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'One more follow-up without context' } });
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await waitFor(() => expect(inference).toHaveBeenCalledTimes(4));
  expect(JSON.parse(inference.mock.calls[3][0].body)).toEqual({ language: 'English', user_input: 'One more follow-up without context' });

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(screen.queryByText(/Earlier conversation/)).toBeNull();
  expect(screen.queryByLabelText(/Include recent conversation context/)).toBeNull();
  expect(inference).toHaveBeenCalledTimes(4);
});

it('offers a real local follow-through only after a confirmed AI reply, with no tool execution', async () => {
  await login();
  fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Help me study for an exam' } });
  consent();
  expect(screen.queryByRole('link', { name: 'Open study desk' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Send question' }));
  await screen.findByRole('heading', { name: 'AI reply' });
  const next = screen.getByRole('link', { name: 'Open study desk' });
  expect(next.getAttribute('href')).toBe('/study-desk');
  expect(screen.getByText(/nothing is sent or booked automatically/i)).toBeTruthy();
  expect(inference).toHaveBeenCalledTimes(1);
  expect(request.mock.calls.filter(([path]) => String(path).includes('/study-desk'))).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
  expect(screen.queryByRole('link', { name: 'Open study desk' })).toBeNull();
});
