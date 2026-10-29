// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import TownshipEconomyPage from '../src/pages/TownshipEconomyPage';
const fetchMock=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T12:00:00+02:00'));fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('shows verifiable TREP financing terms without declaring funding open or free',()=>{
 render(<MemoryRouter><TownshipEconomyPage/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Build your business. Find the right official support.'})).toBeTruthy();
 expect(screen.getByText(/up to R3 million, 5% interest/)).toBeTruthy();
 expect(screen.getAllByText(/Check the original issuer for a currently open individual opportunity/).length).toBeGreaterThan(0);
 expect(screen.getByText(/not evidence that a new intake is open/)).toBeTruthy();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('changes spaza funding into food licensing with municipal verification, without an ID input',()=>{
 render(<MemoryRouter><TownshipEconomyPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Township business sector'),{target:{value:'food'}});
 fireEvent.change(screen.getByLabelText('Township support goal'),{target:{value:'licence'}});
 fireEvent.change(screen.getByLabelText('Business province'),{target:{value:'GP'}});
 fireEvent.change(screen.getByLabelText('Business municipality'),{target:{value:'City of Tshwane Metropolitan Municipality'}});
 expect(screen.getByText(/Certificate of Acceptability requirements/)).toBeTruthy();
 expect(screen.getByText(/City of Tshwane Metropolitan Municipality using the original government/)).toBeTruthy();
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('shows expired review warning rather than promising ongoing verification',()=>{
 vi.setSystemTime(new Date('2026-11-10T12:00:00+02:00'));
 render(<MemoryRouter><TownshipEconomyPage/></MemoryRouter>);
 expect(screen.getByText(/review window has passed/)).toBeTruthy();
});
