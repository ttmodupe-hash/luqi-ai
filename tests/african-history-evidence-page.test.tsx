// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import AfricanHistoryEvidence from '../src/components/AfricanHistoryEvidence';
const network=vi.fn();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T08:00:00+02:00'));network.mockReset();vi.stubGlobal('fetch',network);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('offers context, specific evidence and coherent follow-ups without network',()=>{
 render(<AfricanHistoryEvidence/>);
 const lesson=screen.getByRole('article',{name:'Selected African history lesson'});
 expect(within(lesson).getByText(/Christian court of Aksum/)).toBeTruthy();
 fireEvent.click(within(lesson).getByRole('button',{name:'Explore deeper context'}));
 expect(within(lesson).getByText(/modern archaeological literature/)).toBeTruthy();
 const selector=screen.getByRole('group',{name:'African history questions'});
 fireEvent.click(within(selector).getByRole('button',{name:'What was studied in Timbuktu?'}));
 expect(within(lesson).getByText(/inheritance jurisprudence/)).toBeTruthy();
 expect(within(lesson).getAllByRole('link',{name:/Evidence:/}).length).toBe(4);
 expect(network).not.toHaveBeenCalled();
});
it('withholds teaching after expiry while keeping provenance links',()=>{
 vi.setSystemTime(new Date('2027-02-03T00:01:00+02:00'));
 render(<AfricanHistoryEvidence/>);
 expect(screen.getByRole('alert').textContent).toMatch(/expired/);
 expect(screen.queryByText(/Christian court of Aksum/)).toBeNull();
 expect(screen.getByRole('region',{name:'Original evidence for selected lesson'}).querySelectorAll('a').length).toBeGreaterThan(0);
 expect(network).not.toHaveBeenCalled();
});
it('detects stale review after resuming an old tab',()=>{
 render(<AfricanHistoryEvidence/>);
 vi.setSystemTime(new Date('2027-02-03T00:01:00+02:00'));
 fireEvent(window,new Event('focus'));
 expect(screen.getByRole('alert').textContent).toMatch(/expired/);
});
