// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import CivicWardGuide, { CIVIC_CHANNELS } from '../src/components/CivicWardGuide';
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('starts with four working tasks and a collapsed complete source library',()=>{
 render(<CivicWardGuide/>);
 expect(screen.getByRole('heading',{name:'Your civic compass.'})).toBeTruthy();
 const group=screen.getByRole('group',{name:'Civic research tasks'});
 expect(within(group).getAllByRole('button')).toHaveLength(4);
 expect(within(group).getByRole('button',{name:/Find your ward/}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('heading',{name:'The right place. The right records.'})).toBeTruthy();
 expect(screen.getByText('Open the evidence library').closest('details')!.open).toBe(false);
 expect(screen.queryByRole('textbox')).toBeNull();
});
it('changes the focused task without fetching data, storing profiles or requesting location',()=>{
 const request=vi.fn();vi.stubGlobal('fetch',request);const storage=vi.spyOn(Storage.prototype,'setItem');
 render(<CivicWardGuide/>);
 fireEvent.click(screen.getByRole('button',{name:/Know your representatives/}));
 expect(screen.getByRole('heading',{name:'An election result is a starting point.'})).toBeTruthy();
 expect(screen.getByRole('button',{name:/Know your representatives/}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('button',{name:/Find your ward/}).getAttribute('aria-pressed')).toBe('false');
 expect(request).not.toHaveBeenCalled();expect(storage).not.toHaveBeenCalled();
});
it('preserves all seven exact original URLs and the original guidance',()=>{
 render(<CivicWardGuide/>);const library=screen.getByText('Open the evidence library').closest('details')!;
 fireEvent.click(within(library).getByText('Open the evidence library'));
 const cards=library.querySelectorAll('.cm-sourceGrid article');expect(cards).toHaveLength(7);
 const expected=['https://www.gov.za/links/political-parties-organisations-0','https://results.elections.org.za/','https://www.demarcation.org.za/','https://www.tshwane.gov.za/?page_id=17228','https://www.gov.za/documents/constitution/chapter-2-bill-rights','https://www.gov.za/documents/local-government-municipal-structures-act','https://www.agsa.co.za/'];
 expect(CIVIC_CHANNELS.map(s=>s.url)).toEqual(expected);
 for(const [i,card] of Array.from(cards).entries()){
  const a=card.querySelector('a')!;expect(a.getAttribute('href')).toBe(expected[i]);
  expect(a.getAttribute('rel')).toBe('noopener noreferrer');expect(a.getAttribute('target')).toBe('_blank');
  expect(card.textContent).toContain(CIVIC_CHANNELS[i].note);
 }
 expect(library.textContent).toContain('Current ward, councillor and governing coalition are not inferred');
 expect(library.textContent).toContain('including smaller parties and independents');
 expect(library.textContent).toContain('does not request your identity number');
});
it('every task has relevant source actions and explicit external-link labels',()=>{
 render(<CivicWardGuide/>);
 for(const title of ['Find your ward','Know your representatives','Explore party positions','Follow public money']){
  fireEvent.click(screen.getByRole('button',{name:new RegExp(title)}));
  const focus=document.querySelector('.cm-focus')!;expect(focus.querySelectorAll('a').length).toBeGreaterThan(0);
  for(const a of focus.querySelectorAll('a')){
   expect(CIVIC_CHANNELS.some(s=>s.url===a.getAttribute('href'))).toBe(true);
   expect(a.getAttribute('aria-label')).toContain('opens in a new tab');
  }
  expect(within(screen.getByRole('group',{name:'Civic research tasks'})).getAllByRole('button').filter(b=>b.getAttribute('aria-pressed')==='true')).toHaveLength(1);
 }
});
it('uses unique accessible IDs when shared components are mounted twice',()=>{
 const {container}=render(<><CivicWardGuide/><CivicWardGuide/></>);
 const ids=[...container.querySelectorAll('[id]')].map(el=>el.id);expect(new Set(ids).size).toBe(ids.length);
 for(const b of container.querySelectorAll('[aria-controls]'))expect(document.getElementById(b.getAttribute('aria-controls')!)).toBeTruthy();
});
it('keeps both production frontend copies identical',()=>{
 for(const path of ['components/CivicWardGuide.tsx','components/civic-manager.css','features/drive/FieldNotebook.tsx'])expect(readFileSync('src/'+path,'utf8'),path).toBe(readFileSync('app/src/'+path,'utf8'));
});
it('uses no external fonts, perpetual decorative animation, new requests or profiling in the visual component',()=>{
 const component=readFileSync('src/components/CivicWardGuide.tsx','utf8');
 expect(component).not.toMatch(/\bfetch\s*\(|navigator\.geolocation|localStorage|sessionStorage|dangerouslySetInnerHTML/);
 const css=readFileSync('src/components/civic-manager.css','utf8');
 expect(css).toContain('prefers-reduced-motion:reduce');expect(css).not.toMatch(/@import|https?:\/\/|\binfinite\b/);
});
