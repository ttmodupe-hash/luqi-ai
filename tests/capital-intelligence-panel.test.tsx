// @vitest-environment jsdom
import React from 'react';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import CapitalIntelligencePanel from '../src/components/CapitalIntelligencePanel';

afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.useRealTimers();});
describe('Capital Intelligence accessible browser-only user journey',()=>{
 it('renders real publisher references but does not touch any external system',()=>{
   vi.setSystemTime(new Date('2026-11-02T17:00:00Z'));
   const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
   render(<CapitalIntelligencePanel/>);
   expect(screen.getByRole('heading',{name:'Luqi Capital Intelligence'})).toBeTruthy();
   expect(screen.getAllByRole('button',{name:'Prepare review draft'})).toHaveLength(3);
   expect(screen.getByText(/current application windows or closing dates have been verified/i)).toBeTruthy();
   expect(screen.getByRole('article',{name:'NYDA Grant Programme'}).textContent).toContain('Not currently aligned');
   expect(screen.getByRole('article',{name:'TIA Seed Fund'}).textContent).toContain('Potential programme to explore');
   expect(fetcher).not.toHaveBeenCalled();
 });
 it('recomputes fit from explicit changes and prepares a non-submitted worksheet',()=>{
   const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
   render(<CapitalIntelligencePanel/>);
   const nyda=screen.getByRole('article',{name:'NYDA Grant Programme'});
   fireEvent.change(screen.getByLabelText('Funding purpose'),{target:{value:'BUSINESS_GROWTH'}});
   fireEvent.change(screen.getByLabelText('Founder age (optional, checked locally)'),{target:{value:'22'}});
   expect(nyda.textContent).toContain('Potential programme to explore');
   fireEvent.change(screen.getByLabelText('Founder age (optional, checked locally)'),{target:{value:'41'}});
   expect(nyda.textContent).toContain('Not currently aligned');
   fireEvent.change(screen.getByLabelText('Founder age (optional, checked locally)'),{target:{value:'22'}});
   fireEvent.change(screen.getByLabelText('Project name'),{target:{value:'Community health project'}});
   fireEvent.change(screen.getByRole('textbox',{name:'Project summary'}),{target:{value:'Low-bandwidth community health support'}});
   fireEvent.click(screen.getByLabelText('Business plan'));
   fireEvent.click(screen.getByLabelText('Concept note document'));
   const tia=screen.getByRole('article',{name:'TIA Seed Fund'});
   expect(tia.textContent).toContain('67%');
   fireEvent.click(within(tia).getByRole('button',{name:'Prepare review draft'}));
   const text=screen.getByRole('textbox',{name:'Funding preparation draft text'}) as HTMLTextAreaElement;
   expect(text.value).toContain('Community health project');
   expect(text.value).toContain('No application has been submitted.');
   expect(text.value).toContain('CURRENT FUNDING WINDOW: NOT VERIFIED');
   expect(screen.getByRole('link',{name:'Download preparation worksheet'}).getAttribute('href')).toMatch(/^data:text\/plain/);
   expect(fetcher).not.toHaveBeenCalled();
   fireEvent.change(screen.getByLabelText('Project stage'),{target:{value:'IDEA'}});
   expect(screen.queryByRole('textbox',{name:'Funding preparation draft text'})).toBeNull();
 });
 it('does not accept excessive or invalid ages and explains cross-border uncertainty',()=>{
   render(<CapitalIntelligencePanel/>);
   const age=screen.getByLabelText('Founder age (optional, checked locally)') as HTMLInputElement;
   fireEvent.change(age,{target:{value:'999'}});
   expect(age.value).toBe('');
   fireEvent.change(screen.getByLabelText('Project location'),{target:{value:'OTHER'}});
   expect(screen.getByRole('article',{name:'TIA Seed Fund'}).textContent).toMatch(/cross-border eligibility is unconfirmed/);
 });
});