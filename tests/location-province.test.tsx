// @vitest-environment jsdom
import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import LocationProvinceButton from '../src/components/LocationProvinceButton';
import {suggestProvince} from '../src/lib/location-province';
const getPosition=vi.fn();
beforeEach(()=>{getPosition.mockReset();vi.stubGlobal('isSecureContext',true);Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:getPosition}});vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
const position=(latitude=-25.75,longitude=28.19,accuracy=50)=>({coords:{latitude,longitude,accuracy},timestamp:Date.now()});
it.each([[-25.75,28.19,'GP'],[-33.75,18.96,'WC'],[-29.85,31.02,'KZN'],[-29.12,26.22,'FS'],[-23.9,29.45,'LP'],[-25.47,30.98,'MP'],[-28.73,24.76,'NC'],[-25.86,25.64,'NW'],[-33.3,26.53,'EC']])('suggests province for a well inside city %s,%s',(lat,lon,province)=>expect(suggestProvince(Number(lat),Number(lon),30)).toBe(province));
it('fails closed for Lesotho, Eswatini, outside SA and invalid or inaccurate fixes',()=>{
 for(const args of [[-33.92,18.42,30],[-33.95,25.6,30],[-29.3,27.5,10],[-26.3,31.1,10],[0,0,10],[-25.75,28.19,10001],[NaN,28,10],[-25,28,-1]])expect(suggestProvince(...args as [number,number,number])).toBe(null);
});
it('does not request on mount; requests once with bounded options and requires separate province confirmation',()=>{
 const select=vi.fn();render(<LocationProvinceButton onSelect={select}/>);expect(getPosition).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Use my location'));expect(getPosition).toHaveBeenCalledTimes(1);expect(getPosition.mock.calls[0][2]).toEqual({enableHighAccuracy:false,maximumAge:0,timeout:10000});
 act(()=>getPosition.mock.calls[0][0](position()));expect(select).not.toHaveBeenCalled();fireEvent.click(screen.getByText('Use Gauteng'));expect(select).toHaveBeenCalledWith('GP');
});
it('denial keeps manual selection available and no automatic retry',()=>{
 render(<LocationProvinceButton onSelect={vi.fn()}/>);fireEvent.click(screen.getByText('Use my location'));act(()=>getPosition.mock.calls[0][1]({code:1}));expect(screen.getByText(/Location permission was denied/).textContent).toContain('permission was denied');expect(getPosition).toHaveBeenCalledTimes(1);
});
it('cancel ignores late success and a watchdog releases a stalled permission prompt',()=>{
 vi.useFakeTimers();const select=vi.fn();render(<LocationProvinceButton onSelect={select}/>);fireEvent.click(screen.getByText('Use my location'));const success=getPosition.mock.calls[0][0];fireEvent.click(screen.getByText('Cancel location request'));act(()=>success(position()));expect(screen.queryByText('Use Gauteng')).toBeNull();
 fireEvent.click(screen.getByText('Use my location'));act(()=>vi.advanceTimersByTime(12000));expect(screen.getByText(/Location request timed out/).textContent).toContain('timed out');act(()=>getPosition.mock.calls[1][0](position()));expect(select).not.toHaveBeenCalled();expect(screen.queryByText('Use Gauteng')).toBeNull();
});
it('ignores hidden results and accepts fresh browser fixes independently of wall-clock differences',()=>{
 render(<LocationProvinceButton onSelect={vi.fn()}/>);fireEvent.click(screen.getByText('Use my location'));vi.spyOn(document,'visibilityState','get').mockReturnValue('hidden');act(()=>getPosition.mock.calls[0][0](position()));expect(screen.getByText(/Location result ignored/).textContent).toContain('hidden');
 vi.spyOn(document,'visibilityState','get').mockReturnValue('visible');fireEvent.click(screen.getByText('Use my location'));act(()=>getPosition.mock.calls[1][0]({...position(),timestamp:Date.now()-120000}));expect(screen.getByText('Use Gauteng')).toBeTruthy();
});
it('same-origin permission policy and mirrored privacy files stay aligned; no location transport or persistence',()=>{
 expect(readFileSync('api/boot.ts','utf8')).toContain('camera=(), microphone=(self), geolocation=(self)');
 for(const f of ['components/LocationProvinceButton.tsx','components/SouthAfricaProvinceMap.tsx','lib/location-province.ts','lib/sa-province-map.ts','pages/PrivacyPage.tsx'])expect(readFileSync('src/'+f,'utf8')).toBe(readFileSync('app/src/'+f,'utf8'));
 const text=readFileSync('src/components/LocationProvinceButton.tsx','utf8');expect(text).not.toMatch(/watchPosition|fetch\(|localStorage|sessionStorage|sendBeacon|console\./);
});
