// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import QuantumLabPage from '../src/features/quantum/QuantumLabPage';
import { PUBLIC_ABC_SHA256 } from '../src/features/quantum/pqc-contract';

class LabWorker {
  static instances: LabWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { LabWorker.instances.push(this); }
}
beforeEach(() => { LabWorker.instances = []; vi.stubGlobal('Worker', LabWorker); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const mount = () => render(<MemoryRouter><QuantumLabPage /></MemoryRouter>);

it('renders calculated states and local planning references without network requests or automatic cryptography', () => {
  mount();
  expect(screen.getByRole('heading', { name: 'Quantum & PQC Lab', exact: true })).toBeTruthy();
  expect(screen.getByText('Entanglement entropy').nextElementSibling?.textContent).toBe('1.000000 bits');
  expect(screen.getByRole('status', { name: 'Route baseline' }).textContent).toContain('Cost 18; 6 tours');
  expect(screen.getByRole('status', { name: 'Capital baseline' }).textContent).toContain('Tools, Training');
  fireEvent.change(screen.getByLabelText('Circuit preset'), { target: { value: 'uniform' } });
  expect(screen.getByText('Entanglement entropy').nextElementSibling?.textContent).toBe('0.000000 bits');
  expect(screen.getByText('Basis measurement entropy').nextElementSibling?.textContent).toBe('2.000000 bits');
  fireEvent.change(screen.getByLabelText('Circuit preset'), { target: { value: 'grover' } });
  fireEvent.change(screen.getByLabelText('Marked basis state'), { target: { value: '2' } });
  expect(Number(screen.getByLabelText('Probability of 10').getAttribute('value'))).toBeCloseTo(1, 12);
  expect(LabWorker.instances).toHaveLength(0); expect(fetch).not.toHaveBeenCalled();
});

it('preserves a real near-balanced feeder cost instead of displaying a fabricated zero', () => {
  mount();
  const input = screen.getByLabelText(/Appliance loads in kW/);
  fireEvent.change(input, { target: { value: '1, 1.00000001' } });
  expect(screen.getByText('Exact minimum squared imbalance').nextElementSibling?.textContent).toBe('1.000e-16 kW²');
  fireEvent.change(input, { target: { value: '1, 1' } });
  expect(screen.getByText('Exact minimum squared imbalance').nextElementSibling?.textContent).toBe('0.0000 kW²');
});

it('keeps error estimates outside their model and starts cryptography only on an explicit fixed command', () => {
  mount();
  fireEvent.change(screen.getByLabelText('Physical error probability'), { target: { value: '0.1' } });
  expect(screen.getByText('Outside below-threshold model')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Run public-message PQC checks' }));
  expect(LabWorker.instances).toHaveLength(1);
  expect(LabWorker.instances[0].postMessage).toHaveBeenCalledExactlyOnceWith('RUN_PUBLIC_SELF_TEST');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel experiment' }));
  expect(LabWorker.instances[0].terminate).toHaveBeenCalled();
  expect(screen.getByRole('status', { name: 'PQC experiment status' }).textContent).toContain('cancelled');
  expect(fetch).not.toHaveBeenCalled();
});

it('rejects a worker success flag without real result fields and clears workers on unmount', () => {
  const page = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Run public-message PQC checks' }));
  act(() => { LabWorker.instances[0].onmessage?.({ data: { ok: true, result: { fipsValidated: true } } } as MessageEvent); });
  expect(LabWorker.instances[0].terminate).toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Run public-message PQC checks' }));
  page.unmount(); expect(LabWorker.instances[1].terminate).toHaveBeenCalled();
});

it('the PQC contract fixes the public hash vector and cannot claim production protection', () => {
  expect(PUBLIC_ABC_SHA256).toHaveLength(64);
  mount();
  expect(screen.getByText(/does not seal Stokvel records/)).toBeTruthy();
  expect(screen.getByText(/not a FIPS-validated module/)).toBeTruthy();
});
