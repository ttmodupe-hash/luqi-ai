// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PricingPage from '../src/pages/PricingPage';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('shows the R299 proposal on Plans without creating a paid checkout or replacing the free studio', () => {
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  render(<MemoryRouter><PricingPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'LUQI Assisted Creator Pack' })).toBeTruthy();
  expect(screen.getByText('R299')).toBeTruthy();
  expect(screen.getByText(/not yet bookable/)).toBeTruthy();
  expect(screen.getByText(/Price and availability are proposals/)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Try the free Content Studio' }).getAttribute('href')).toBe('/content-studio');
  expect(screen.queryByRole('button', { name: /buy|pay|subscribe|order/i })).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
