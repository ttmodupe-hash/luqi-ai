// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AskLuqiPage from '../src/pages/AskLuqiPage';
import WorkspaceLayout from '../src/components/WorkspaceLayout';
import { CustomerSessionProvider } from '../src/providers/customer-session';

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
  render(<MemoryRouter><CustomerSessionProvider><WorkspaceLayout><p>Fixture content</p></WorkspaceLayout></CustomerSessionProvider></MemoryRouter>);
  const nav = screen.getByRole('navigation', { name: 'Primary navigation' });
  expect(within(nav).getByRole('link', { name: 'Chat' }).getAttribute('href')).toBe('/chat');
  expect(screen.getByRole('link', { name: /Ask Luqi/ }).getAttribute('href')).toBe('/chat');
  expect(screen.getByText('Fixture content')).toBeTruthy();
});

it('guides a tourist to an honest booking empty state without calling a booking or AI endpoint', () => {
  render(<MemoryRouter><CustomerSessionProvider><AskLuqiPage /></CustomerSessionProvider></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Chat with Luqi', level: 1 })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Try a question with Luqi' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: /Tell Luqi what you need/ })).toBeTruthy();
  const headings = screen.getAllByRole('heading');
  expect(headings[0].textContent).toBe('Chat with Luqi');
  const local = screen.getByRole('heading', { name: /Tell Luqi what you need/ });
  const ai = screen.getByRole('heading', { name: 'Try a question with Luqi' });
  expect(local.compareDocumentPosition(ai) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(fetchMock.mock.calls.filter(([path, options]) => path === '/api/v1/luqi-core' || options?.method === 'POST')).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Find somewhere to stay' }));
  expect(screen.getByRole('heading', { name: 'Know exactly what you are booking' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'See the real offer before you commit' })).toBeTruthy();
  expect(screen.getByText('Booking and checkout unavailable')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /pay now|book now|confirm reservation/i })).toBeNull();
  expect(screen.getByRole('link', { name: /Plan your own travel budget/ }).getAttribute('href')).toBe('/omega-tasks');
  expect(fetchMock.mock.calls.every(([path, options]) => path === '/v1/readiness' && (!options || options.method !== 'POST'))).toBe(true);
});

it('accepts a natural-language need locally and shows only real available tools', () => {
  render(<MemoryRouter><CustomerSessionProvider><AskLuqiPage /></CustomerSessionProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('What would you like help with?'), {
    target: { value: 'Help me prepare for my exam' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find my next step' }));
  expect(screen.getByRole('heading', { name: 'Make learning more practical' })).toBeTruthy();
  expect(screen.getByRole('link', { name: /Open study desk/ }).getAttribute('href')).toBe('/study-desk');
  expect(screen.getByText('Think two steps ahead with KHORO')).toBeTruthy();
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
});

it('keeps urgent safety guidance out of the AI upsell and booking paths', () => {
  render(<MemoryRouter><CustomerSessionProvider><AskLuqiPage /></CustomerSessionProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('What would you like help with?'), {
    target: { value: 'Emergency, I need an ambulance at a hotel' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find my next step' }));
  expect(screen.getByRole('heading', { name: 'Your safety comes first' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Use my question in AI Chat/ })).toBeNull();
  expect(screen.queryByText('Booking and checkout unavailable')).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Ask Luqi a question' })).toBeNull();
});

it('lets an anonymous traveller prepare a provider enquiry without a payment or AI call', () => {
  render(<MemoryRouter><CustomerSessionProvider><AskLuqiPage /></CustomerSessionProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Find somewhere to stay' }));
  fireEvent.change(screen.getByPlaceholderText('Cape Town, South Africa'), { target: { value: 'Cape Town' } });
  fireEvent.change(screen.getByPlaceholderText('10–15 December'), { target: { value: '20–22 November' } });
  fireEvent.click(screen.getByRole('button', { name: 'Prepare provider enquiry' }));
  const brief = screen.getByLabelText('Your editable-by-copy draft (not a booking)') as HTMLTextAreaElement;
  expect(brief.value).toContain('DRAFT TRAVEL ENQUIRY — NO RESERVATION OR PAYMENT');
  expect(brief.value).toContain('Destination: Cape Town');
  expect(screen.getByText('Booking and checkout unavailable')).toBeTruthy();
  expect(fetchMock.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
  fireEvent.change(screen.getByPlaceholderText('Cape Town, South Africa'), { target: { value: 'Durban' } });
  expect(screen.queryByLabelText('Your editable-by-copy draft (not a booking)')).toBeNull();
});
