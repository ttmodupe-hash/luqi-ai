// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import AskLuqiPage from '../src/pages/AskLuqiPage';
import { CustomerSessionProvider } from '../src/providers/customer-session';

const network = vi.fn();
beforeEach(() => {
  network.mockReset().mockImplementation(async (path: string) => {
    if (path === '/v1/readiness') return Response.json({
      checks: { persistence: 'connected', ai_pilot: 'configured_not_verified' },
    });
    throw new Error('Unexpected network request from anonymous guide: ' + String(path));
  });
  vi.stubGlobal('fetch', network);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('helps an anonymous visitor correct spelling and prepare a reviewed AI draft without a paid request', () => {
  render(<MemoryRouter><CustomerSessionProvider><AskLuqiPage /></CustomerSessionProvider></MemoryRouter>);
  const need = screen.getByLabelText('What would you like help with?') as HTMLTextAreaElement;
  fireEvent.change(need, { target: { value: 'Plese help me compare my two business ideas' } });
  expect(screen.getByText(/Possible English spelling/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Apply suggestion' }));
  expect(need.value).toBe('Please help me compare my two business ideas');
  fireEvent.click(screen.getByText('Help me ask Luqi — no perfect prompt needed'));
  fireEvent.change(screen.getByLabelText('What would help most?'), { target: { value: 'compare' } });
  fireEvent.change(screen.getByLabelText('How should Luqi answer?'), { target: { value: 'balanced' } });
  fireEvent.click(screen.getByRole('button', { name: 'Suggest a clearer question' }));
  const preview = screen.getByLabelText('Review the suggested question') as HTMLTextAreaElement;
  expect(preview.value).toContain('Please help me compare my two business ideas');
  expect(preview.value).toContain('Compare reasonable options fairly');
  expect(preview.value).toContain('trade-offs');
  expect(network.mock.calls.some(([path, opts]) => path === '/api/v1/luqi-core' || opts?.method === 'POST')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Use this question' }));
  expect(screen.getByText(/Your reviewed draft is ready in optional AI Chat below/)).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Try a question with Luqi' })).toBeTruthy();
  expect(network.mock.calls.some(([path, opts]) => path === '/api/v1/luqi-core' || opts?.method === 'POST')).toBe(false);
});

it('preserves the existing emergency guard and never offers a guided AI draft for urgent needs', () => {
  render(<MemoryRouter><CustomerSessionProvider><AskLuqiPage /></CustomerSessionProvider></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('What would you like help with?'), {
    target: { value: 'Emergency, I need an ambulance' },
  });
  expect(screen.getByText(/AI writing helper is paused for this request/)).toBeTruthy();
  fireEvent.click(screen.getByText('Help me ask Luqi — no perfect prompt needed'));
  expect((screen.getByRole('button', { name: 'Suggest a clearer question' }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Find my next step' }));
  expect(screen.getByRole('heading', { name: 'Your safety comes first' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Use my question in AI Chat' })).toBeNull();
  expect(network.mock.calls.some(([path, opts]) => path === '/api/v1/luqi-core' || opts?.method === 'POST')).toBe(false);
});
