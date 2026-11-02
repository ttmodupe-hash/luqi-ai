// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SavedNotesPeek from '../src/components/SavedNotesPeek';

const request = vi.fn();
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const mount = (token = 'private-fixture') =>
  render(<MemoryRouter><SavedNotesPeek token={token} onNavigate={() => {}} /></MemoryRouter>);
const note = (id: number) => ({ id, title: 'My saved private note ' + id, personalityId: 1 });

it('never fetches saved note titles before the owner chooses to load them', async () => {
  request.mockResolvedValue(Response.json({ conversations: [note(11)] }));
  mount();
  expect(request).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: /Open notes/ }).getAttribute('href')).toBe('/companion');
  fireEvent.click(screen.getByRole('button', { name: 'Load saved notes' }));
  await screen.findByText('My saved private note 11');
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe('/api/v1/companion/conversations?limit=50');
  expect(request.mock.calls[0][1].headers.Authorization).toBe('Bearer private-fixture');
});

it('preserves the chat shell on an HTTP failure and retries exactly once only on demand', async () => {
  request.mockResolvedValueOnce(Response.json({ code: 'PRIVATE-SQL-DIAGNOSTIC' }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ conversations: [note(9)] }));
  render(<MemoryRouter><p>Active Chat stays visible</p>
    <SavedNotesPeek token="private-fixture" onNavigate={() => {}} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Load saved notes' }));
  await screen.findByText(/Could not load saved notes/);
  expect(screen.getByText('Active Chat stays visible')).toBeTruthy();
  expect(screen.queryByText('PRIVATE-SQL-DIAGNOSTIC')).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
  await screen.findByText('My saved private note 9');
  expect(request).toHaveBeenCalledTimes(2);
});

it('paginates only at the owner’s explicit request, with no duplicate note titles', async () => {
  const first = Array.from({ length: 50 }, (_, i) => note(100 - i));
  request.mockResolvedValueOnce(Response.json({ conversations: first }))
    .mockResolvedValueOnce(Response.json({ conversations: [note(49), note(48)] }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Load saved notes' }));
  await screen.findByText('My saved private note 100');
  expect(request).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: 'Show more saved notes' }));
  expect(screen.getByText('My saved private note 51')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Load older saved notes' }));
  await screen.findByText('Show more saved notes');
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[1][0]).toBe('/api/v1/companion/conversations?limit=50&before=51');
  fireEvent.click(screen.getByRole('button', { name: 'Show more saved notes' }));
  expect(screen.getByText('My saved private note 49')).toBeTruthy();
});
