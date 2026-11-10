// @vitest-environment jsdom
import React from 'react';
import {afterEach, expect, test, vi} from 'vitest';
import {cleanup, render, screen, within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {readFileSync} from 'node:fs';
import HomeHistorySections from '../src/components/HomeHistorySections';

vi.mock('../src/components/HeroAiChatConsole',()=>({default:()=>null}));
afterEach(cleanup);

test('home card cites what Numbers 12:1 actually says, not an inferred name',()=>{
 render(<MemoryRouter><HomeHistorySections /></MemoryRouter>);
 const figures=document.querySelector('.luqi-history-figures')!;
 expect(within(figures as HTMLElement).getByText('Moses’ unnamed Cushite wife')).toBeTruthy();
 expect(within(figures as HTMLElement).getByText('Numbers 12:1')).toBeTruthy();
 expect(within(figures as HTMLElement).queryByText('Zipporah')).toBeNull();
 expect(figures.getAttribute('aria-label')).toContain('identities may be disputed');
 expect(screen.getByText(/Numbers 12:1 describes Moses’ Cushite wife without naming her/)).toBeTruthy();
 expect(screen.getByText(/Whether these refer to the same person is disputed/)).toBeTruthy();
 expect(screen.getByRole('button',{name:'Explore the topics'}).getAttribute('aria-expanded')).toBe('false');
});
test('direct textual sources are safe external links and other Luqi routes are retained',()=>{
 render(<MemoryRouter><HomeHistorySections /></MemoryRouter>);
 for(const [name,expected] of [
  ['Read Numbers 12:1','https://www.sefaria.org/Numbers.12.1-15'],
  ['Read Exodus 2:21','https://bible.usccb.org/bible/exodus/2']
 ]){
  const link=screen.getByRole('link',{name});
  expect(link.getAttribute('href')).toBe(expected);
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
 }
 expect(screen.getByRole('navigation',{name:"Quick access to Luqi's working tools"})).toBeTruthy();
 expect(screen.getByRole('link',{name:'Research & sources'}).getAttribute('href')).toBe('/comparative-evidence');
});
test('historical attribution and low-data homepage remain mirrored',()=>{
 expect(readFileSync('src/components/HomeHistorySections.tsx','utf8'))
  .toBe(readFileSync('app/src/components/HomeHistorySections.tsx','utf8'));
});
