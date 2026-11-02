// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import AfricanBiblicalStudy from '../src/components/AfricanBiblicalStudy';
const current = new Date('2026-11-01T20:00:00Z');
afterEach(cleanup);
function openStudy() { fireEvent.click(screen.getByRole('button', { name: 'Explore African biblical history' })); }

test('inviting study opens in place without an account', () => {
  render(<AfricanBiblicalStudy now={current} />);
  expect(screen.getByRole('heading', { name: 'Africa and African Peoples in the Bible' })).toBeTruthy();
  expect(screen.queryByRole('group', { name: 'African biblical study topics' })).toBeNull();
  openStudy();
  expect(within(screen.getByRole('group', { name: 'African biblical study topics' })).getAllByRole('button')).toHaveLength(7);
  expect(screen.getByRole('button', { name: 'Close African history study' }).getAttribute('aria-expanded')).toBe('true');
});
test('topic and layer controls reveal the right correction', () => {
  render(<AfricanBiblicalStudy now={current} />); openStudy();
  fireEvent.click(screen.getByRole('button', { name: 'Nimrod and early kingdoms' }));
  expect(screen.getByRole('article').textContent).toContain('Cush’s son');
  fireEvent.click(screen.getByRole('button', { name: 'Explore the evidence' }));
  expect(screen.getByRole('article').textContent).toContain('no independently identified inscription');
  fireEvent.click(screen.getByRole('button', { name: 'Simon of Cyrene' }));
  expect(screen.getByRole('button', { name: 'Read the text' }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('article').textContent).toContain('does not specify his complexion');
});
test('reflections are labelled as activities, not invented quotations', () => {
  render(<AfricanBiblicalStudy now={current} />); openStudy();
  fireEvent.click(screen.getByRole('button', { name: 'Reflect and discuss' }));
  expect(screen.getByRole('article').textContent).toContain('Luqi-designed activity');
  expect(within(screen.getByRole('article')).queryAllByRole('link')).toHaveLength(0);
});
test('quiz checks literal evidence and can be reset', () => {
  render(<AfricanBiblicalStudy now={current} />); openStudy();
  fireEvent.click(screen.getByText('Try four evidence-reading questions'));
  fireEvent.click(screen.getByRole('radio', { name: 'Ham', exact: true }));
  expect(screen.getByRole('status').textContent).toContain('Review the source');
  fireEvent.click(screen.getByRole('radio', { name: 'Cush', exact: true }));
  expect(screen.getByRole('status').textContent).toContain('Supported by the source');
  fireEvent.click(screen.getByRole('button', { name: 'Reset practice answers' }));
  expect(screen.queryByRole('status')).toBeNull();
  expect((screen.getByRole('radio', { name: 'Cush', exact: true }) as HTMLInputElement).checked).toBe(false);
});
test('expired content withholds summaries and practice but retains source links', () => {
  render(<AfricanBiblicalStudy now={new Date('2027-03-01T00:00:00Z')} />); openStudy();
  expect(screen.getByRole('alert').textContent).toContain('due for source review');
  expect(screen.queryByRole('group', { name: 'African biblical study topics' })).toBeNull();
  expect(screen.queryByText('Try four evidence-reading questions')).toBeNull();
  expect(screen.getAllByRole('link')).toHaveLength(13);
});
test('invalid device dates fail closed', () => {
  render(<AfricanBiblicalStudy now={new Date(NaN)} />); openStudy();
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.queryByRole('article')).toBeNull();
});
test('external links are labelled and cannot control the opener', () => {
  render(<AfricanBiblicalStudy now={current} />); openStudy();
  fireEvent.click(screen.getByText('Source library and editorial notes'));
  for (const link of screen.getAllByRole('link')) {
    expect(link.getAttribute('href')).toMatch(/^https:\/\//);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  }
  expect(screen.getByText(/was not transcribed/)).toBeTruthy();
});
test('closing the study restores the compact page', () => {
  render(<AfricanBiblicalStudy now={current} />); openStudy();
  fireEvent.click(screen.getByRole('button', { name: 'Close African history study' }));
  expect(screen.queryByRole('article')).toBeNull();
  expect(screen.getByRole('button', { name: 'Explore African biblical history' }).getAttribute('aria-expanded')).toBe('false');
});
