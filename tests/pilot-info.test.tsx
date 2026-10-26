// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import PricingPage from '../src/pages/PricingPage';
import PrivacyPage from '../src/pages/PrivacyPage';
import TermsPage from '../src/pages/TermsPage';
import ContactPage from '../src/pages/ContactPage';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('plans never request billing, fabricate a balance or offer legacy checkout/job controls', () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  render(<MemoryRouter><PricingPage /></MemoryRouter>);
  expect(screen.getByText(/AI subscriptions and in-app credit purchases are not available/)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByText(/150|Queue Active|50%/)).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
it('privacy explains actual storage access and incomplete backup/account erasure without certification claims', () => {
  render(<MemoryRouter><PrivacyPage /></MemoryRouter>);
  expect(screen.getByText(/Storage administrators can access/)).toBeTruthy();
  expect(screen.getByText(/Whole-account export and deletion/)).toBeTruthy();
  expect(screen.queryByText('South African POPIA & Global Data Protection Compliance')).toBeNull();
});
it('use information does not promise active paid plans or output licensing', () => {
  render(<MemoryRouter><TermsPage /></MemoryRouter>);
  expect(screen.getByText(/makes no commercial licensing or automatic-refund promises/)).toBeTruthy();
});
it('technical feedback links to the real repository and keeps private recovery out of public issues', () => {
  render(<MemoryRouter><ContactPage /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Open a public technical issue' }).getAttribute('href'))
    .toBe('https://github.com/ttmodupe-hash/luqi-ai/issues/new');
  expect(screen.getByText(/verified private support address has not yet been published/)).toBeTruthy();
  expect(screen.queryByText(/hello@|enterprise@/)).toBeNull();
});
