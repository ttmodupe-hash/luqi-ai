// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import CivicWardGuide from '../src/components/CivicWardGuide';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('keeps official verification channels available without inferring political or location data',()=>{
 const request=vi.fn();vi.stubGlobal('fetch',request);render(<CivicWardGuide/>);
 expect(screen.getByRole('heading',{name:'Party and ward verification guide'})).toBeTruthy();
 expect(screen.getAllByRole('link')).toHaveLength(7);
 for(const a of screen.getAllByRole('link')){expect(a.getAttribute('href')).toMatch(/^https:\/\//);expect(a.getAttribute('rel')).toBe('noopener noreferrer');}
 expect(screen.getByText(/Current ward, councillor and governing coalition are not inferred/)).toBeTruthy();
 expect(screen.queryByRole('textbox')).toBeNull();expect(request).not.toHaveBeenCalled();
});
