// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import BusinessDeskPage from '../src/pages/BusinessDeskPage';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('LUQI Business Desk, no account and no provider calls', () => {
  it('creates a real downloadable draft without generating an invoice or sending data', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<MemoryRouter><BusinessDeskPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Mzansi Studio' } });
    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Local Client' } });
    fireEvent.change(screen.getByLabelText('Quote reference'), { target: { value: 'Q-01' } });
    fireEvent.change(screen.getByLabelText('Item 1 description'), { target: { value: 'Design' } });
    fireEvent.change(screen.getByLabelText('Item 1 quantity'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Item 1 unit price (ZAR)'), { target: { value: '100.25' } });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare quotation' }));
    expect(screen.getByRole('status', { name: 'Draft quotation result' })).textContent).toContain('R 300.75');
    expect(screen.getByText(/Not a tax invoice/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download text draft' })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
    fireEvent.change(screen.getByLabelText('Item 1 unit price (ZAR)'), { target: { value: '120' } });
    expect(screen.queryByRole('button', { name: 'Download text draft' })).toBeNull();
  });
  it('calculates transparent break-even and clears old answers after edits', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<MemoryRouter><BusinessDeskPage /></MemoryRouter>);
    for (const [label, value] of [
      ['Selling price per sale (ZAR)', '150'], ['Direct cost per sale (ZAR)', '100'],
      ['Fixed costs to cover (ZAR, same period)', '1000'],
    ]) fireEvent.change(screen.getByLabelText(label), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'Calculate break-even sales' }));
    expect(screen.getByRole('status', { name: 'Selling price result' })).textContent).toContain('20');
    expect(screen.getByText('33.33%')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Direct cost per sale (ZAR)'), { target: { value: '170' } });
    expect(screen.queryByText('33.33%')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Calculate break-even sales' }));
    expect(screen.getByText('Not achievable at this price')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not invent a valid quote after a malformed amount', () => {
    render(<MemoryRouter><BusinessDeskPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'Shop' } });
    fireEvent.change(screen.getByLabelText('Customer name'), { target: { value: 'Client' } });
    fireEvent.change(screen.getByLabelText('Quote reference'), { target: { value: 'Q1' } });
    fireEvent.change(screen.getByLabelText('Item 1 description'), { target: { value: 'Work' } });
    fireEvent.change(screen.getByLabelText('Item 1 unit price (ZAR)'), { target: { value: '12.345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Prepare quotation' }));
    expect(screen.getByRole('alert')).textContent).toContain('Check the business');
    expect(screen.queryByRole('status', { name: 'Draft quotation result' })).toBeNull();
  });
});
