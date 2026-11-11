// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import QuantumLabPage from '../src/features/quantum/QuantumLabPage';
import { PUBLIC_ABC_SHA256 } from '../src/features/quantum/pqc-contract';
import { loadBalanceModel, qaoaLayer } from '../src/features/quantum/quantum-engine';

class LabWorker {
  static instances: LabWorker[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  postMessage = vi.fn(); terminate = vi.fn();
  constructor() { LabWorker.instances.push(this); }
}
beforeEach(() => { LabWorker.instances = []; vi.stubGlobal('Worker', LabWorker); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
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


it('finds the true physical feeder minimum when rounded Ising energies tie', () => {
  mount();
  const loads = [1, 1.00000001, 1.00000003, 1.00000004];
  // Independent bounded enumeration over the sixteen physical assignments.
  const squared = Array.from({ length: 16 }, (_, mask) => {
    const a = loads.reduce((sum, x, i) => sum + (mask & (1 << i) ? 0 : x), 0);
    const b = loads.reduce((sum, x, i) => sum + (mask & (1 << i) ? x : 0), 0);
    return (a - b) ** 2;
  });
  expect(Math.min(...squared)).toBe(0);
  fireEvent.change(screen.getByLabelText(/Appliance loads in kW/),
    { target: { value: loads.join(', ') } });
  expect(screen.getByText('Exact minimum squared imbalance').nextElementSibling?.textContent)
    .toBe('0.0000 kW²');
  expect(screen.getByText('Classical states evaluated').nextElementSibling?.textContent).toBe('16');
});

it('exports nonzero physical feeder imbalance and a direct probability-weighted QAOA expectation', async () => {
  let savedBlob: Blob | null = null;
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((blob: Blob) => { savedBlob = blob; return 'blob:luqi-test'; }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  mount();
  const loads = [1, 1.00000001];
  fireEvent.change(screen.getByLabelText(/Appliance loads in kW/),
    { target: { value: loads.join(', ') } });
  fireEvent.click(screen.getByRole('button', { name: 'Download experiment notebook' }));
  expect(savedBlob).not.toBeNull();
  const json = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(savedBlob!);
  });
  const exported = JSON.parse(json).optimization.feederResult;
  const state = qaoaLayer(loadBalanceModel(loads).model, 0.8, 0.4).state;
  // Independent physical interpretation: assign each load by its basis bit,
  // square the actual feeder-total difference, and weight by |amplitude|².
  const expected = state.reduce((sum, z, bits) => {
    const a = loads.reduce((v, load, i) => v + (bits & (1 << i) ? 0 : load), 0);
    const b = loads.reduce((v, load, i) => v + (bits & (1 << i) ? load : 0), 0);
    return sum + (z.re ** 2 + z.im ** 2) * (a - b) ** 2;
  }, 0);
  expect(exported.exactSquaredImbalance).toBeGreaterThan(0);
  expect(exported.exactSquaredImbalance).toBeCloseTo((loads[0] - loads[1]) ** 2, 22);
  expect(exported.expectedSquaredImbalance).toBeCloseTo(expected, 12);
  expect(Number(screen.getByText('QAOA expected squared imbalance')
    .nextElementSibling?.textContent?.split(' ')[0])).toBeCloseTo(expected, 3);
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
