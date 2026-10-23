// @vitest-environment jsdom
import React from 'react';
import { expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import ArchiveVaultPage from '../src/pages/ArchiveVaultPage';
it('explains unavailable archive access without polling, uploads or fabricated records', () => {
  const request = vi.fn();
  vi.stubGlobal('fetch', request);
  try {
    render(<MemoryRouter><ArchiveVaultPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Archive vault' })).toBeTruthy();
    expect(screen.getByText(/Existing files are preserved/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open private notes' }).getAttribute('href')).toBe('/companion');
    expect(screen.queryByRole('button')).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(readFileSync('src/pages/ArchiveVaultPage.tsx', 'utf8')).toBe(readFileSync('app/src/pages/ArchiveVaultPage.tsx', 'utf8'));
  } finally { cleanup(); vi.unstubAllGlobals(); }
});
