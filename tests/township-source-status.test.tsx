// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TownshipSourceStatus from '../src/components/TownshipSourceStatus';
import TownshipEconomyPage from '../src/pages/TownshipEconomyPage';
import { TOWNSHIP_RECHECK_AFTER, TOWNSHIP_REVIEWED_ON } from '../src/lib/township-economy';

const cutoff = Date.parse(TOWNSHIP_RECHECK_AFTER + 'T23:59:59+02:00');
const fetchMock = vi.fn();
const status = () => screen.getByRole('status', { name: 'Township programme review status' });
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(cutoff - 1000);
  fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it('shows unchanged review dates and crosses the exact existing boundary without a new verification', () => {
  render(<TownshipSourceStatus />);
  expect(status().textContent).toContain('has a dated review');
  expect(screen.getByText(new RegExp('Last source review: ' + TOWNSHIP_REVIEWED_ON)).textContent).toContain(TOWNSHIP_RECHECK_AFTER);
  act(() => vi.advanceTimersByTime(1000));
  expect(status().textContent).toContain('has a dated review');
  act(() => vi.advanceTimersByTime(1));
  expect(status().textContent).toContain('needs a new review');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('revalidates a resumed tab without clearing inputs, calculations, original guides or tools', () => {
  render(<MemoryRouter><TownshipEconomyPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Workbench business name'), { target: { value: 'Ubuntu Salon' } });
  fireEvent.change(screen.getByLabelText('Workbench selling price (ZAR)'), { target: { value: '150' } });
  fireEvent.change(screen.getByLabelText('Workbench direct cost per sale (ZAR)'), { target: { value: '100' } });
  fireEvent.change(screen.getByLabelText('Workbench fixed costs for the period (ZAR)'), { target: { value: '1000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Calculate my sales target' }));
  const pricing = screen.getByRole('status', { name: 'Workbench pricing result' });
  expect(pricing.textContent).toContain('20');
  vi.setSystemTime(cutoff + 1);
  fireEvent.focus(window);
  expect(status().textContent).toContain('needs a new review');
  expect((screen.getByLabelText('Workbench business name') as HTMLInputElement).value).toBe('Ubuntu Salon');
  expect(screen.getByRole('status', { name: 'Workbench pricing result' })).toBe(pricing);
  expect(within(screen.getByRole('region', { name: 'Township official programmes' })).getAllByRole('link', { name: 'Open original official source' })).toHaveLength(8);
  expect(screen.getByRole('button', { name: 'Download my private action plan' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Save editable business project' }).hasAttribute('disabled')).toBe(false);
  expect(fetchMock).not.toHaveBeenCalled();
});

it('rechecks visibility changes and places the status within the workbench', () => {
  render(<MemoryRouter><TownshipEconomyPage /></MemoryRouter>);
  expect(document.getElementById('township-workbench')?.contains(status())).toBe(true);
  vi.setSystemTime(cutoff + 60_000);
  fireEvent(document, new Event('visibilitychange'));
  expect(status().textContent).toContain('needs a new review');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('focuses retained original sources without navigating away from unfinished work', () => {
  render(<MemoryRouter><TownshipEconomyPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('My next actions and questions'), { target: { value: 'Confirm equipment prices' } });
  fireEvent.click(screen.getByRole('button', { name: 'View original programme sources' }));
  expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Township official programmes' }));
  expect((screen.getByLabelText('My next actions and questions') as HTMLTextAreaElement).value).toBe('Confirm equipment prices');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('cleans its timer and event handlers on unmount', () => {
  const windowRemove = vi.spyOn(window, 'removeEventListener');
  const documentRemove = vi.spyOn(document, 'removeEventListener');
  const { unmount } = render(<TownshipSourceStatus />);
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(windowRemove).toHaveBeenCalledWith('focus', expect.any(Function));
  expect(documentRemove).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
});
