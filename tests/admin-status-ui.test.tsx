// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import AdminSovereignPortal from '../src/components/AdminSovereignPortal';
import ApiSystemStatusDashboard from '../src/components/ApiSystemStatusDashboard';
import AdminKnowledgeAndGradingConsole from '../src/components/AdminKnowledgeAndGradingConsole';
const request = vi.fn();
const data = { status: 'degraded', checks: { runtime: 'up', persistence: 'connected', ai_pilot: 'disabled' } };
beforeEach(() => { request.mockReset(); vi.stubGlobal('fetch', request); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); sessionStorage.clear(); });
describe('truthful admin and readiness UI', () => {
  it('clears old passkeys and never unlocks privileged controls from browser storage', async () => {
    sessionStorage.setItem('luqi_admin_token', 'LUQI-ADMIN-2026');
    sessionStorage.setItem('luqi_admin_key', 'arbitrary');
    request.mockResolvedValue(new Response(JSON.stringify(data), { status: 503 }));
    render(<AdminSovereignPortal />);
    await screen.findByText('connected');
    expect(sessionStorage.getItem('luqi_admin_token')).toBeNull();
    expect(sessionStorage.getItem('luqi_admin_key')).toBeNull();
    expect(screen.getByText('Administrator sign-in unavailable')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toBe('/v1/readiness');
    expect(request.mock.calls[0][1].credentials).toBe('omit');
    expect(request.mock.calls[0][1].headers).toBeUndefined();
  });
  it('renders actual degraded readiness and clears it when refresh fails', async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify(data), { status: 503 }));
    render(<ApiSystemStatusDashboard />);
    await screen.findByText('disabled');
    request.mockRejectedValueOnce(new Error('private transport details'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh status' }));
    await screen.findByRole('alert');
    expect(screen.queryByText('connected')).toBeNull();
    expect(screen.queryByText('private transport details')).toBeNull();
    expect(screen.queryByText('100_PERCENT_OPERATIONAL')).toBeNull();
  });
  it.each([new Response('<html>SPA fallback</html>'), new Response('{}')])('rejects invalid status payloads %#', async response => {
    request.mockResolvedValueOnce(response);
    render(<ApiSystemStatusDashboard />);
    await screen.findByRole('alert');
    expect(screen.queryByText('healthy')).toBeNull();
  });
  it('does not label configured providers as verified or healthy', async () => {
    request.mockResolvedValueOnce(new Response(JSON.stringify({ ...data, status: 'configured_not_verified', checks: { ...data.checks, ai_pilot: 'configured_not_verified' } })));
    render(<ApiSystemStatusDashboard />);
    await screen.findAllByText('configured_not_verified');
    expect(screen.queryByText('healthy')).toBeNull();
  });
  it('cannot submit legacy knowledge operations', () => {
    render(<AdminKnowledgeAndGradingConsole />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps readiness components identical in both frontends', () => {
    expect(readFileSync('src/components/ApiSystemStatusDashboard.tsx', 'utf8')).toBe(readFileSync('app/src/components/ApiSystemStatusDashboard.tsx', 'utf8'));
  });
});
