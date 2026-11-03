// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, test } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import HomeExtras from '../src/components/HomeExtras';
afterEach(cleanup);

test('discovery and creator links load automatically, with usable category controls', async () => {
  render(<MemoryRouter><h1>Luqi homepage</h1><HomeExtras /></MemoryRouter>);
  const discovery = await screen.findByRole('region', { name: 'Discover Luqi' });
  expect(screen.getByRole('heading', { name: 'Luqi homepage' })).toBeTruthy();
  expect(within(discovery).getByRole('button', { name: 'Explore', exact: true }).getAttribute('aria-pressed')).toBe('true');
  fireEvent.click(within(discovery).getByRole('button', { name: 'Learn & play', exact: true }));
  expect(within(discovery).getByRole('button', { name: 'Learn & play', exact: true }).getAttribute('aria-pressed')).toBe('true');
  expect(within(discovery).getByRole('link', { name: /Physics Discovery Lab/ }).getAttribute('href')).toBe('/physics-lab');
  fireEvent.click(within(discovery).getByRole('button', { name: 'Mix it up' }));
  expect(within(discovery).getByRole('button', { name: 'Create', exact: true }).getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('link', { name: 'Try the free Content Studio' }).getAttribute('href')).toBe('/content-studio');
});
test('homepage extras are mirrored and use an actual dynamic import without deleting either feature', () => {
  for(const file of ['components/HomeExtras.tsx', 'components/HomeDiscoveryContent.tsx']) {
    expect(readFileSync('src/'+file,'utf8')).toBe(readFileSync('app/src/'+file,'utf8'));
  }
  expect(readFileSync('src/components/HomeExtras.tsx','utf8')).toContain("import('./HomeDiscoveryContent')");
  const content = readFileSync('src/components/HomeDiscoveryContent.tsx','utf8');
  expect(content).toContain('<DiscoveryDeck />'); expect(content).toContain('<CreatorPackPreview compact />');
  expect(readFileSync('src/pages/Home.tsx','utf8')).toContain('<HomeExtras />');
});
