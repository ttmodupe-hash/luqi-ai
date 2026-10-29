// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import VisaEntryGuidePage from '../src/pages/VisaEntryGuidePage';
const fetchMock=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T10:00:00+02:00'));fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('does not collect an ID, passport number or bank details or trigger a provider on opening',()=>{
 render(<MemoryRouter><VisaEntryGuidePage/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:/Plan your journey. Verify entry requirements/})).toBeTruthy();
 expect(screen.getByLabelText('Destination country')).toBeTruthy();
 expect(screen.getByLabelText('Passport nationality')).toBeTruthy();
 expect(screen.getByText(/This first release covers five destinations/)).toBeTruthy();
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('gives a Kenya reviewed, date-scoped source example, not an entry permission',()=>{
 render(<MemoryRouter><VisaEntryGuidePage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Destination country'),{target:{value:'KE'}});
 fireEvent.change(screen.getByLabelText('Passport nationality'),{target:{value:'South Africa'}});
 fireEvent.change(screen.getByLabelText('Intended stay days'),{target:{value:'14'}});
 expect(screen.getByText(/Kenya’s official How to Apply page lists South Africa/)).toBeTruthy();
 expect(screen.getByText(/dated published rule, not an individual eligibility decision/)).toBeTruthy();
 expect(screen.getAllByRole('link',{name:'View government website'}).length).toBeGreaterThanOrEqual(2);
 expect(fetchMock).not.toHaveBeenCalled();
});
it('shows expiry at the review boundary without pretending an application',()=>{
 vi.setSystemTime(new Date('2026-11-06T10:00:00+02:00'));
 render(<MemoryRouter><VisaEntryGuidePage/></MemoryRouter>);
 expect(screen.getByRole('alert').textContent).toMatch(/source review expired/i);
});
