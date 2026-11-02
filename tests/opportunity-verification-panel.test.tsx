// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import OpportunityVerificationPanel from '../src/components/OpportunityVerificationPanel';
import {ZA_OPPORTUNITY_SOURCES} from '../src/lib/opportunity-sources';
const fetchMock=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-28T17:00:00+02:00'));
  fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock)});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()});
function show(id:string){const source=ZA_OPPORTUNITY_SOURCES.find(v=>v.id===id)!;
  render(<MemoryRouter><OpportunityVerificationPanel source={source}/></MemoryRouter>);
  fireEvent.click(screen.getByText('How to verify and apply with Luqi'));}
it('shows a four-step source verification guide with original government Z83 instructions',()=>{
  show('circular-38');
  const region=screen.getByRole('region',{name:'Verify the original opportunity'});
  expect(within(region).getAllByRole('listitem')).toHaveLength(4);
  expect(screen.getByText(/latest Z83 and a CV/)).toBeTruthy();
  expect(screen.getByText(/advertising department, not DPSA/)).toBeTruthy();
  expect(screen.getByRole('link',{name:/DPSA public service vacancy instructions/}).getAttribute('href')).toBe('https://www.dpsa.gov.za/newsroom/psvc/');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('answers a dated NSFAS question locally, with source and a live-check caution',()=>{
  show('nsfas-2027');
  fireEvent.change(screen.getByLabelText(/Your question/),{target:{value:'Is it still open?'}});
  fireEvent.click(screen.getByRole('button',{name:'Luqi, explain the verified steps'}));
  expect(screen.getByText(/2026-10-31/)).toBeTruthy();
  expect(screen.getByText(/not proof the portal is accepting submissions now/)).toBeTruthy();
  expect(screen.getByRole('link',{name:'Check the official source for this answer'}).getAttribute('href')).toContain('nsfas.org.za');
  expect(fetchMock).not.toHaveBeenCalled();
});
it('pauses stale source-specific instructions while preserving checks and official links',()=>{
  vi.setSystemTime(new Date('2026-12-01T08:00:00+02:00'));show('circular-38');
  expect(screen.getByRole('alert').textContent).toMatch(/require review/);
  expect(screen.getByRole('region',{name:'Verify the original opportunity'})).toBeTruthy();
  expect(screen.queryByRole('region',{name:'Official application steps'})).toBeNull();
  expect(screen.getByRole('button',{name:'Luqi, explain the verified steps'}).hasAttribute('disabled')).toBe(true);
  expect(fetchMock).not.toHaveBeenCalled();
});
