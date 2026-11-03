// @vitest-environment jsdom
import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import LuqiDrivePage from "../src/pages/LuqiDrivePage";

afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});

it("renders source-linked road packs without network calls or automatic location access",()=>{
  const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
  const watch=vi.fn();
  Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:watch,clearWatch:vi.fn()}});
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);
  expect(screen.getByRole("heading",{name:/Source-linked road stories/i})).toBeTruthy();
  expect(screen.getByRole("button",{name:/Start location assist/i})).toBeTruthy();
  expect(screen.getByRole("link",{name:/Find local businesses/i}).getAttribute("href")).toContain("province=LP");
  expect(screen.getByRole("link",{name:/South African Tourism · Limpopo mountains/i}).getAttribute("target")).toBe("_blank");
  expect(watch).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("requests location only after an explicit action and keeps exact coordinates off screen",()=>{
  const fetchMock=vi.fn();vi.stubGlobal("fetch",fetchMock);
  const watch=vi.fn((success:PositionCallback)=>{
    success({coords:{latitude:-25.7479,longitude:28.2293,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed:30},timestamp:Date.now()} as GeolocationPosition);
    return 42;
  });
  Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:watch,clearWatch:vi.fn()}});
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:/Start location assist/i}));
  expect(watch).toHaveBeenCalledTimes(1);
  expect(screen.getByText("108 km/h")).toBeTruthy();
  expect(screen.getByText(/Exact coordinates are kept in memory only/i)).toBeTruthy();
  expect(screen.queryByText("-25.7479")).toBeNull();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("blocks driver deep dives when reported speed rises, even after parked confirmation",()=>{
  let emitPosition:PositionCallback=()=>{};
  const watch=vi.fn((success:PositionCallback)=>{emitPosition=success;return 21;});
  Object.defineProperty(navigator,"geolocation",{configurable:true,value:{watchPosition:watch,clearWatch:vi.fn()}});
  const position=(speed:number)=>({
    coords:{latitude:-25.7479,longitude:28.2293,accuracy:10,altitude:null,altitudeAccuracy:null,heading:null,speed},
    timestamp:Date.now()
  } as GeolocationPosition);
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:/Start location assist/i}));
  act(()=>emitPosition(position(0))); // Explicit stationary state for manual parked confirmation.
  const parked=()=>screen.getByRole("checkbox",{name:/I am safely parked/i}) as HTMLInputElement;
  fireEvent.click(parked());
  fireEvent.click(screen.getByRole("button",{name:/Open 3-minute-style deep dive/i}));
  expect(screen.getByRole("button",{name:/Close deep dive/i})).toBeTruthy();
  act(()=>emitPosition(position(2))); // Even 7 km/h must clear parked status.
  expect(parked().checked).toBe(false);
  expect((screen.getByRole("button",{name:/Open 3-minute-style deep dive/i}) as HTMLButtonElement).disabled).toBe(true);
  act(()=>emitPosition(position(30)));
  expect(screen.getByText("108 km/h")).toBeTruthy();
  expect(parked().checked).toBe(false);
  const deep=()=>screen.getByRole("button",{name:/Open 3-minute-style deep dive/i}) as HTMLButtonElement;
  expect(deep().disabled).toBe(true);
  fireEvent.click(parked());
  expect(parked().checked).toBe(false);
  expect(deep().disabled).toBe(true);
  fireEvent.click(screen.getByRole("checkbox",{name:/Passenger & family quiz mode/i}));
  expect(deep().disabled).toBe(false);
});

it("cancels obsolete passenger quizzes on route switch or passenger-mode exit",()=>{
  vi.useFakeTimers();
  const speak=vi.fn();
  vi.stubGlobal("speechSynthesis",{cancel:vi.fn(),speak});
  vi.stubGlobal("SpeechSynthesisUtterance",class{
    rate=1;pitch=1;
    constructor(public text:string){}
  });
  render(<MemoryRouter><LuqiDrivePage/></MemoryRouter>);
  const passenger=()=>screen.getByRole("checkbox",{name:/Passenger & family quiz mode/i});
  const play=()=>screen.getByRole("button",{name:/Play briefing/i});
  fireEvent.click(passenger());
  fireEvent.click(play());
  expect(speak).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole("combobox",{name:/Luqi-Drive route/i}),{target:{value:"n3-joburg-durban"}});
  act(()=>vi.advanceTimersByTime(120001));
  expect(screen.getByText(/Play a briefing to start the two-minute quiz timer/i)).toBeTruthy();
  fireEvent.click(play());
  expect(speak).toHaveBeenCalledTimes(2);
  fireEvent.click(passenger());
  fireEvent.click(passenger());
  act(()=>vi.advanceTimersByTime(120001));
  expect(screen.getByText(/Play a briefing to start the two-minute quiz timer/i)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:/Replay/i}));
  act(()=>vi.advanceTimersByTime(120001));
  expect(screen.getByRole("heading",{name:/Which national road is the main Johannesburg-to-Durban corridor/i})).toBeTruthy();
});
