// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AskLuqiPage from '../src/pages/AskLuqiPage';
import WorkspaceLayout from '../src/components/WorkspaceLayout';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async (path: string) => {
    if (path === '/v1/readiness') {
      return Response.json({ checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' } });
    }
    throw new Error('Unexpected network request in local guide');
  });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('makes chat discoverable in primary navigation and account action', () => {
  render(<MemoryRouter><WorkspaceLayout><p>Fixture content</p></WorkspaceLayout></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
  expect(within(nav).getByRole('link', { name: 'Chat' }).getAttribute('href')).toBe('/chat');
  expect(screen.getByRole('link', { name: /Ask LUQI/ }).getAttribute('href')).toBe('/chat');
  expect(screen.getByText('Fixture content')).toBeTruthy();
});

it('guides a tourist to an honest booking empty state without calling a booking or AI endpoint', () => {
  render(<MemoryRouter><AskLuqiPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: /Tell LUQI what you need/ })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Find somewhere to stay' }));
  expect(screen.getByRole('heading', { name: 'Know exactly what you are booking' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'See the real offer before you commit' })).toBeTruthy();
  expect(screen.getByText('Booking and checkout unavailable')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /pay now|book now|confirm reservation/i })).toBeNull();
  expect(screen.getByRole('link', { name: /Plan your own travel budget/ }).getAttribute('href')).toBe('/omega-tasks');
  expect(fetchMock.mock.calls.every(([path, options]) => path === '/v1/readiness' && (!options || options.method !== 'POST'))).toBe(true);
});

it('accepts a natural-language need locally and shows only real available tools', () => {
  render(<MemoryRouter><AskLuqiPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('What would you like help with?'), {
    target: { value: 'Help me prepare for my exam' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find my next step' }));
  expect(screen.getByRole('heading', { name: 'Make learning more practical' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Open study desk/ }).getAttribute('href')).toBe('/study-desk');
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
});

it('keeps urgent safety guidance out of the AI upsell and booking paths', () => {
  render(<MemoryRouter><AskLuqiPage /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('What would you like help with?'), {
    target: { value: 'Emergency, I need an ambulance at a hotel' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find my next step' }));
  expect(screen.getByRole('heading', { name: 'Your safety comes first' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Use my question in the AI text trial/ })).toBeNull();
  expect(screen.queryByText('Booking and checkout unavailable')).toBeNull();
});
