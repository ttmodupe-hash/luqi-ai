// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import OmegaLocalCalculators from '../src/components/OmegaLocalCalculators';
import { calculateLocalBudget, calculateLocalSchedule } from '../src/lib/omega-local-calculators';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('browser-only Omega web-v1 arithmetic parity', () => {
  it('sums exact decimal cents without floating point and matches Python fixture', () => {
    expect(calculateLocalBudget({ currency: 'ZAR', amounts: ['100.25', '40', '0.10'] })).toEqual({
      total: '140.35', currency: 'ZAR', basis: 'user_supplied',
      notice: 'Arithmetic from supplied amounts; no live prices or FX rates.',
    });
    expect(calculateLocalBudget({currency: 'USD', amounts: ['999999999.99', '999999999.99']}).total).toBe('1999999999.98');
  });
  it('rejects non-contract money, invalid currency, and unbounded input', () => {
    for (const amounts of [['1.234'], ['-10'], ['1e5'], ['01.00'], [], Array(51).fill('1')]) {
      expect(() => calculateLocalBudget({ currency: 'ZAR', amounts })).toThrow('INVALID_INPUT');
    }
    expect(() => calculateLocalBudget({ currency: 'zar', amounts: ['1'] })).toThrow('INVALID_INPUT');
  });
  it('computes service intervals across leap years, separately for date and kilometres', () => {
    const base = {odometerKm: 18000, lastServiceKm: 10000,
      lastServiceDate: '2024-02-29', today: '2025-02-28', intervalKm: 10000, intervalDays: 365};
    expect(calculateLocalSchedule(base)).toMatchObject({kmRemaining: 2000, serviceDueDate:'2025-02-28', overdueByKm:false, overdueByDate:true, needsService:true});
    expect(calculateLocalSchedule({...base, today:'2025-02-27'})).toMatchObject({needsService:false, overdueByDate:false});
    expect(calculateLocalSchedule({...base, odometerKm:21000, today:'2025-02-27'})).toMatchObject({kmRemaining:-1000, overdueByKm:true, needsService:true});
  });
  it('refuses invalid dates, unsafe values and impossible service history', () => {
    const base = {odometerKm: 18000, lastServiceKm: 10000,
      lastServiceDate: '2024-02-29', today: '2024-03-01', intervalKm: 10000, intervalDays: 365};
    expect(() => calculateLocalSchedule({...base, lastServiceDate:'2023-02-29'})).toThrow('INVALID_INPUT');
    expect(() => calculateLocalSchedule({...base, lastServiceKm:20000})).toThrow('INVALID_INPUT');
    expect(() => calculateLocalSchedule({...base, odometerKm:Infinity})).toThrow('INVALID_INPUT');
    expect(() => calculateLocalSchedule({...base, today:'2024-01-01'})).toThrow('INVALID_INPUT');
  });
});

describe('browser-only Omega pilot UI', () => {
  it('calculates without authentication, HTTP calls or client storage and clears stale output on edits', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    localStorage.clear(); sessionStorage.clear();
    render(<OmegaLocalCalculators />);
    fireEvent.change(screen.getByLabelText('Local amounts (one per line)'), {target: {value:'100.25\n40\n0.10'}});
    fireEvent.click(screen.getByRole('button', {name:'Calculate in browser'}));
    expect(screen.getByText('ZAR 140.35')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0); expect(sessionStorage.length).toBe(0);
    fireEvent.change(screen.getByLabelText('Local amounts (one per line)'), {target:{value:'12.20'}});
    expect(screen.queryByText('ZAR 140.35')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name:'Calculate in browser'}));
    expect(screen.getByText('ZAR 12.20')).toBeTruthy();
  });
  it('shows vehicle service result and never offers job execution or a fake external provider', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    render(<OmegaLocalCalculators />);
    fireEvent.change(screen.getByLabelText('Choose a local calculation'), {target:{value:'vehicle.schedule'}});
    const entries: Record<string,string> = {
      'Current odometer (km)': '11000',
      'Odometer at last service (km)': '10000',
      'Manufacturer distance interval (km)': '10000',
      'Manufacturer time interval (days)': '365',
      'Date of last service':'2025-02-01',
      'Assessment date':'2025-03-01',
    };
    for (const [label,value] of Object.entries(entries)) fireEvent.change(screen.getByLabelText(label), {target:{value}});
    fireEvent.click(screen.getByRole('button',{name:'Calculate in browser'}));
    expect(screen.getByText('Service is not yet due')).toBeTruthy();
    expect(screen.getByText('2026-02-01')).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.queryByRole('button',{name:/start worker|run job|queue task/i})).toBeNull();
  });
});
