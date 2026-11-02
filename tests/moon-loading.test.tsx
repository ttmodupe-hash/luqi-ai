// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import MoonNowPanel, { type MoonModule } from '../src/components/MoonNowPanel';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const Ready = () => <p>Calculated Moon content ready</p>;

test('Moon starts loading automatically without replacing the surrounding homepage', () => {
  const loader = vi.fn(() => new Promise<MoonModule>(() => {}));
  render(<><h1>Luqi homepage</h1><input aria-label="Existing draft" defaultValue="Keep my draft" /><MoonNowPanel loader={loader}/></>);
  expect(loader).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('heading', { name: 'Luqi homepage' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('Loading the live Moon');
  expect(screen.getByRole('status').style.color).toBe('rgb(24, 61, 48)');
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Keep my draft');
});
test('pending download offers readable manual recovery with an unsaved-work warning', () => {
  const reload = vi.fn();
  render(<MoonNowPanel loader={() => new Promise<MoonModule>(() => {})} onReload={reload}/>);
  expect(reload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Taking longer than expected?'));
  expect(screen.getByText(/copy important drafts first/i).style.color).toBe('rgb(24, 61, 48)');
  fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
  expect(reload).toHaveBeenCalledTimes(1);
});
test('resolved module appears automatically and loader is stable across parent rerenders', async () => {
  const loader = vi.fn(async () => ({ default: Ready }));
  const view = render(<MoonNowPanel loader={loader}/>);
  expect(await screen.findByText('Calculated Moon content ready')).toBeTruthy();
  view.rerender(<MoonNowPanel loader={loader}/>);
  expect(loader).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('status')).toBeNull();
});
test('failed import is isolated and readable, without exposing errors or clearing drafts', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const loader = vi.fn(async () => { throw new Error('failed asset https://example.invalid/private?token=synthetic-test-only'); });
  const reload = vi.fn();
  render(<><input aria-label="Existing draft" defaultValue="Keep my draft"/><MoonNowPanel loader={loader} onReload={reload}/></>);
  expect((await screen.findByRole('alert')).textContent).toContain('other Luqi tools are still available');
  expect(screen.getByRole('alert').style.color).toBe('rgb(24, 61, 48)');
  expect(document.body.textContent).not.toContain('synthetic-test-only');
  expect(document.body.textContent).not.toContain('example.invalid');
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Keep my draft');
  expect(reload).not.toHaveBeenCalled();
  expect(loader).toHaveBeenCalledTimes(1);
});
test('failed module never automatically retries and reload requires an explicit click', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const loader = vi.fn(async () => { throw new Error('synthetic module failure'); });
  const reload = vi.fn();
  const view = render(<MoonNowPanel loader={loader} onReload={reload}/>);
  await screen.findByRole('alert');
  view.rerender(<MoonNowPanel loader={loader} onReload={reload}/>);
  expect(loader).toHaveBeenCalledTimes(1); expect(reload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reload page' }));
  expect(reload).toHaveBeenCalledTimes(1);
});
test('render-time calculation failure also stays within the Moon panel', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken() { throw new Error('synthetic calculation error'); }
  render(<><h1>Luqi homepage</h1><MoonNowPanel loader={async () => ({ default: Broken })}/></>);
  await screen.findByRole('alert');
  expect(screen.getByRole('heading', { name: 'Luqi homepage' })).toBeTruthy();
  expect(document.body.textContent).not.toContain('synthetic calculation error');
});
