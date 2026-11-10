// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import TenderDeskPage from '../src/pages/TenderDeskPage';
const req=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T08:00:00+02:00'));req.mockReset();vi.stubGlobal('fetch',req)});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals()});
const show=()=>{const result=render(<MemoryRouter><TenderDeskPage/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Sources & history',exact:true}));return result;};
it('lists official current tender sources with no login or paid API calls',()=>{
 show();
 expect(screen.getByRole('heading',{name:'Find work your business can deliver.'})).toBeTruthy();
 expect(screen.getAllByRole('link',{name:'Open official source'}).length).toBeGreaterThanOrEqual(6);
 expect(screen.getByText('PS-F 02-2027')).toBeTruthy();
 expect(req).not.toHaveBeenCalled();
});
it('filters sources by keyword and supports original-issuer source navigation',()=>{
 show();
 fireEvent.change(screen.getByLabelText('Search tender notices'),{target:{value:'pressure'}});
 expect(screen.getByRole('heading',{name:/Pressure management/})).toBeTruthy();
 expect(screen.queryByRole('heading',{name:/laundry services/})).toBeNull();
 expect(req).not.toHaveBeenCalled();
});
it('excludes the past compulsory briefing by default, and warns on historical review',()=>{
 show();
 expect(screen.queryByRole('heading',{name:/Electrical maintenance, repairs and compliance/})).toBeNull();
 fireEvent.click(screen.getByLabelText(/Show expired tenders and those with a past compulsory briefing/));
 expect(screen.getByText(/Past compulsory briefing/)).toBeTruthy();
});
it('routes GCIS USB search to issuer documents and preserves synthetic draft on a 320px DOM viewport',()=>{
 Object.defineProperty(window,'innerWidth',{configurable:true,value:320});
 show();
 fireEvent.change(screen.getByLabelText('Search tender notices'),{target:{value:'USB'}});
 const card=screen.getByRole('heading',{name:/South African Sign Language interpreting/}).closest('article')!;
 expect(card.className).toContain('min-w-0');
 const pdf=within(card).getByRole('link',{name:'Original issuer specification (PDF)'});
 const audio=within(card).getByRole('link',{name:'Issuer audio addendum (not reviewed by Luqi)'});
 expect(pdf.getAttribute('href')).toMatch(/www\.gcis\.gov\.za\/.+\.pdf$/);
 expect(audio.getAttribute('href')).toMatch(/www\.gcis\.gov\.za\/.+\.mp3$/);
 expect(pdf.getAttribute('rel')).toBe('noopener noreferrer');
 expect(card.textContent).toContain('No emailed bids');
 expect(card.textContent).toContain('Audio addendum contents NOT inspected');
 fireEvent.click(within(card).getByRole('button',{name:'Prepare bidder worksheet for this tender'}));
 fireEvent.change(screen.getByRole('textbox',{name:'Bidder trading name'}),{target:{value:'Synthetic Example Supplier'}});
 fireEvent.change(screen.getByLabelText('Search tender notices'),{target:{value:'fictional lunar printer'}});
 expect(screen.getByText(/No reviewed notice matches/)).toBeTruthy();
 expect(screen.getByRole('textbox',{name:'Bidder trading name'}).getAttribute('value')).toBe('Synthetic Example Supplier');
 expect(req).not.toHaveBeenCalled();
});
it('tender wizard does not submit or sign, and only downloads a marked draft after user selection',()=>{
 show();
 const heading=screen.getByRole('heading',{name:/Contractor-development mentorship/});
 const card=heading.closest('article')!;
 fireEvent.click(within(card).getByRole('button',{name:'Prepare bidder worksheet for this tender'}));
 expect(screen.getByRole('textbox',{name:'Official tender reference'}).getAttribute('value')).toBe('PS-REDP 17-2026');
 expect(screen.getByText(/No government affiliation or automatic tender submission/)).toBeTruthy();
 expect(screen.getByRole('button',{name:'Export human-approved preparation pack'}).hasAttribute('disabled')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Preview bid preparation worksheet'}));
 expect(screen.getByRole('region',{name:'Local tender worksheet preview'}).textContent).toContain('NOT AN OFFICIAL TENDER FORM');
 expect(req).not.toHaveBeenCalled();
});
