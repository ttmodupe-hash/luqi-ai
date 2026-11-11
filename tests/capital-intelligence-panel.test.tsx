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
   expect(screen.getAllByRole('button',{name:'Prepare review draft'})).toHaveLength(11);
   expect(screen.getByText(/No current application windows or closing dates are certified/i)).toBeTruthy();
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
   expect(screen.getByRole('article',{name:'TIA Seed Fund'}).textContent).toMatch(/verify any cross-border exceptions with the publisher/i);
   expect(screen.getByRole('article',{name:'TIA Seed Fund'}).textContent).toContain('Not currently aligned');
 });

 it('shows the MIT Solve idea-stage exception and expired deadline without any network call',()=>{
   const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
   render(<CapitalIntelligencePanel/>);
   fireEvent.change(screen.getByLabelText('Project location'),{target:{value:'KE'}});
   fireEvent.change(screen.getByLabelText('Funding geography'),{target:{value:'GLOBAL'}});
   fireEvent.change(screen.getByLabelText('Project stage'),{target:{value:'IDEA'}});
   const mit=screen.getByRole('article',{name:'MIT Solve Global Challenges'});
   expect(mit.textContent).toContain('Concept-stage ideas are reviewed only under the Indigenous Communities Fellowship');
   expect(mit.textContent).toContain('6 November 2026 at 12:00 EST (19:00 SAST)');
   expect(mit.textContent).toContain('Check programme criteria');
   fireEvent.change(screen.getByLabelText('Project stage'),{target:{value:'MVP'}});
   expect(mit.textContent).not.toContain('Concept-stage ideas are reviewed only under');
   expect(mit.textContent).toContain('19:00 SAST');
   expect(fetcher).not.toHaveBeenCalled();
 });
 it('shows the closed TEF 2026 application round before a user prepares a worksheet',()=>{
   const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
   render(<CapitalIntelligencePanel/>);
   fireEvent.change(screen.getByLabelText('Project location'),{target:{value:'KE'}});
   const tef=screen.getByRole('article',{name:'Tony Elumelu Foundation Entrepreneurship Programme'});
   expect(tef.textContent).toContain('1 January to 1 March 2026 and has closed');
   fireEvent.click(within(tef).getByRole('button',{name:'Prepare review draft'}));
   const text=screen.getByRole('textbox',{name:'Funding preparation draft text'}) as HTMLTextAreaElement;
   expect(text.value).toContain('does not establish an open 2027 round');
   expect(fetcher).not.toHaveBeenCalled();
 });
 it('offers pan-African and global sources for Kenyan project locations without declaring eligibility',()=>{
   const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
   render(<CapitalIntelligencePanel/>);
   fireEvent.change(screen.getByLabelText('Project location'),{target:{value:'KE'}});
   fireEvent.change(screen.getByLabelText('Funding geography'),{target:{value:'PAN_AFRICA'}});
   expect(screen.getByRole('article',{name:'Tony Elumelu Foundation Entrepreneurship Programme'}).textContent)
     .toContain('Check programme criteria');
   expect(screen.getByRole('article',{name:'AECF Enterprise Challenge Finance'})).toBeTruthy();
   expect(screen.getByRole('article',{name:'UNDP timbuktoo CreativeTech Launchpad'})).toBeTruthy();
   expect(screen.getByRole('article',{name:'UNDP timbuktoo GreenTech Launchpad'}).textContent)
     .toContain('NOT a guaranteed cash grant');
   expect(screen.queryByRole('article',{name:'TIA Seed Fund'})).toBeNull();
   fireEvent.change(screen.getByLabelText('Funding geography'),{target:{value:'GLOBAL'}});
   expect(screen.getByRole('article',{name:'Global Innovation Fund'})).toBeTruthy();
   expect(screen.getByRole('article',{name:'MIT Solve Global Challenges'})).toBeTruthy();
   expect(screen.getByRole('article',{name:'GEF Small Grants Programme'}).textContent)
     .toContain('not ordinary startup capital');
   fireEvent.change(screen.getByLabelText('Search funding programmes'),{target:{value:'MIT'}});
   expect(screen.getAllByRole('button',{name:'Prepare review draft'})).toHaveLength(1);
   fireEvent.click(screen.getByRole('button',{name:'Prepare review draft'}));
   expect((screen.getByRole('textbox',{name:'Funding preparation draft text'}) as HTMLTextAreaElement).value)
     .toMatch(/Project location: Kenya[\s\S]*CURRENT FUNDING WINDOW: NOT VERIFIED/);
   expect(fetcher).not.toHaveBeenCalled();
 });
});