// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const { readiness, providerSend } = vi.hoisted(() => ({
  readiness: vi.fn().mockResolvedValue(false), providerSend: vi.fn(),
}));
vi.mock('../src/providers/customer-session', () => ({
  useCustomerSession: () => ({ session: null, acceptSession: vi.fn(), signOut: vi.fn() }),
}));
vi.mock('../src/lib/ai-pilot', async original => ({
  ...await original<typeof import('../src/lib/ai-pilot')>(), pilotAvailability: readiness,
}));
vi.mock('../src/lib/visual-tutor', async original => ({
  ...await original<typeof import('../src/lib/visual-tutor')>(), askVisualTutor: providerSend,
}));
vi.mock('../src/components/AccountAccessForm', () => ({
  default: () => <p>Sign in before using provider analysis</p>,
}));
import KhoroSpatialVisionLab from '../src/components/KhoroSpatialVisionLab';

beforeEach(() => { readiness.mockClear(); providerSend.mockClear(); });
afterEach(() => cleanup());

describe('spatial lab local-first interface', () => {
  it('renders all modes, local depth controls and a safe no-photo state without provider calls', () => {
    render(<MemoryRouter><KhoroSpatialVisionLab /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Spatial Vision & 3D Lab/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Exam & STEM' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Contract review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hardware serial' })).toBeTruthy();
    expect((screen.getByRole('button', { name: /Show 2.5D point cloud/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Sign in before using provider analysis/)).toBeTruthy();
    expect(screen.getByText(/No automatic semantic segmentation/)).toBeTruthy();
    expect(providerSend).not.toHaveBeenCalled();
  });
  it('switches to a deterministic loan illustration without requiring AI or pretending legal certainty', () => {
    render(<MemoryRouter><KhoroSpatialVisionLab /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Contract review' }));
    expect(screen.getByRole('heading', { name: 'Deterministic loan illustration' })).toBeTruthy();
    expect(screen.getByText(/Excludes fees, insurance and rate changes/)).toBeTruthy();
    expect(screen.getByText(/does not determine legal compliance/)).toBeTruthy();
    expect(providerSend).not.toHaveBeenCalled();
  });
  it('does not expose browser API keys or pretend to run OpenAI vision', () => {
    render(<MemoryRouter><KhoroSpatialVisionLab /></MemoryRouter>);
    expect(screen.getByText(/OpenAI vision is not yet enabled/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /OpenAI vision/i })).toBeNull();
    expect(providerSend).not.toHaveBeenCalled();
  });
});
