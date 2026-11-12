// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import SocialSupportPage from '../src/pages/SocialSupportPage';
const fetchMock=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T08:00:00+02:00'));fetchMock.mockReset();vi.stubGlobal('fetch',fetchMock);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('starts with SASSA official routes, without a private-information entry form',()=>{
 render(<MemoryRouter><SocialSupportPage/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:/SASSA grants and UIF claims support/})).toBeTruthy();
 expect(screen.getByRole('button',{name:'SASSA grants'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('heading',{name:'Social Relief of Distress (SRD)'})).toBeTruthy();
 expect(screen.getByRole('link',{name:/Official SASSA SRD portal/}).getAttribute('href')).toBe('https://srd.sassa.gov.za/');
 expect(screen.queryByRole('textbox')).toBeNull();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('switches to UIF new portal, with employer and appeals paths, without a model request',()=>{
 render(<MemoryRouter><SocialSupportPage/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'UIF benefits'}));
 expect(screen.getByRole('heading',{name:'Unemployment benefits'})).toBeTruthy();
 expect(screen.getByRole('link',{name:/Current UIF Online employee claims/}).getAttribute('href')).toBe('https://uifonline.labour.gov.za/uifOnline/');
 fireEvent.change(screen.getByLabelText('Help topic'),{target:{value:'uif-claim'}});
 expect(screen.getByRole('heading',{name:'UIF claim status, appeals and delayed payments'})).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Help topic'),{target:{value:'uif-employers'}});
 expect(screen.getByText(/employer portal currently handles registration/)).toBeTruthy();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('direct UIF URL selects UIF by default and labels stale guidance',()=>{
 vi.setSystemTime(new Date('2026-11-08T10:00:00+02:00'));
 render(<MemoryRouter><SocialSupportPage defaultAgency="uif"/></MemoryRouter>);
 expect(screen.getByRole('button',{name:'UIF benefits'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByText(/past their review window/)).toBeTruthy();
});

it('labels stale SASSA and UIF guidance truthfully without promising daily specialist monitoring',()=>{
 vi.setSystemTime(new Date('2026-11-09T15:00:00+02:00'));
 render(<MemoryRouter><SocialSupportPage/></MemoryRouter>);
 expect(screen.getByText(/Use these steps to prepare your enquiry, and verify current rates/)).toBeTruthy();
 expect(screen.getByText(/past their review window/)).toBeTruthy();
 expect(screen.queryByText(/separate daily official-source review/)).toBeNull();
 expect(screen.getByRole('link',{name:/Official SASSA SRD portal/}).getAttribute('href')).toBe('https://srd.sassa.gov.za/');
 fireEvent.click(screen.getByRole('button',{name:'UIF benefits'}));
 expect(screen.getByText(/Luqi does not access your agency account or continuously update these instructions/)).toBeTruthy();
 expect(screen.getByRole('link',{name:/Current UIF Online employee claims/}).getAttribute('href')).toBe('https://uifonline.labour.gov.za/uifOnline/');
 expect(fetchMock).not.toHaveBeenCalled();
});

it('switches to expired guidance on its own while the SASSA tab stays open',()=>{
 vi.setSystemTime(new Date('2026-11-05T23:59:58+02:00'));
 render(<MemoryRouter><SocialSupportPage/></MemoryRouter>);
 expect(screen.queryByText(/past their review window/)).toBeNull();
 act(()=>vi.advanceTimersByTime(2000));
 expect(screen.getByText(/past their review window/)).toBeTruthy();
 expect(fetchMock).not.toHaveBeenCalled();
});
it('rechecks on focus and page restoration even if a background timer was suspended',()=>{
 vi.setSystemTime(new Date('2026-11-05T20:00:00+02:00'));
 render(<MemoryRouter><SocialSupportPage defaultAgency="uif"/></MemoryRouter>);
 expect(screen.queryByText(/past their review window/)).toBeNull();
 act(()=>{
   vi.setSystemTime(new Date('2026-11-06T08:00:00+02:00'));
   window.dispatchEvent(new Event('focus'));
 });
 expect(screen.getByText(/past their review window/)).toBeTruthy();
 expect(screen.getByRole('button',{name:'UIF benefits'}).getAttribute('aria-pressed')).toBe('true');
 expect(fetchMock).not.toHaveBeenCalled();
});
