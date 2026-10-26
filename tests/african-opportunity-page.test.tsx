// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AfricanOpportunityRadarPage from '../src/pages/AfricanOpportunityRadarPage';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('honest, browser-only African research page', () => {
  it('explains that current live sources are unavailable and makes no requests', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<MemoryRouter><AfricanOpportunityRadarPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'African Opportunity Radar' })).toBeTruthy();
    expect(screen.getByText(/not currently connected to a verified live grant feed/)).toBeTruthy();
    expect(screen.getByText(/No actual NDVI imagery/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /AfCFTA e-Tariff Book/ })).toBeTruthy();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('calculates only on explicit submit and clears result after edits', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<MemoryRouter><AfricanOpportunityRadarPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Declared cargo value (USD)'), { target: { value: '65000' } });
    fireEvent.change(screen.getByLabelText('Assumed standard duty (%)'), { target: { value: '15' } });
    fireEvent.change(screen.getByLabelText('Assumed comparison duty (%)'), { target: { value: '2.5' } });
    expect(screen.queryByRole('status', { name: 'Illustrative duty comparison' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Calculate illustrative duties' }));
    const status = screen.getByRole('status', { name: 'Illustrative duty comparison' });
    expect(status.textContent).toContain('USD 9,750.00');
    expect(status.textContent).toContain('USD 1,625.00');
    expect(status.textContent).toContain('USD 8,125.00');
    expect(fetcher).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Assumed comparison duty (%)'), { target: { value: '4' } });
    expect(screen.queryByRole('status', { name: 'Illustrative duty comparison' })).toBeNull();
  });
  it('rejects invalid duty percentages without pretending tariff validity', () => {
    render(<MemoryRouter><AfricanOpportunityRadarPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Declared cargo value (USD)'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Assumed standard duty (%)'), { target: { value: '101' } });
    fireEvent.change(screen.getByLabelText('Assumed comparison duty (%)'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate illustrative duties' }));
    expect(screen.getByRole('alert').textContent).toContain('0 to 100%');
  });
});
