// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import DriverRightsPage from '../src/pages/DriverRightsPage';

const net = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-28T15:00:00+02:00'));
  net.mockReset();
  vi.stubGlobal('fetch', net);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
function show() { render(<MemoryRouter><DriverRightsPage /></MemoryRouter>); }

it('offers three safety steps on arrival without accounts, network, microphone or case uploads', () => {
  show();
  expect(screen.getByRole('heading', { name: 'Driver rights and safe traffic stops' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Luqi roadside safety — three immediate steps' })).toBeTruthy();
  expect(screen.getByText(/Do not use your phone while driving/)).toBeTruthy();
  expect(screen.getByText(/Luqi does not place calls or share your location/)).toBeTruthy();
  expect(screen.getAllByRole('listitem').length).toBeGreaterThan(3);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('file')).toBeNull();
  expect(net).not.toHaveBeenCalled();
});

it('switches safely from corruption protocol to sourced searches and warrant information', () => {
  show();
  fireEvent.click(screen.getByRole('button', { name: 'Money demanded' }));
  expect(screen.getByRole('heading', { name: 'Luqi roadside safety — money demanded' })).toBeTruthy();
  expect(screen.getByText(/Do not offer or agree to a personal payment/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Vehicle search' }));
  expect(screen.getByText(/do not assume you can stop a lawful search/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Fines and warrants' }));
  const article = screen.getByRole('article', { name: 'An unpaid fine is not itself an arrest warrant' });
  expect(within(article).getByText(/AARTO infringement notices are administrative/)).toBeTruthy();
  for (const link of within(article).getAllByRole('link')) {
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  }
  expect(net).not.toHaveBeenCalled();
});

it('does not invent isiZulu or Sepitori legal translations or imply certified content', () => {
  show();
  fireEvent.change(screen.getByLabelText('Preferred explanation language'), { target: { value: 'sepitori' } });
  expect(screen.getByText(/Showing English only; this is not a translation/)).toBeTruthy();
  expect(screen.getByText(/Sepitori is a distinct review track/)).toBeTruthy();
  expect(net).not.toHaveBeenCalled();
});

it('hides unreviewed legal summaries after expiry but keeps safety, sources and real referral contacts', () => {
  vi.setSystemTime(new Date('2026-11-12T08:00:00+02:00'));
  show();
  expect(screen.getByRole('alert').textContent).toMatch(/Detailed legal summaries have expired/);
  expect(screen.queryByRole('article')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Original sources' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Luqi roadside safety — three immediate steps' })).toBeTruthy();
  expect(screen.getByText(/National Traffic Call Centre:/)).toBeTruthy();
  expect(net).not.toHaveBeenCalled();
});
