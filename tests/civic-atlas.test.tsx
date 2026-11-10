// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import CivicEvidenceDesk from '../src/pages/CivicEvidenceDesk';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function openAtlas(date = '2026-11-09T12:00:00Z') {
  vi.useFakeTimers(); vi.setSystemTime(new Date(date));
  render(<MemoryRouter><CivicEvidenceDesk /></MemoryRouter>);
}

it('keeps national evidence independent of province selection and makes geography accessible', () => {
  const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); openAtlas();
  expect(screen.getAllByRole('article')).toHaveLength(5);
  expect(screen.getAllByRole('button', { name: /on the civic map$/ })).toHaveLength(9);
  const map = screen.getByRole('button', { name: 'Explore Gauteng on the civic map' });
  fireEvent.keyDown(map, { key: 'Enter' });
  expect(map.getAttribute('aria-pressed')).toBe('true');
  expect((screen.getByLabelText('Explore a province') as HTMLSelectElement).value).toBe('GP');
  expect(screen.getByText('No verified province or ward records in this edition. The library remains national.')).toBeTruthy();
  expect(screen.getAllByRole('article')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Zoom in on civic map' }));
  expect(screen.getByLabelText('Civic map zoom').textContent).toBe('125%');
  fireEvent.click(screen.getByRole('button', { name: 'Reset civic map view' }));
  expect(map.getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByLabelText('Civic map zoom').textContent).toBe('100%');
  expect(fetch).not.toHaveBeenCalled();
});

it('searches actual publishers, updates linked views and recovers from an empty intersection', () => {
  openAtlas();
  fireEvent.change(screen.getByLabelText('Search civic records'), { target: { value: 'National Treasury' } });
  expect(screen.getAllByRole('article')).toHaveLength(1);
  expect(within(screen.getByRole('complementary', { name: 'Selected evidence record' })).getByRole('heading').textContent).toBe('Budget versus actual spending');
  fireEvent.click(screen.getByRole('tab', { name: /Source pages/ }));
  const panel = screen.getByRole('tabpanel');
  expect(within(panel).getAllByRole('link')).toHaveLength(1);
  expect(within(panel).getByRole('link').getAttribute('href')).toBe('https://municipaldata.treasury.gov.za/docs');
  fireEvent.change(screen.getByLabelText('Evidence topic'), { target: { value: 'Voting' } });
  expect(screen.queryAllByRole('article')).toHaveLength(0);
  expect(screen.queryByRole('complementary', { name: 'Selected evidence record' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'No matching evidence records' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  expect(screen.getAllByRole('article')).toHaveLength(5);
  expect(within(screen.getByRole('tabpanel')).getAllByRole('link')).toHaveLength(5);
});

it('expires summary indicators on the clock without relabelling retained source findings', () => {
  openAtlas('2026-11-08T21:59:30Z');
  expect(within(screen.getByRole('table')).getAllByText('In window')).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Inspect How Parliament holds government accountable' }));
  expect(within(screen.getByRole('complementary', { name: 'Selected evidence record' })).getByRole('heading').textContent).toBe('How Parliament holds government accountable');
  vi.setSystemTime(new Date('2026-11-08T22:01:00Z'));
  fireEvent.focus(window);
  expect(within(screen.getByRole('table')).getAllByText('Recheck')).toHaveLength(5);
  expect(screen.getAllByText('Review expired — reconfirm with the publisher')).toHaveLength(5);
  expect(screen.getByText('Expired records need source recheck')).toBeTruthy();
});

it('keeps both shipped source trees identical', () => {
  for (const path of ['src/components/CivicAtlasMap.tsx', 'src/components/CivicEvidencePanel.tsx', 'src/pages/CivicEvidenceDesk.tsx', 'src/pages/LuqiChatWorkspacePage.tsx', 'src/civic-atlas.css']) {
    expect(readFileSync(path, 'utf8')).toBe(readFileSync('app/' + path, 'utf8'));
  }
});
