// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CollaborationDock from '../src/components/CollaborationDock';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('expands within the page without a dialog, overlay or focus trap and closes with Escape', async () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  render(<MemoryRouter><label>Draft<input defaultValue="Keep this draft" /></label><CollaborationDock /></MemoryRouter>);
  const trigger = screen.getByRole('button', { name: 'Open Circles & Chat' });
  expect(trigger.getAttribute('aria-haspopup')).toBeNull();
  expect(screen.queryByRole('region', { name: 'Circles & Chat' })).toBeNull();
  fireEvent.click(trigger);
  const panel = screen.getByRole('region', { name: 'Circles & Chat' });
  expect(panel).toBe(document.activeElement);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  await screen.findByRole('link', { name: 'Sign in to Luqi' });
  expect(request).not.toHaveBeenCalled();
  const draft = screen.getByLabelText('Draft'); draft.focus();
  expect(document.activeElement).toBe(draft);
  fireEvent.keyDown(panel, { key: 'Escape' });
  expect(trigger).toBe(document.activeElement);
  expect(screen.queryByRole('region', { name: 'Circles & Chat' })).toBeNull();
  expect((draft as HTMLInputElement).value).toBe('Keep this draft');
});
