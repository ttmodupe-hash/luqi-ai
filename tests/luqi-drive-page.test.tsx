// @vitest-environment jsdom
import React from "react";
import {afterEach,expect,it,vi} from "vitest";
import {cleanup,fireEvent,render,screen} from "@testing-library/react";
import {MemoryRouter} from "react-router";
import LuqiDrivePage from "../src/pages/LuqiDrivePage";

afterEach(()=>{cleanup();vi.unstubAllGlobals();});

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
