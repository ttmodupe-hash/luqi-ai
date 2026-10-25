// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import StudyDeskPage from '../src/pages/StudyDeskPage';

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Study Desk real offline customer journeys', () => {
  it('makes user-created questions, reveals answers and marks reviews without HTTP or storage', () => {
    const request = vi.fn(); vi.stubGlobal('fetch', request);
    render(<MemoryRouter><StudyDeskPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Question'), { target: { value: 'What is DHCP?' } });
    fireEvent.change(screen.getByLabelText('Answer'), { target: { value: 'Dynamic Host Configuration Protocol' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add study card' }));
    expect(screen.getAllByText('What is DHCP?').length).toBeGreaterThanOrEqual(2);
    fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }));
    expect(screen.getByText('Dynamic Host Configuration Protocol')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I remembered' }));
    expect(screen.getByText(/No cards due for review today/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download deck and progress (JSON)' })).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });
  it('plans topics with bounded calendar calculations and clears stale plans when edited', () => {
    render(<MemoryRouter><StudyDeskPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Number of topics'), { target: { value: '5' } });
    const base = new Date(), future = new Date(base.getFullYear(), base.getMonth(), base.getDate()+5);
    const exam = [future.getFullYear(), String(future.getMonth()+1).padStart(2,'0'), String(future.getDate()).padStart(2,'0')].join('-');
    fireEvent.change(screen.getByLabelText('Exam date'), { target: { value: exam } });
    fireEvent.click(screen.getByRole('button', { name: 'Make a topic plan' }));
    expect(screen.getByRole('status', { name: 'Study topic plan' }).textContent).toContain('1 topic(s) per day');
    fireEvent.change(screen.getByLabelText('Number of topics'), { target: { value: '10' } });
    expect(screen.queryByRole('status', { name: 'Study topic plan' })).toBeNull();
  });
});
