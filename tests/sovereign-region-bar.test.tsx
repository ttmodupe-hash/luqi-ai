// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SovereignRegionBar from '../src/components/SovereignRegionBar';
import { SovereignRegionProvider, useSovereignRegion } from '../src/providers/sovereign-region';

afterEach(cleanup);
function Inspector() {
  const { region } = useSovereignRegion();
  return <output data-testid="selected-region">{region}</output>;
}
it('defaults to continental overview, then selects one country in memory', () => {
  render(<MemoryRouter><SovereignRegionProvider><SovereignRegionBar /><Inspector /></SovereignRegionProvider></MemoryRouter>);
  expect(screen.getByTestId('selected-region').textContent).toBe('PAN_AFRICAN_AU');
  expect(screen.getByText(/not a government or payment integration/)).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Country and continental view'), { target: { value: 'CENTRAL_CM' } });
  expect(screen.getByTestId('selected-region').textContent).toBe('CENTRAL_CM');
  expect(screen.getByRole('link', { name: /Cameroon government services portal/ }).getAttribute('href')).toBe('https://servicepublic.gov.cm/en/');
  expect(screen.getByText(/Confirm every regulation/)).toBeTruthy();
});
it('shows eight RECs with opt-in country links, never a payment or government form', () => {
  render(<MemoryRouter><SovereignRegionProvider><SovereignRegionBar /></SovereignRegionProvider></MemoryRouter>);
  fireEvent.click(screen.getByText(/Local law, education, languages and African trade/));
  expect(screen.getByText(/eight/)).toBeTruthy();
  expect(screen.getByText(/PAPSS depends on participating providers/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: /pay|submit application|book now/i })).toBeNull();
});
