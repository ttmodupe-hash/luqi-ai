// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SalesBoard from '../src/components/SalesBoard';

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  vi.stubGlobal('crypto', { randomUUID: () => 'da9c1eb2-62f6-45fb-b7f9-a989521270ae' });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('adds a prospect from a generated quotation but makes no requests or client-side persistent writes', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
  render(<MemoryRouter><SalesBoard suggestedQuote={{ alias: 'Bakery client', amountZar: '300.75' }} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Use current quotation details' }));
  expect((screen.getByLabelText('Client nickname') as HTMLInputElement).value).toBe('Bakery client');
  expect((screen.getByLabelText('Quote amount (ZAR)') as HTMLInputElement).value).toBe('300.75');
  fireEvent.change(screen.getByLabelText('Next follow-up date (optional)'), { target: { value: '2026-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add to local board' }));
  expect(screen.getByRole('list', { name: 'Local prospect records' })).toBeTruthy();
  expect(screen.getByText('Bakery client')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Download board JSON' })).toBeTruthy();
  expect(screen.getByText(/not encrypted/)).toBeTruthy();
  expect(fetch).not.toHaveBeenCalled();
  expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
  fireEvent.change(screen.getByLabelText('Stage for Bakery client'), { target: { value: 'won' } });
  expect(screen.getByText(/Marked won, not cash received/)).toBeTruthy();
  expect((screen.getByLabelText('Follow-up date for Bakery client') as HTMLInputElement).disabled).toBe(true);
});
it('requires confirmation for local removal', () => {
  render(<MemoryRouter><SalesBoard /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Client nickname'), { target: { value: 'Client A' } });
  fireEvent.change(screen.getByLabelText('Quote amount (ZAR)'), { target: { value: '100' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add to local board' }));
  fireEvent.click(screen.getByRole('button', { name: 'Remove local record' }));
  expect(screen.getByText('Client A')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Keep record' }));
  expect(screen.getByText('Client A')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Remove local record' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm local removal' }));
  expect(screen.queryByText('Client A')).toBeNull();
});
it('rejects invalid amounts without saving a record', () => {
  render(<MemoryRouter><SalesBoard /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Client nickname'), { target: { value: 'Client A' } });
  fireEvent.change(screen.getByLabelText('Quote amount (ZAR)'), { target: { value: '12.345' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add to local board' }));
  expect(screen.getByRole('alert').textContent).toContain('Check the alias');
  expect(screen.queryByRole('list', { name: 'Local prospect records' })).toBeNull();
});
