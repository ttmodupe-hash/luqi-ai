// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import GuestLuqiPreview from '../src/components/GuestLuqiPreview';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('offers three meaningful local guidance results before registration with zero AI calls', () => {
  const calls = vi.fn(); vi.stubGlobal('fetch', calls);
  render(<MemoryRouter><GuestLuqiPreview /></MemoryRouter>);
  expect(screen.getByText('3 of 3 left')).toBeTruthy();
  for(const question of [
    'Create a video explaining gravity for a toddler',
    'Help me plan a trip to South Africa',
    'Help me study for an exam',
  ]) {
    fireEvent.change(screen.getByRole('textbox'), { target: { value: question } });
    fireEvent.click(screen.getByRole('button', { name: 'Explore with Luqi' }));
  }
  expect(within(screen.getByRole('list', { name: 'Your guest guide results' })).getAllByRole('listitem').length).toBeGreaterThanOrEqual(3);
  expect(screen.getByText(/You have explored three goals/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Explore with Luqi' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Create a free account to continue' }).getAttribute('href')).toBe('/join');
  expect(calls).not.toHaveBeenCalled();
});
it('makes no provider request before a visitor submits a goal and never imitates a model answer', () => {
  const calls=vi.fn(); vi.stubGlobal('fetch', calls);
  render(<MemoryRouter><GuestLuqiPreview /></MemoryRouter>);
  expect(screen.getByText(/not a live AI response/)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Explore with Luqi' }).hasAttribute('disabled')).toBe(true);
  expect(calls).not.toHaveBeenCalled();
});
