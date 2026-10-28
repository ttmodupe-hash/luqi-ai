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
 expect(screen.getByText(/NSFAS 2027/)).toBeTruthy();
 expect(request).not.toHaveBeenCalled();
});
it('selects a province without pretending sources have verified job coordinates',()=>{
 show();fireEvent.click(screen.getByRole('button',{name:'Select Gauteng'}));
 expect(screen.getByText(/Selected Gauteng/)).toBeTruthy();
 expect(screen.getByText(/markers are provinces, not verified job locations/)).toBeTruthy();
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
