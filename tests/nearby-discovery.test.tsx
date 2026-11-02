// @vitest-environment jsdom
import React from 'react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {readFileSync} from 'node:fs';
import NearMePage from '../src/pages/NearMePage';
import MunicipalServicesPage from '../src/pages/MunicipalServicesPage';
import OpportunityCompassPage from '../src/pages/OpportunityCompassPage';
import LocalPulsePage from '../src/pages/LocalPulsePage';
import {mapDiscoveryLink,parseProvince} from '../src/lib/nearby-discovery';
const request=vi.fn(),getPosition=vi.fn();
beforeEach(()=>{request.mockReset();getPosition.mockReset();vi.stubGlobal('fetch',request);Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:getPosition}});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
it('shows no fake near-distance, public businesses or automatic location/map request',()=>{
 render(<MemoryRouter><NearMePage/></MemoryRouter>);
 expect(screen.getByRole('heading',{name:'Near me — find your next stop'})).toBeTruthy();
 expect(screen.queryByRole('link',{name:'Open search in Google Maps'})).toBeNull();expect(request).not.toHaveBeenCalled();expect(getPosition).not.toHaveBeenCalled();
 expect(screen.getByRole('link',{name:'Create my business profile'}).getAttribute('href')).toBe('/business-connect');
});
it('filters real council names and carries only selected province into internal guide links',()=>{
 render(<MemoryRouter><NearMePage/></MemoryRouter>);
 fireEvent.change(screen.getByLabelText('Discovery province'),{target:{value:'GP'}});
 fireEvent.change(screen.getByLabelText('Find a council'),{target:{value:'Tshwane'}});
 const councils=screen.getByRole('region',{name:'Councils in your selected province'});
 expect(within(councils).getByRole('heading',{name:'City of Tshwane Metropolitan Municipality'})).toBeTruthy();
 expect(within(councils).queryByText('City of Cape Town Metropolitan Municipality')).toBeNull();
 const links=within(screen.getByRole('region',{name:'Local Luqi guides'})).getAllByRole('link');
 expect(links.map(a=>a.getAttribute('href'))).toEqual(['/opportunities?province=GP','/municipalities?province=GP','/local-pulse?province=GP']);
 expect(request).not.toHaveBeenCalled();
});
it('external map search is prepared locally and never includes a GPS origin or account field',()=>{
 render(<MemoryRouter><NearMePage/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Map search locality'),{target:{value:'Mabopane'}});
 const link=screen.getByRole('link',{name:'Open search in Google Maps'});expect(link.getAttribute('href')).toBe('https://www.google.com/maps/search/?api=1&query=businesses%2C%20Mabopane%2C%20South%20Africa');
 fireEvent.change(screen.getByLabelText('Map provider'),{target:{value:'osm'}});expect(screen.getByRole('link',{name:'Open search in OpenStreetMap'}).getAttribute('rel')).toBe('noopener noreferrer');
 expect(request).not.toHaveBeenCalled();expect(getPosition).not.toHaveBeenCalled();
});
it('rejects arbitrary providers, unknown provinces and unbounded/control-character searches',()=>{
 expect(parseProvince('GP')).toBe('GP');for(const p of ['ZA','gps','<script>',null])expect(parseProvince(p)).toBeNull();
 for(const text of ['', 'x'.repeat(81),'town\n<script>'])expect(mapDiscoveryLink('google','business',text,'GP')).toBeNull();
 expect(mapDiscoveryLink('javascript' as never,'business','Pretoria','GP')).toBeNull();
 expect(mapDiscoveryLink('osm','business','Mabopane','GP')).toBe('https://www.openstreetmap.org/search?query=Mabopane%2C%20Gauteng%2C%20South%20Africa');
 expect(mapDiscoveryLink('apple','tourism','Pretoria & Hatfield','GP')).toContain('https://maps.apple.com/?q=');
});
it.each([[MunicipalServicesPage,'/municipalities?province=GP','Municipality province','GP'],[LocalPulsePage,'/local-pulse?province=LP','Local Pulse region','other']] as const)('honours a validated province in guide links', (Page,path,label,value)=>{
 render(<MemoryRouter initialEntries={[path]}><Page/></MemoryRouter>);expect((screen.getByLabelText(label) as HTMLSelectElement).value).toBe(value);
});
it('opportunity guide filters the actual published province from the link',()=>{
 render(<MemoryRouter initialEntries={['/opportunities?province=GP']}><OpportunityCompassPage/></MemoryRouter>);
 expect(screen.getByRole('button',{name:'Select Gauteng'}).getAttribute('aria-pressed')).toBe('true');
});
it('mirrors implementation and lazy route in both frontends',()=>{
 for(const f of ['pages/NearMePage.tsx','lib/nearby-discovery.ts','components/workspace-catalog.ts','pages/PrivacyPage.tsx'])expect(readFileSync('src/'+f,'utf8')).toBe(readFileSync('app/src/'+f,'utf8'));
 const source=readFileSync('src/pages/NearMePage.tsx','utf8');expect(source).not.toMatch(/fetch\(|localStorage|sessionStorage|latitude|longitude|watchPosition/);
});
