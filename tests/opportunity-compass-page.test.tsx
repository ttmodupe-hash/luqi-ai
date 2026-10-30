// @vitest-environment jsdom
import React from 'react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import OpportunityCompassPage from '../src/pages/OpportunityCompassPage';
const request=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-28T16:00:00+02:00'));request.mockReset();vi.stubGlobal('fetch',request)});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()});
const show=()=>render(<MemoryRouter><OpportunityCompassPage/></MemoryRouter>);
it('shows official youth and government opportunities without login, coordinates or paid calls',()=>{
 show();expect(screen.getByRole('heading',{name:/Opportunity Compass/})).toBeTruthy();
 expect(screen.getAllByRole('button',{name:/Select /}).length).toBe(9);
 expect(screen.getByText(/No province selected/)).toBeTruthy();
 expect(screen.getByText('2027 NSFAS applications')).toBeTruthy();
 expect(request).not.toHaveBeenCalled();
});
it('selects a province without pretending sources have verified job coordinates',()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'Select Gauteng'}));
 expect(screen.getByText(/Selected Gauteng/)).toBeTruthy();
 expect(screen.getByText(/Geographic province boundaries, not exact job-site coordinates/)).toBeTruthy();
 expect(request).not.toHaveBeenCalled();
});
it('filters categories and audiences while keeping eligibility undecided',()=>{
 show();fireEvent.change(screen.getByLabelText('Opportunity category'),{target:{value:'sponsorship'}});
 expect(screen.getByText('National Arts Council calls')).toBeTruthy();
 expect(screen.queryByText('2027 NSFAS applications')).toBeNull();
 expect(screen.getByText(/they do not determine citizenship, age, disability/)).toBeTruthy();
});
it('keeps expansion countries clearly unverified',()=>{
 show();fireEvent.change(screen.getByLabelText('Country view'),{target:{value:'KE'}});
 expect(screen.getByText(/Opportunities for Kenya have not been sourced and reviewed yet/)).toBeTruthy();
 expect(screen.queryByText('National Arts Council calls')).toBeNull();
 expect(request).not.toHaveBeenCalled();
});

it('uses the province map to filter individual official job notices, not just directories',()=>{
  show();
  fireEvent.click(screen.getByRole('button',{name:'Select Gauteng'}));
  expect(screen.getByRole('heading',{name:'Administrative Clerk: Management Support Services'})).toBeTruthy();
  expect(screen.queryByRole('heading',{name:'Client Service Officer: COID'})).toBeNull();
  expect(request).not.toHaveBeenCalled();
});

it('uses geographic province shapes with keyboard selection, shared list state and reset',()=>{
 show();
 const area=screen.getByRole('button',{name:'Explore Gauteng on the map'});
 fireEvent.keyDown(area,{key:'Enter'});
 expect(area.getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('button',{name:'Select Gauteng'}).getAttribute('aria-pressed')).toBe('true');
 const jobs=screen.getByRole('region',{name:'Individual government job matches'});
 expect(within(jobs).queryByRole('heading',{name:'Client Service Officer: COID'})).toBeNull();
 fireEvent.keyDown(area,{key:'Escape'});
 expect(screen.getByText(/No province selected/)).toBeTruthy();
 expect(screen.getByRole('button',{name:'Select Gauteng'}).getAttribute('aria-pressed')).toBe('false');
 expect(within(jobs).getByRole('heading',{name:'Client Service Officer: COID'})).toBeTruthy();
 expect(request).not.toHaveBeenCalled();
});
it('makes provinces with no reviewed matches honest and keeps the official route available',()=>{
 show();fireEvent.keyDown(screen.getByRole('button',{name:'Explore Northern Cape on the map'}),{key:' '});
 expect(screen.getByText(/No matching notice in this collection yet/)).toBeTruthy();
 expect(screen.getByRole('link',{name:/Explore official vacancy circulars/}).getAttribute('href')).toBe('https://www.dpsa.gov.za/newsroom/psvc/');
 fireEvent.click(screen.getByRole('button',{name:'Show all South Africa'}));
 expect(screen.getByText(/No province selected/)).toBeTruthy();
 expect(request).not.toHaveBeenCalled();
});
it('keeps nine separate geographic regions, the source attribution and equivalent touch controls',()=>{
 show();
 const map=screen.getByRole('group',{name:/South Africa province map/});
 const regions=within(map).getAllByRole('button');
 expect(regions).toHaveLength(9);
 expect(new Set(regions.map(r=>r.getAttribute('d'))).size).toBe(9);
 for(const region of regions){
   expect(region.getAttribute('fill-rule')).toBe('evenodd');
   expect(region.getAttribute('tabindex')).toBe('0');
 }
 expect(screen.getByRole('link',{name:/geoBoundaries/}).getAttribute('href')).toContain('/ZAF/ADM1/');
 expect(screen.getByRole('link',{name:'CC BY 3.0 IGO'})).toBeTruthy();
 expect(request).not.toHaveBeenCalled();
});
