// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import MunicipalServicesPage from '../src/pages/MunicipalServicesPage';
const fetchMock=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T12:00:00+02:00'));fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('finds all nine provinces and original municipal contacts without GPS or a paid call',()=>{
 render(<MemoryRouter><MunicipalServicesPage/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Find your municipality. Get practical support.'})).toBeTruthy();
 expect(within(screen.getByLabelText('Municipality province')).getAllByRole('option')).toHaveLength(10);
 expect(screen.getByRole('button',{name:/City of Ekurhuleni/})).toBeTruthy();
 expect(screen.getAllByRole('link',{name:/government directory|Live municipality contacts|Live government contact/i}).length).toBeGreaterThan(0);
 expect(fetchMock).not.toHaveBeenCalled();
});
it('filters Gauteng council and generates a device-only checklist without sensitive account fields',()=>{
 render(<MemoryRouter><MunicipalServicesPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Municipality province'),{target:{value:'GP'}});
 fireEvent.change(screen.getByLabelText('Search municipality names'),{target:{value:'Tshwane'}});
 const council=screen.getByRole('button',{name:/City of Tshwane Metropolitan Municipality/});
 fireEvent.click(council);
 expect(screen.getByRole('heading',{name:'City of Tshwane Metropolitan Municipality'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Municipal service topic'),{target:{value:'indigent'}});
 expect(screen.getByRole('heading',{name:'Indigent register and free basic services'})).toBeTruthy();
 expect((screen.getByLabelText('Prepared municipal checklist') as HTMLTextAreaElement).value)
  .toContain('City of Tshwane Metropolitan Municipality');
 expect(screen.queryByRole('textbox',{name:/bank details|municipal account number|identity number/})).toBeNull();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('makes unknown council explicit rather than inventing jurisdiction',()=>{
 render(<MemoryRouter><MunicipalServicesPage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Search municipality names'),{target:{value:'xyz municipality nowhere'}});
 expect(screen.getByText(/does not mean your municipality does not exist/)).toBeTruthy();
});
