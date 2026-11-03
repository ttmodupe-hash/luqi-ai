// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import LuqiDrivePage from '../src/pages/LuqiDrivePage';

afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
const pos=(latitude:number,longitude:number,accuracy:number,speed:number)=>
  ({coords:{latitude,longitude,accuracy,speed,altitude:null,altitudeAccuracy:null,heading:null},timestamp:Date.now()} as GeolocationPosition);

it('requires two deliberate opt-ins, uses local reviewed audio and suppresses GPS repeat bursts',()=>{
  let emit:PositionCallback=()=>{};
  const watch=vi.fn((cb:PositionCallback)=>{emit=cb;return 72;});
  const clear=vi.fn();
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition:watch,clearWatch:clear}});
  const speak=vi.fn();
  const cancel=vi.fn();
  vi.stubGlobal('speechSynthesis',{speak,cancel,speaking:false});
  vi.stubGlobal('SpeechSynthesisUtterance',class {
    rate=1;pitch=1;onerror:((e:unknown)=>void)|null=null;
    constructor(public text:string){}
  });
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);

  const toggle=screen.getByRole('checkbox',{name:/Enable automatic nearby audio stories/i});
  expect((toggle as HTMLInputElement).checked).toBe(false);
  expect(watch).not.toHaveBeenCalled();
  fireEvent.click(toggle);
  expect(watch).not.toHaveBeenCalled(); // Never request location by enabling audio alone.
  fireEvent.click(screen.getByRole('button',{name:/Start location assist/i}));
  expect(watch).toHaveBeenCalledTimes(1);
  act(()=>emit(pos(-24.70,28.41,20,32)));
  expect(speak).toHaveBeenCalledTimes(1);
  expect((speak.mock.calls[0]![0] as {text:string}).text).toContain('Waterberg');
  expect(screen.getByText(/Near a reviewed area: Modimolle/i)).toBeTruthy();
  act(()=>emit(pos(-24.70,28.41,20,32)));
  expect(speak).toHaveBeenCalledTimes(1);
  act(()=>emit(pos(-24.19,29.01,40,32)));
  expect(speak).toHaveBeenCalledTimes(1); // Global gap prevents back-to-back interruptions.
  expect(fetchMock).not.toHaveBeenCalled(); // No AI, maps, analytics or GPS upload.

  fireEvent.click(toggle);
  expect((toggle as HTMLInputElement).checked).toBe(false);
  fireEvent.click(screen.getByRole('button',{name:/Stop location assist/i}));
  expect(clear).toHaveBeenCalledWith(72);
  expect(screen.getByText(/Automatic narration is off|automatic audio off/i)).toBeTruthy();
});

it('hides history, culture and fauna reading from an unconfirmed driver and shows linked facts when parked',()=>{
  const watch=vi.fn();
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition:watch,clearWatch:vi.fn()}});
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:/Did you know what is around you/i})).toBeTruthy();
  const select=screen.getByRole('combobox',{name:/Luqi-Drive area preview/i}) as HTMLSelectElement;
  expect(select.disabled).toBe(true);
  expect(screen.queryByText('Geography',{exact:true})).toBeNull();
  fireEvent.click(screen.getByRole('checkbox',{name:/I am safely parked/i}));
  expect(select.disabled).toBe(false);
  expect(screen.getByText('Geography',{exact:true})).toBeTruthy();
  expect(screen.getByText('Fauna & flora',{exact:true})).toBeTruthy();
  expect(screen.getByRole('link',{name:/Original source: UNESCO Waterberg Biosphere/i}).getAttribute('href'))
    .toBe('https://www.unesco.org/en/mab/waterberg');
  fireEvent.change(select,{target:{value:'n1-mokopane'}});
  expect(screen.getByRole('heading',{name:/Mokopane and Makapan Valley/i})).toBeTruthy();
  expect(watch).not.toHaveBeenCalled();
});

it('does not enable rich driver reading from low GPS speed alone',()=>{
  let emit:PositionCallback=()=>{};
  Object.defineProperty(navigator,'geolocation',{configurable:true,value:{
    watchPosition:(cb:PositionCallback)=>{emit=cb;return 5;},clearWatch:vi.fn(),
  }});
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);
  fireEvent.click(screen.getByRole('button',{name:/Start location assist/i}));
  act(()=>emit(pos(-24.70,28.41,10,1)));
  expect((screen.getByRole('combobox',{name:/Luqi-Drive area preview/i}) as HTMLSelectElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox',{name:/I am safely parked/i}));
  expect((screen.getByRole('combobox',{name:/Luqi-Drive area preview/i}) as HTMLSelectElement).disabled).toBe(false);
  act(()=>emit(pos(-24.70,28.41,10,28)));
  expect((screen.getByRole('combobox',{name:/Luqi-Drive area preview/i}) as HTMLSelectElement).disabled).toBe(true);
  expect(screen.queryByText('Geography',{exact:true})).toBeNull();
});
