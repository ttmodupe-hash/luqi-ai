// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CollaborationDock from '../src/components/CollaborationDock';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('always renders People inside Luqi without a popup, trigger or focus trap', async () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  render(<MemoryRouter><label>Draft<input defaultValue="Keep this draft" /></label><CollaborationDock /></MemoryRouter>);
  const rail = screen.getByRole('complementary', { name: 'Luqi contacts' });
  const panel = screen.getByRole('region', { name: 'Your contacts' });
  expect(rail.contains(panel)).toBe(true);
  expect(screen.getByRole('heading', { name: 'People & private chat' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Contacts' })).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  await screen.findByRole('link', { name: 'Sign in to see contacts' });
  expect(request).not.toHaveBeenCalled();
  const draft = screen.getByLabelText('Draft');
  draft.focus();
  fireEvent.keyDown(panel, { key: 'Escape' });
  // Escape must never collapse a permanent in-page region or steal input focus.
  expect(screen.getByRole('region', { name: 'Your contacts' })).toBeTruthy();
  expect(document.activeElement).toBe(draft);
  expect((draft as HTMLInputElement).value).toBe('Keep this draft');
});
