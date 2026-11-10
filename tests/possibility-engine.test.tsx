// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import PossibilityEnginePage from '../src/pages/PossibilityEnginePage';
import { getPossibilityPlan, identifyPossibilityTrack } from '../src/lib/possibility-engine';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('LUQI Possibility Engine', () => {
  it('turns common ambitions into concrete capability tracks', () => {
    expect(identifyPossibilityTrack('I want to become a network engineer')).toBe('learn');
    expect(identifyPossibilityTrack('I want to start a township business')).toBe('business');
    expect(identifyPossibilityTrack('I want to build an app for my community')).toBe('build');
    expect(identifyPossibilityTrack('Help me find an internship')).toBe('work');
    expect(identifyPossibilityTrack('I want to create an animation')).toBe('create');
  });

  it('returns a four-stage path using existing Luqi routes', () => {
    const plan = getPossibilityPlan('I want to become a network engineer')!;
    expect(plan.affirmation).toMatch(/^Yes\./);
    expect(plan.steps).toHaveLength(4);
    expect(plan.steps.map(step => step.path)).toEqual([
      '/cert-academy', '/lab-simulator', '/devsecnet', '/opportunities',
    ]);
    expect(getPossibilityPlan('')).toBeNull();
    expect(getPossibilityPlan('x'.repeat(501))).toBeNull();
  });

  it('renders a useful local path without making a network or paid AI request', () => {
    const request = vi.spyOn(window, 'fetch');
    render(<MemoryRouter><PossibilityEnginePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'I want to start a township business' }));
    expect(screen.getByText(/Yes\. Turn the idea into numbers/i)).toBeTruthy();
    expect(screen.getByText('Make the business concrete')).toBeTruthy();
    expect(screen.getByText('Know your numbers')).toBeTruthy();
    expect(screen.getByText('Prepare for tenders')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /Open this capability/i })).toHaveLength(4);
    expect(request).not.toHaveBeenCalled();
  });

  it('accepts an explicit homepage goal handoff without sending it anywhere', () => {
    const request = vi.spyOn(window, 'fetch');
    render(<MemoryRouter initialEntries={[{ pathname: '/possibility', state: { luqiGoal: 'I want to pass matric physics' } }]}>
      <PossibilityEnginePage />
    </MemoryRouter>);
    expect(screen.getByText('I want to pass matric physics')).toBeTruthy();
    expect(screen.getByText(/Yes\. You can build the knowledge/i)).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  });
});
