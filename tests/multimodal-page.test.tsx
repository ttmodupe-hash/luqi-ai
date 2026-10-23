// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MultimodalHubPage } from '../src/pages/MultimodalHubPage';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('offers working tools without mounting unreviewed science, paid media or grounded-chat clients', () => {
  const request = vi.fn(); vi.stubGlobal('fetch', request);
  render(<MemoryRouter><MultimodalHubPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Advanced learning & media' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Open the content studio' }).getAttribute('href')).toBe('/content-studio');
  expect(screen.getByRole('link', { name: 'Check text trial availability' }).getAttribute('href')).toBe('/ai-trial');
  expect(screen.getByText(/Synthetic molecular coordinates must not be presented as verified/)).toBeTruthy();
  expect(screen.queryByText('PRO ACTIVE')).toBeNull();
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
