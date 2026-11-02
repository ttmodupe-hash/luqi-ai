// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import DiscoveryDeck from '../src/components/DiscoveryDeck';
import WorkspacePlaybar, { readCalmPreference } from '../src/components/WorkspacePlaybar';
import { workspaceTools } from '../src/components/workspace-catalog';
afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });
it('opens only existing tools through deliberate links and mixes interests without a request or navigation', () => {
  const request = vi.spyOn(window, 'fetch');
  render(<MemoryRouter><DiscoveryDeck /></MemoryRouter>);
  expect(screen.getAllByRole('link')).toHaveLength(3);
  fireEvent.click(screen.getByRole('button', { name: 'Learn & play' }));
  expect(screen.getByRole('link', { name: /Physics lab/ }).getAttribute('href')).toBe('/pendulum-lab');
  fireEvent.click(screen.getByRole('button', { name: 'Mix it up' }));
  expect(screen.getByRole('button', { name: 'Create' }).getAttribute('aria-pressed')).toBe('true');
  for (let n = 0; n < 6; n++) {
    fireEvent.click(screen.getByRole('button', { name: 'Mix it up' }));
    for (const link of screen.getAllByRole('link')) expect(workspaceTools.some(t => t.ready && t.path === link.getAttribute('href'))).toBe(true);
  }
  expect(request).not.toHaveBeenCalled();
});
it('keeps the motion preference usable when storage is denied', () => {
  localStorage.setItem('luqi:calm-mode', 'true'); expect(readCalmPreference()).toBe(true);
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('blocked'); });
  expect(readCalmPreference()).toBe(false);
  const change = vi.fn(); render(<MemoryRouter><WorkspacePlaybar calm={false} onCalm={change} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Calm mode' })); expect(change).toHaveBeenCalledWith(true);
});
it('reports device connection without representing it as current AI or service health', () => {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  render(<MemoryRouter><WorkspacePlaybar calm onCalm={() => {}} /></MemoryRouter>);
  expect(screen.getByText('Device online')).toBeTruthy();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
  fireEvent(window, new Event('offline'));
  expect(screen.getByText('Device offline')).toBeTruthy();
  expect(screen.queryByText('AI online')).toBeNull();
});
