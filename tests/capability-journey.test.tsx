// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import CapabilityJourneyPage from '../src/pages/CapabilityJourneyPage';
import PossibilityEnginePage from '../src/pages/PossibilityEnginePage';
import {
  CAPABILITY_JOURNEY_KEY,
  capabilityJourneyProgress,
  clearCapabilityJourney,
  readCapabilityJourney,
  saveCapabilityJourney,
  setCapabilityJourneyStep,
} from '../src/lib/capability-journey';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('LUQI Capability Journey', () => {
  it('saves only after an explicit save action', () => {
    render(<MemoryRouter><PossibilityEnginePage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'I want to become a network engineer' }));
    expect(localStorage.getItem(CAPABILITY_JOURNEY_KEY)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Save as my journey/i }));
    const saved = readCapabilityJourney();
    expect(saved?.goal).toBe('I want to become a network engineer');
    expect(saved?.completed).toEqual([]);
  });

  it('tracks only user-confirmed stages with exact percentage math', () => {
    const saved = saveCapabilityJourney('I want to start a township business');
    expect(capabilityJourneyProgress(saved)).toBe(0);
    expect(capabilityJourneyProgress(setCapabilityJourneyStep(0, true))).toBe(25);
    expect(capabilityJourneyProgress(setCapabilityJourneyStep(1, true))).toBe(50);
    expect(capabilityJourneyProgress(setCapabilityJourneyStep(3, true))).toBe(75);
    expect(readCapabilityJourney()?.completed).toEqual([0, 1, 3]);
    expect(capabilityJourneyProgress(setCapabilityJourneyStep(1, false))).toBe(50);
  });

  it('renders the next mission locally without provider requests', () => {
    saveCapabilityJourney('I want to become a network engineer');
    setCapabilityJourneyStep(0, true);
    const request = vi.spyOn(window, 'fetch');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByText('Work inside a real lab')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Continue mission/i }).getAttribute('href')).toBe('/lab-simulator');
    expect(request).not.toHaveBeenCalled();
  });

  it('confirms completion only after storage succeeds', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(readCapabilityJourney()?.completed).toEqual([0]);
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Stage marked complete on this device/);
  });

  it('preserves the previous progress and reports a failed local-storage write', () => {
    saveCapabilityJourney('I want to become a network engineer');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage blocked', 'QuotaExceededError');
    });
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/could not be confirmed as saved/i);
    expect(readCapabilityJourney()?.completed).toEqual([]);
  });

  it('lets the user clear the device-local journey', () => {
    saveCapabilityJourney('I want to build an app for my community');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Clear saved journey/i }));
    expect(readCapabilityJourney()).toBeNull();
    expect(screen.getByText(/Start with a goal worth working toward/i)).toBeTruthy();
  });

  it('rejects malformed or oversized stored goals rather than trusting browser storage', () => {
    localStorage.setItem(CAPABILITY_JOURNEY_KEY, JSON.stringify({ version: 1, goal: 'x'.repeat(501), completed: [0], startedAt: 1, updatedAt: 1 }));
    expect(readCapabilityJourney()).toBeNull();
    localStorage.setItem(CAPABILITY_JOURNEY_KEY, '{bad json');
    expect(readCapabilityJourney()).toBeNull();
    expect(clearCapabilityJourney()).toBe(true);
  });
});
