// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import ServiceStatusPage from '../src/pages/ServiceStatusPage';

const request = vi.fn();
const configured = { status: 'configured_not_verified', checks: {
  runtime: 'up', persistence: 'connected', ai_pilot: 'configured_not_verified',
} };
function renderPage() { return render(<ServiceStatusPage />); }
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('plain-language customer service status', () => {
  it('explains a configured AI gateway without claiming it has just answered', async () => {
    request.mockResolvedValue(new Response(JSON.stringify(configured), { status: 200 }));
    renderPage();
    await screen.findByText('Configured — replies not tested');
    expect(screen.getByRole('heading', { name: 'Luqi service status' })).toBeTruthy();
    expect(screen.getByText('Responding', { exact: true })).toBeTruthy();
    expect(screen.getByText('Connected', { exact: true })).toBeTruthy();
    expect(screen.getByText('Not tested by this page')).toBeTruthy();
    expect(screen.queryByText('configured_not_verified')).toBeNull();
    expect(screen.getByText(/This is a one-time check, not continuous monitoring/)).toBeTruthy();
    expect(screen.getByText(/one authenticated Gemini text reply passed a controlled production acceptance test/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'View dated Gemini test evidence' }).getAttribute('href'))
      .toBe('https://github.com/ttmodupe-hash/luqi-ai/actions/runs/40465090272');
    expect(request).toHaveBeenCalledExactlyOnceWith('/v1/readiness',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit', redirect: 'error' }));
    expect(request.mock.calls[0][1].method).toBeUndefined();
    expect(request.mock.calls[0][1].headers).toBeUndefined();
  });

  it('does not turn a degraded readiness check into a healthy report', async () => {
    request.mockResolvedValue(new Response(JSON.stringify({ status: 'degraded', checks: {
      runtime: 'up', persistence: 'unavailable', ai_pilot: 'disabled',
    } }), { status: 503 }));
    renderPage();
    await screen.findByText('Not enabled');
    expect(screen.getByText('Unavailable', { exact: true })).toBeTruthy();
    expect(screen.getByText(/One or more readiness checks need attention/)).toBeTruthy();
    expect(screen.queryByText(/all systems operational/i)).toBeNull();
    expect(screen.queryByText('configured_not_verified')).toBeNull();
  });

  it('clears any earlier positive connection label after an unsuccessful refresh', async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify(configured)));
    renderPage();
    await screen.findByText('Connected', { exact: true });
    request.mockRejectedValueOnce(new Error('PRIVATE-TRANSPORT-DETAILS'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    await screen.findByRole('alert');
    await waitFor(() => expect(screen.queryByText('Connected', { exact: true })).toBeNull());
    expect(screen.queryByText('PRIVATE-TRANSPORT-DETAILS')).toBeNull();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('preserves mirrored public page and dashboard source across both builds', () => {
    for (const path of ['pages/ServiceStatusPage.tsx', 'components/ApiSystemStatusDashboard.tsx']) {
      expect(readFileSync('src/' + path, 'utf8')).toBe(readFileSync('app/src/' + path, 'utf8'));
    }
  });
});
