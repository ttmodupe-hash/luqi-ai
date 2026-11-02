// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import ComparativeEvidencePage from '../src/pages/ComparativeEvidencePage';
const net = vi.fn();
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-28T15:00:00+02:00')); net.mockReset(); vi.stubGlobal('fetch',net); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const show = () => render(<MemoryRouter><ComparativeEvidencePage /></MemoryRouter>);
it('separates evidence layers with clickable primary sources and no network', () => {
 show();
 expect(screen.getByRole('heading',{name:'Faith, history and scientific evidence'})).toBeTruthy();
 expect(screen.getByRole('heading',{name:'1. Scriptural or traditional account'})).toBeTruthy();
 expect(screen.getByText(/Carbon-14 is not used to date the Earth/)).toBeTruthy();
 expect(screen.getByText(/not a live research engine or a verdict/)).toBeTruthy();
 expect(screen.getByRole('region',{name:'Sources for selected comparison'}).querySelectorAll('a[target="_blank"]').length).toBeGreaterThan(1);
 expect(net).not.toHaveBeenCalled();
});
it('selects Quran and African source topics without issuing model traffic', () => {
 show();
 fireEvent.click(screen.getByRole('button',{name:'The Birmingham Qur’an manuscript'}));
 expect(screen.getByText(/not directly the day the ink was written/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Maat, ancient Kemet and African ethics'}));
 expect(screen.getByText(/should not be collapsed into one uniform religion/)).toBeTruthy();
 expect(net).not.toHaveBeenCalled();
});
it('suppresses interpretive text after review expiry but leaves original citations', () => {
 vi.setSystemTime(new Date('2027-01-29T09:00:00+02:00')); show();
 expect(screen.getByRole('alert').textContent).toMatch(/source review has expired/);
 expect(screen.queryByRole('heading',{name:'1. Scriptural or traditional account'})).toBeNull();
 expect(screen.getByRole('heading',{name:'Check original sources'})).toBeTruthy();
 expect(net).not.toHaveBeenCalled();
});
