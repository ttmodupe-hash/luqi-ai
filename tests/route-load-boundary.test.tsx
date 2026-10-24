// @vitest-environment jsdom
import React, { lazy } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import RouteLoadBoundary from '../src/components/RouteLoadBoundary';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const wrap = (children: React.ReactNode, reload = vi.fn()) => render(<MemoryRouter><RouteLoadBoundary onReload={reload}>{children}</RouteLoadBoundary></MemoryRouter>);

it('renders ready core content without a loading message or reload', () => {
  const reload = vi.fn(); wrap(<h1>Ready account</h1>, reload);
  expect(screen.getByRole('heading', { name: 'Ready account' })).toBeTruthy();
  expect(screen.queryByText('Loading this tool…')).toBeNull(); expect(reload).not.toHaveBeenCalled();
});
it('announces a pending download, then renders the tool', async () => {
  let complete!: (module: { default: React.ComponentType }) => void;
  const Tool = lazy(() => new Promise<{ default: React.ComponentType }>(resolve => { complete = resolve; }));
  wrap(<Tool />);
  expect(screen.getByRole('status').getAttribute('aria-busy')).toBe('true');
  await act(async () => complete({ default: () => <h1>Selected tool</h1> }));
  expect(screen.getByRole('heading', { name: 'Selected tool' })).toBeTruthy();
  expect(screen.queryByRole('status')).toBeNull();
});
it('redacts rejected import diagnostics and never retries or reloads automatically', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const load = vi.fn(async () => { throw new Error('PRIVATE-URL-TOKEN-OR-DIAGNOSTIC'); });
  const Tool = lazy(load); const reload = vi.fn(); wrap(<Tool />, reload);
  await screen.findByRole('heading', { name: 'This page could not load' });
  expect(document.body.textContent).not.toContain('PRIVATE-');
  expect(load).toHaveBeenCalledTimes(1); expect(reload).not.toHaveBeenCalled();
  expect(screen.getByText(/Reloading clears unsaved text/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
  expect(reload).toHaveBeenCalledTimes(1); expect(load).toHaveBeenCalledTimes(1);
});
it('a failed tool does not trap the user away from the eager getting-started page', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Tool = lazy(async () => { throw new Error('private failure'); });
  const reload = vi.fn();
  render(<MemoryRouter initialEntries={['/tool']}><RouteLoadBoundary onReload={reload}><Routes>
    <Route path="/tool" element={<Tool />} /><Route path="/start" element={<h1>Getting started fixture</h1>} />
  </Routes></RouteLoadBoundary></MemoryRouter>);
  await screen.findByRole('alert'); fireEvent.click(screen.getByRole('link', { name: 'Back to getting started' }));
  await screen.findByRole('heading', { name: 'Getting started fixture' });
  expect(screen.queryByRole('alert')).toBeNull(); expect(reload).not.toHaveBeenCalled();
});
it('also handles a render failure without exposing its content', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): React.ReactNode { throw new Error('PRIVATE-CUSTOMER-CONTENT'); }
  wrap(<Broken />); expect(screen.getByRole('alert')).toBeTruthy();
  expect(document.body.textContent).not.toContain('PRIVATE-CUSTOMER-CONTENT');
});
