// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { findWorkspaceTools } from '../src/components/workspace-catalog';
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
    expect(screen.getByRole('region', { name: 'Work inside a real lab' })).toBeTruthy();
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

  it('does not update another goal that replaced the displayed journey in a second tab', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    saveCapabilityJourney('I want to start a township business');
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(readCapabilityJourney()?.goal).toBe('I want to start a township business');
    expect(readCapabilityJourney()?.completed).toEqual([]);
    expect(screen.getByRole('heading', { name: 'I want to become a network engineer' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/changed in another tab/i);
  });

  it('loads newer stage progress in-page and then permits a confirmed edit', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    setCapabilityJourneyStep(2, true);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(screen.getByRole('status').textContent).toMatch(/changed in another tab/i);
    fireEvent.click(screen.getByRole('button', { name: 'Load latest saved journey' }));
    expect(screen.getByText('25%')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Loaded the latest saved journey/);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(readCapabilityJourney()?.completed).toEqual([0, 2]);
  });

  it('offers keyboard-accessible recovery when another tab saves the first goal', () => {
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Start with a goal worth working toward/i })).toBeTruthy();
    saveCapabilityJourney('I want to become a network engineer');
    fireEvent(window, new StorageEvent('storage', { key: CAPABILITY_JOURNEY_KEY, storageArea: localStorage }));
    expect(screen.getByRole('status').textContent).toMatch(/saved in another tab/i);
    const recovery = screen.getByRole('button', { name: 'Load latest saved journey' });
    recovery.focus();
    expect(document.activeElement).toBe(recovery);
    fireEvent.click(recovery);
    expect(screen.getByRole('heading', { name: 'I want to become a network engineer' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Loaded the latest saved journey/);
  });

  it('does not offer empty-journey recovery for unrelated storage changes', () => {
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    localStorage.setItem('unrelated-preference', 'ok');
    fireEvent(window, new StorageEvent('storage', { key: 'unrelated-preference', storageArea: localStorage }));
    expect(screen.queryByRole('button', { name: 'Load latest saved journey' })).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('notifies about newer progress before the user touches the page', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    setCapabilityJourneyStep(2, true);
    fireEvent(window, new StorageEvent('storage', { key: CAPABILITY_JOURNEY_KEY, storageArea: localStorage }));
    expect(screen.getByRole('status').textContent).toMatch(/changed in another tab/i);
    expect(screen.getByText('0%')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load latest saved journey' }));
    expect(screen.getByText('25%')).toBeTruthy();
    expect(readCapabilityJourney()?.completed).toEqual([2]);
  });

  it('notifies about removal by another tab before a user edits', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    localStorage.removeItem(CAPABILITY_JOURNEY_KEY);
    fireEvent(window, new StorageEvent('storage', { key: CAPABILITY_JOURNEY_KEY, storageArea: localStorage }));
    expect(screen.getByRole('status').textContent).toMatch(/changed in another tab/i);
    fireEvent.click(screen.getByRole('button', { name: 'Load latest saved journey' }));
    expect(screen.getByRole('heading', { name: /Start with a goal worth working toward/i })).toBeTruthy();
    expect(readCapabilityJourney()).toBeNull();
  });

  it('presents stale-tab recovery before the mission and supports keyboard activation', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    setCapabilityJourneyStep(2, true); // Emulate another tab changing saved progress.
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    const recovery = screen.getByRole('region', { name: 'Journey storage notice' });
    const mission = document.querySelector('.luqi-journey-mission');
    expect(mission).not.toBeNull();
    expect(recovery.compareDocumentPosition(mission!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const action = within(recovery).getByRole('button', { name: 'Load latest saved journey' });
    action.focus();
    expect(document.activeElement).toBe(action);
    fireEvent.click(action);
    expect(screen.queryByRole('button', { name: 'Load latest saved journey' })).toBeNull();
    expect(readCapabilityJourney()?.completed).toEqual([2]);
  });

  it('does not erase a different goal saved from another tab', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    saveCapabilityJourney('I want to start a township business');
    fireEvent.click(screen.getByRole('button', { name: /Clear saved journey/i }));
    expect(readCapabilityJourney()?.goal).toBe('I want to start a township business');
    expect(screen.getByRole('status').textContent).toMatch(/changed in another tab/i);
  });

  it('does not overwrite more recent stage completion from another tab', () => {
    saveCapabilityJourney('I want to become a network engineer');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    setCapabilityJourneyStep(2, true);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(readCapabilityJourney()?.completed).toEqual([2]);
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/changed in another tab/i);
  });

  it('lets the user clear the device-local journey', () => {
    saveCapabilityJourney('I want to build an app for my community');
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Clear saved journey/i }));
    expect(readCapabilityJourney()).toBeNull();
    expect(screen.getByText(/Start with a goal worth working toward/i)).toBeTruthy();
  });


  it('rejects silently ignored goal saves instead of reporting persisted success', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    expect(saveCapabilityJourney('I want to become a network engineer')).toBeNull();
    expect(readCapabilityJourney()).toBeNull();
  });

  it('does not report a completed stage when the browser silently drops the write', () => {
    saveCapabilityJourney('I want to become a network engineer');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    fireEvent.click(screen.getAllByRole('button', { name: /Mark complete:/i })[0]);
    expect(readCapabilityJourney()?.completed).toEqual([]);
    expect(screen.getByText('0%')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/could not be confirmed as saved/i);
  });

  it('does not claim a journey was cleared when the browser ignores removal', () => {
    saveCapabilityJourney('I want to become a network engineer');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => undefined);
    render(<MemoryRouter><CapabilityJourneyPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Clear saved journey/i }));
    expect(readCapabilityJourney()?.goal).toBe('I want to become a network engineer');
    expect(screen.getByRole('heading', { name: 'I want to become a network engineer' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/did not allow.*cleared/i);
  });

  it('rejects malformed or oversized stored goals rather than trusting browser storage', () => {
    localStorage.setItem(CAPABILITY_JOURNEY_KEY, JSON.stringify({ version: 1, goal: 'x'.repeat(501), completed: [0], startedAt: 1, updatedAt: 1 }));
    expect(readCapabilityJourney()).toBeNull();
    localStorage.setItem(CAPABILITY_JOURNEY_KEY, '{bad json');
    expect(readCapabilityJourney()).toBeNull();
    expect(clearCapabilityJourney()).toBe(true);
  });
});

// Source-backed discovery contract: no separate journey tool or account is created.
it('finds the existing saved journey through the canonical in-page tool search', () => {
  const entry = findWorkspaceTools('my journey').find(tool => tool.id === 'capability-journey');
  expect(entry).toMatchObject({
    path: '/journey', category: 'Ask & Learn', ready: true,
    signIn: 'Not required', consent: 'Explicit device-local browser save',
    aiCost: 'No paid inference', productionStatus: 'Not independently verified in production',
    fallback: 'Build a path at /possibility without saving',
  });
  expect(findWorkspaceTools('journey', 'ready').some(tool => tool.id === 'capability-journey')).toBe(true);
});
