// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TenderDeskPage from '../src/pages/TenderDeskPage';
vi.mock('../src/components/TenderOriginalForms',()=>({TenderOriginalForms:()=>null}));
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
it('rechecks the clock at export before a timer can repaint an expired approval',()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-29T10:00:00+02:00'));
 const create=vi.fn(()=> 'blob:test');vi.stubGlobal('URL',class extends URL {static createObjectURL=create;static revokeObjectURL=vi.fn();});
 const network=vi.fn();vi.stubGlobal('fetch',network);
 render(<MemoryRouter><TenderDeskPage/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Sources & history',exact:true}));
 const card=screen.getByRole('heading',{name:/Contractor-development mentorship/}).closest('article')!;
 fireEvent.click(within(card).getByRole('button',{name:'Prepare bidder worksheet for this tender'}));
 for(const [label,value] of [
  ['Bidder trading name','Synthetic supplier'],['Your truthful response to the tender scope','Synthetic scope'],
  ['How you propose to deliver the work','Synthetic method'],['Actual related experience you can substantiate','Synthetic experience'],
  ['Pricing assumptions, exclusions and tax basis for review','Synthetic pricing'],['Bid price in rand','1000'],
 ])fireEvent.change(screen.getByLabelText(label),{target:{value}});
 fireEvent.change(screen.getByLabelText('Confirmed tender submission method'),{target:{value:'physical'}});
 const gates=within(screen.getByRole('region',{name:'Mandatory human tender approvals'})).getAllByRole('checkbox');
 for(const gate of gates)fireEvent.click(gate);
 const button=screen.getByRole('button',{name:'Export human-approved preparation pack'});
 expect(button.hasAttribute('disabled')).toBe(false);
 // Set system time without advancing timers: the rendered button is still enabled.
 vi.setSystemTime(new Date('2026-10-31T00:00:00+02:00'));
 fireEvent.click(button);
 expect(create).not.toHaveBeenCalled();expect(network).not.toHaveBeenCalled();
 expect(screen.getByText(/The deadline or review conditions changed/)).toBeTruthy();
 expect(button.hasAttribute('disabled')).toBe(true);
 expect((screen.getByLabelText('Bidder trading name') as HTMLInputElement).value).toBe('Synthetic supplier');
});
