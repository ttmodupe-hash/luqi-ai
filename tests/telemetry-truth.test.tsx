// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import TelemetryDashboardPage from '../src/pages/TelemetryDashboardPage';

const request = vi.fn();
const configured = { status: 'configured_not_verified', checks: {
  runtime: 'up', persistence: 'connected', ai_pilot: 'configured_not_verified',
} };
function openPage() { render(<MemoryRouter><TelemetryDashboardPage /></MemoryRouter>); }
function noInventedSuccess() {
  for (const text of ['42', '1420ms', '1.15x', '100%', 'CIRCUIT BREAKER ACTIVE', 'Sandbox Passed']) {
    expect(screen.queryByText(text, { exact: true })).toBeNull();
  }
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /Run Autonomous|Execute|Refinement/ })).toBeNull();
}
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('telemetry must describe evidence rather than invent it', () => {
  it('shows only real readiness fields and preserves the working tool links', async () => {
    request.mockResolvedValue(new Response(JSON.stringify(configured)));
    openPage(); await screen.findByText('connected'); noInventedSuccess();
    expect(screen.getByRole('heading', { name: 'Autonomous execution is unavailable' })).toBeTruthy();
    expect(screen.getByText(/Execution totals, latency, success rates and diagnostic history are unavailable/)).toBeTruthy();
    for (const [label, path] of [['Open AI text trial', '/ai-trial'], ['Open private notes', '/companion'], ['Get started', '/start']]) {
      expect(screen.getByRole('link', { name: label }).getAttribute('href')).toBe(path);
    }
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('/v1/readiness');
    expect(request.mock.calls[0][1]).toMatchObject({ credentials: 'omit', cache: 'no-store', redirect: 'error' });
    expect(request.mock.calls[0][1].headers).toBeUndefined();
  });
  it('shows degraded configuration without replacing it with successful statistics', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({ status: 'degraded', checks: {
      runtime: 'up', persistence: 'unavailable', ai_pilot: 'disabled',
    } }), { status: 503 }));
    openPage(); await screen.findByText('degraded'); noInventedSuccess();
    expect(screen.getByText('disabled', { exact: true })).toBeTruthy();
  });
  it.each(['transport', 'html', 'invalid-json', 'unexpected-status'])('fails honestly on %s', async kind => {
    if (kind === 'transport') request.mockRejectedValue(new Error('PRIVATE-DIAGNOSTIC'));
    else request.mockResolvedValue(kind === 'html' ? new Response('<html>PRIVATE-DIAGNOSTIC</html>')
      : kind === 'invalid-json' ? new Response('{}')
      : new Response(JSON.stringify(configured), { status: 500 }));
    openPage(); await screen.findByRole('alert'); noInventedSuccess();
    expect(screen.queryByText('connected')).toBeNull();
    expect(screen.queryByText(/PRIVATE-DIAGNOSTIC/)).toBeNull();
  });
  it('clears old observations when a manual refresh fails', async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify(configured)));
    openPage(); await screen.findByText('connected');
    request.mockRejectedValueOnce(new Error('PRIVATE-TRANSPORT'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    await screen.findByRole('alert'); expect(screen.queryByText('connected')).toBeNull();
    expect(request).toHaveBeenCalledTimes(2); noInventedSuccess();
  });
  it('does not poll the retired telemetry provider or retry automatically', async () => {
    request.mockResolvedValue(new Response(JSON.stringify(configured)));
    openPage(); await screen.findByText('connected');
    vi.useFakeTimers(); await vi.advanceTimersByTimeAsync(30_000);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('keeps both frontend copies identical and free of autonomous RPC controls', () => {
    const root = readFileSync('src/pages/TelemetryDashboardPage.tsx', 'utf8');
    expect(root).toBe(readFileSync('app/src/pages/TelemetryDashboardPage.tsx', 'utf8'));
    expect(root).not.toMatch(/useMutation|useQuery|runAutonomousRefinement|refetchInterval|totalExecutions/);
  });
});
