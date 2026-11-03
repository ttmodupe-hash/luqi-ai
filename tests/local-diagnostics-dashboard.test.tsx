// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import TelemetryDashboardPage from '../src/pages/TelemetryDashboardPage';
import { getLocalDiagnostics, recordLocalJourney, recordLocalRequest,
  setLocalDiagnosticsEnabled } from '../src/lib/local-diagnostics';

const request=vi.fn();
beforeEach(() => {
  setLocalDiagnosticsEnabled(false);
  request.mockReset().mockResolvedValue(Response.json({ status:'configured_not_verified',
    checks:{runtime:'up',persistence:'connected',ai_pilot:'configured_not_verified'} }));
  vi.stubGlobal('fetch',request);
});
afterEach(() => { cleanup(); setLocalDiagnosticsEnabled(false); vi.unstubAllGlobals(); });


it('labels the open-ended final latency bin without claiming an impossible upper bound', () => {
  render(<MemoryRouter><TelemetryDashboardPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('checkbox',{name:'Enable private in-tab diagnostics'}));
  act(() => { recordLocalRequest('guest_reply',200,120000); });
  expect(screen.getByLabelText('Local p95 latency bucket ceiling').textContent).toBe('> 10000 ms (60s cap)');
});

it('requires an explicit checkbox before any measurement and never uploads it', async () => {
  render(<MemoryRouter><TelemetryDashboardPage /></MemoryRouter>);
  const checkbox=screen.getByRole('checkbox',{name:'Enable private in-tab diagnostics'}) as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
  expect(screen.getByText(/Diagnostics off. Nothing measured or transmitted/)).toBeTruthy();
  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(true);
  act(() => {
    recordLocalJourney('home_goal');
    recordLocalJourney('guide_ready');
    recordLocalRequest('guest_reply',503,2700);
  });
  expect(screen.getByLabelText('Homepage goals submitted').textContent).toBe('1');
  expect(screen.getByLabelText('Local next steps recorded').textContent).toBe('1');
  expect(screen.getByLabelText('Measured API roundtrips').textContent).toBe('1');
  expect(screen.getByLabelText('Average API latency').textContent).toBe('2700 ms');
  expect(screen.getByLabelText('Local p95 latency bucket ceiling').textContent).toBe('≤ 3000 ms');
  expect(getLocalDiagnostics().api.guest_reply.failed).toBe(1);
  expect(request.mock.calls.every(([path,init])=>path==='/v1/readiness' && init?.method !== 'POST')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Clear local measurements'}));
  expect(screen.getByLabelText('Homepage goals submitted').textContent).toBe('0');
  fireEvent.click(checkbox);
  expect(checkbox.checked).toBe(false);
  expect(getLocalDiagnostics().api.guest_reply.calls).toBe(0);
});
