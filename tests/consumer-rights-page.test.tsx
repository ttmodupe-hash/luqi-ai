// @vitest-environment jsdom
import React from 'react';
import { act, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ConsumerRightsAssistant from '../src/components/ConsumerRightsAssistant';

const requests = vi.fn();
const copied = vi.fn();
let priorClipboard: PropertyDescriptor | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T09:56:00+02:00'));
  requests.mockReset();
  copied.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('fetch', requests);
  priorClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: copied },
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  if (priorClipboard) Object.defineProperty(navigator, 'clipboard', priorClipboard);
  else delete (navigator as Navigator & { clipboard?: Clipboard }).clipboard;
});
function show() {
  render(<ConsumerRightsAssistant />);
}
function enter(story: string) {
  fireEvent.change(screen.getByLabelText('What happened? (redact personal details)'), { target: { value: story } });
}
function prepare() {
  fireEvent.click(screen.getByRole('button', { name: 'Prepare my options locally' }));
}

it('does not solicit case IDs, send network requests or display any fabricated legal notice', () => {
  show();
  expect(screen.getByRole('heading', { name: 'Consumer rights: understand your options' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'LUQI can make mistakes' })).toBeTruthy();
  expect(screen.getByText(/does not send it to an AI provider or LUQI's server/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /generate legal|send complaint|file case|pay/i })).toBeNull();
  enter('I bought a kettle about three months ago and it stopped heating.');
  fireEvent.change(screen.getByLabelText('What kind of problem is it?'), { target: { value: 'DEFECTIVE_GOODS' } });
  prepare();
  expect(screen.getByRole('heading', { name: 'Defective or unsafe goods' })).toBeTruthy();
  const links = screen.getByRole('region', { name: 'Official legislation and complaint information' });
  expect(within(links).getAllByRole('link').length).toBeGreaterThan(0);
  expect(within(links).getByRole('link', { name: /South African Government/ }).getAttribute('href'))
    .toBe('https://www.gov.za/documents/consumer-protection-act');
  expect(requests).not.toHaveBeenCalled();
  expect(copied).not.toHaveBeenCalled();
});

it('changes dispute categories without presenting stale warranty guidance for banking', () => {
  show();
  enter('The store refused to explain why the kettle stopped working.');
  fireEvent.change(screen.getByLabelText('What kind of problem is it?'), { target: { value: 'DEFECTIVE_GOODS' } });
  prepare();
  expect(screen.getByText(/Sections 55 and 56/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('What kind of problem is it?'), { target: { value: 'UNAUTHORIZED_DEBIT_ORDER' } });
  expect(screen.queryByRole('heading', { name: 'Defective or unsafe goods' })).toBeNull();
  enter('I have a disputed bank debit order and I contacted the bank.');
  prepare();
  expect(screen.getByRole('heading', { name: 'Disputed debit order or bank transaction' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /National Financial Ombud/ })).toBeTruthy();
  const categorySources = screen.getByRole('region', { name: 'Official legislation and complaint information' });
  expect(within(categorySources).queryByRole('link', { name: /Consumer Protection Act 68/ })).toBeNull();
  expect(requests).not.toHaveBeenCalled();
});

it('makes the complaint correspondence entirely user editable and copies only the reviewed draft', async () => {
  show();
  enter('An example supplier has not explained the unexpected charge.');
  prepare();
  const draft = screen.getByLabelText('Your editable factual complaint draft') as HTMLTextAreaElement;
  expect(draft.value).toContain('My account of what happened');
  expect(draft.value).not.toMatch(/FORMAL DEMAND|criminal offence|statutory notice/i);
  fireEvent.change(draft, { target: { value: 'A carefully reviewed and redacted complaint example.' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Copy reviewed draft' }));
  });
  expect(copied).toHaveBeenCalledTimes(1);
  expect(copied).toHaveBeenCalledWith('A carefully reviewed and redacted complaint example.');
  expect(screen.getByText(/Copied locally/)).toBeTruthy();
  expect(requests).not.toHaveBeenCalled();
});

it('refuses to prepare detailed guidance after its source review has expired', () => {
  vi.setSystemTime(new Date('2026-11-03T09:00:00+02:00'));
  show();
  expect(screen.getByRole('alert').textContent).toMatch(/source review has expired/);
  expect((screen.getByRole('button', { name: 'Prepare my options locally' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('heading', { name: 'Options to explore' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Official sources and referral organisations' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /National Consumer Commission.*Lodging/ })).toBeTruthy();
  expect(requests).not.toHaveBeenCalled();
});
