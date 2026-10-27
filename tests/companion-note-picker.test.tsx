// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CompanionNotePicker from '../src/components/CompanionNotePicker';

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let request = vi.fn();

beforeEach(() => {
  request = vi.fn();
  vi.stubGlobal('fetch', request);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function open(onSelect = vi.fn()) {
  render(<MemoryRouter><CompanionNotePicker token="synthetic-private-token" disabled={false}
    selected={null} onSelect={onSelect} /></MemoryRouter>);
  return onSelect;
}

it('does not read private notes or call AI on render', () => {
  open();
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByText(/does not read your saved notes automatically/)).toBeTruthy();
});

it('loads only after a click, selects a user-authored short note, and never sends it to a model', async () => {
  const picked = open();
  request.mockResolvedValueOnce(response({ conversations: [{ id: 5, title: 'Preferences', personalityId: 1 }] }));
  fireEvent.click(screen.getByRole('button', { name: 'Load my saved notes' }));
  const conversation = await screen.findByRole('button', { name: 'Preferences' });
  expect(request).toHaveBeenCalledTimes(1);
  expect(String(request.mock.calls[0][0])).toContain('/api/v1/companion/conversations?limit=50');
  expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer synthetic-private-token');
  request.mockResolvedValueOnce(response({ messages: [
    { id: 7, role: 'user', content: 'I prefer concise explanations.', createdAt: null },
    { id: 6, role: 'assistant', content: 'This should not be selectable', createdAt: null },
  ] }));
  fireEvent.click(conversation);
  const select = await screen.findByRole('button', { name: 'Select this note' });
  expect(screen.queryByText('This should not be selectable')).toBeNull();
  fireEvent.click(select);
  expect(picked).toHaveBeenCalledTimes(2); // Clear stale selection when opening a conversation.
  expect(picked).toHaveBeenNthCalledWith(1, null);
  expect(picked).toHaveBeenLastCalledWith({
    conversationId: 5, messageId: 7, title: 'Preferences', content: 'I prefer concise explanations.',
  });
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls.every(([,init]) => init.method === 'GET')).toBe(true);
  expect(request.mock.calls.every(([path]) => !String(path).includes('/luqi-core'))).toBe(true);
});

it('does not silently shorten long notes to send them', async () => {
  const picked = open();
  request.mockResolvedValueOnce(response({ conversations: [{ id: 5, title: 'Preferences', personalityId: 1 }] }));
  fireEvent.click(screen.getByRole('button', { name: 'Load my saved notes' }));
  const conversation = await screen.findByRole('button', { name: 'Preferences' });
  request.mockResolvedValueOnce(response({ messages: [{ id: 9, role: 'user',
    content: 'x'.repeat(351), createdAt: null }] }));
  fireEvent.click(conversation);
  const refused = await screen.findByRole('button', { name: 'Note too long to share' });
  expect((refused as HTMLButtonElement).disabled).toBe(true);
  expect(picked).not.toHaveBeenCalledWith(expect.objectContaining({ messageId: 9 }));
});

it('treats private storage failures as unavailable, not an AI reply', async () => {
  open();
  request.mockResolvedValueOnce(response({ code: 'CONVERSATION_STORAGE_UNAVAILABLE' }, 503));
  fireEvent.click(screen.getByRole('button', { name: 'Load my saved notes' }));
  expect(await screen.findByRole('alert')).toHaveProperty('textContent',
    'Saved notes could not be loaded. No notes were changed or sent to AI.');
  expect(request).toHaveBeenCalledTimes(1);
});
