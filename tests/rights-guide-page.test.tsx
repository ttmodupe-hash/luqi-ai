// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import RightsGuidePage from '../src/pages/RightsGuidePage';

const requests = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T08:53:00+02:00'));
  requests.mockReset();
  vi.stubGlobal('fetch', requests);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

function show() {
  render(<MemoryRouter><RightsGuidePage /></MemoryRouter>);
}

it('renders every explanation alongside linked original sources and does not fetch, submit or store personal data', () => {
  show();
  expect(screen.getByRole('heading', { name: /Understand your rights/ })).toBeTruthy();
  expect(screen.getByRole('heading', { name: /Important: LUQI can make mistakes/ })).toBeTruthy();
  expect(screen.getByRole('heading', { name: /Find the current official application route/ })).toBeTruthy();
  const article = screen.getByRole('article', { name: /Find the current official application route/ });
  const links = within(article).getAllByRole('link');
  expect(links.length).toBeGreaterThanOrEqual(2);
  for (const link of links) {
    expect(link.getAttribute('href')?.startsWith('https://')).toBe(true);
    expect(link.getAttribute('rel')).toMatch(/noopener/);
    expect(link.getAttribute('rel')).toMatch(/noreferrer/);
  }
  expect(screen.queryByRole('button', { name: /submit.*claim|book.*appointment|pay now/i })).toBeNull();
  expect(requests).not.toHaveBeenCalled();
});

it('keeps Sepitori visible but refuses to invent unreviewed legal translations', () => {
  show();
  const language = screen.getByLabelText('Preferred explanation language') as HTMLSelectElement;
  fireEvent.change(language, { target: { value: 'sepitori' } });
  expect(language.value).toBe('sepitori');
  expect(screen.getByText(/Sepitori .* legal explanations are not yet independently reviewed/)).toBeTruthy();
  expect(screen.getByText(/Showing the English source-linked text instead/)).toBeTruthy();
  expect(screen.getByRole('heading', { name: /Find the current official application route/ })).toBeTruthy();
  expect(requests).not.toHaveBeenCalled();
});

it('navigates public topics locally and preserves urgent referral link', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Interview and interpreter' }));
  expect(screen.getByRole('heading', { name: 'Ask for an interpreter if needed' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Decisions and appeals' }));
  expect(screen.getByRole('heading', { name: /A refusal or appeal/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Urgent legal support' }));
  expect(screen.getByRole('heading', { name: /Detention, removal threats/ })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open UNHCR legal-assistance directory' }).getAttribute('href'))
    .toBe('https://help.unhcr.org/southafrica/topics/legal-assistance/');
  expect(requests).not.toHaveBeenCalled();
});

it('fails closed when source review expires but leaves official source and legal help links visible', () => {
  vi.setSystemTime(new Date('2026-11-03T08:00:00+02:00'));
  show();
  expect(screen.getByRole('alert').textContent).toMatch(/Source review expired/);
  expect(screen.queryByRole('heading', { name: /Find the current official application route/ })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Original sources' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open UNHCR legal-assistance directory' })).toBeTruthy();
});
