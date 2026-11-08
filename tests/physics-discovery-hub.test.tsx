// @vitest-environment jsdom
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import PhysicsLabHubPage from '../src/pages/PhysicsLabHubPage';

afterEach(cleanup);

it('offers eight selectable experiments and keeps the advanced pendulum available', () => {
  render(<MemoryRouter initialEntries={['/physics-lab']}><PhysicsLabHubPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Explore more than one physics experiment' })).toBeTruthy();
  const catalogue = screen.getByRole('navigation', { name: 'Physics experiment catalogue' });
  expect(catalogue.querySelectorAll('button')).toHaveLength(8);
  expect(screen.getByRole('link', { name: /Pendulum, resonance and chaos/ }).getAttribute('href'))
    .toBe('/pendulum-lab');
  expect(screen.getByRole('slider', { name: 'Launch speed' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Electric circuits/ }));
  expect(screen.getByRole('heading', { name: 'Electric circuits', exact: true })).toBeTruthy();
  expect(screen.getByRole('slider', { name: 'Battery voltage' })).toBeTruthy();
  expect(screen.queryByRole('slider', { name: 'Launch speed' })).toBeNull();
});

it('updates live values, records observations and keeps download disabled until data exists', () => {
  render(<MemoryRouter initialEntries={['/physics-lab?experiment=wave']}><PhysicsLabHubPage /></MemoryRouter>);
  const download = screen.getByRole('button', { name: 'Export observations CSV' }) as HTMLButtonElement;
  expect(download.disabled).toBe(true);
  const speed = screen.getByText('Wave speed').parentElement!;
  expect(speed.textContent).toContain('6');
  fireEvent.change(screen.getByRole('slider', { name: 'Frequency' }), { target: { value: '4' } });
  expect(speed.textContent).toContain('12');
  fireEvent.click(screen.getByRole('button', { name: 'Record observation' }));
  expect(screen.getByRole('table', { name: 'Recorded physics observations' })).toBeTruthy();
  expect(download.disabled).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Reset variables' }));
  expect(speed.textContent).toContain('6');
  fireEvent.click(screen.getByRole('button', { name: /Heat and temperature/ }));
  expect(screen.getByRole('heading', { name: 'Heat and temperature', exact: true })).toBeTruthy();
});

it('shows explicit ideal-model limitations and retains a working explanation control', () => {
  render(<MemoryRouter initialEntries={['/physics-lab?experiment=lens']}><PhysicsLabHubPage /></MemoryRouter>);
  expect(screen.getByText(/Ideal thin converging lens/)).toBeTruthy();
  const toggle = screen.getByRole('button', { name: 'Hide explanation and assumptions' });
  fireEvent.click(toggle);
  expect(screen.queryByText(/Ideal thin converging lens/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Show explanation and assumptions' }));
  expect(screen.getByText(/Ideal thin converging lens/)).toBeTruthy();
});
