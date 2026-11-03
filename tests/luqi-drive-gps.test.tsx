// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import LuqiDrivePage from "../src/features/drive/LuqiDrivePage";
import {
  demoFrame,
  demoSeconds,
  distanceKm,
  legSeconds,
  stops,
} from "../src/features/drive/drive-navigation";

let update: PositionCallback;
let fail: PositionErrorCallback;
const clearWatch = vi.fn();
const watchPosition = vi.fn(
  (success: PositionCallback, failure: PositionErrorCallback) => {
    update = success;
    fail = failure;
    return 13;
  },
);
const oldLocation = Object.getOwnPropertyDescriptor(navigator, "geolocation");
function fix() {
  return {
    timestamp: Date.now(),
    coords: {
      latitude: stops[0].lat,
      longitude: stops[0].lon,
      accuracy: 8,
      speed: 10,
      heading: 0,
      altitude: null,
      altitudeAccuracy: null,
    },
  } as GeolocationPosition;
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal("isSecureContext", true);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { watchPosition, clearWatch },
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (oldLocation) Object.defineProperty(navigator, "geolocation", oldLocation);
  else Reflect.deleteProperty(navigator, "geolocation");
});

it("runs the four-stop GPS demo without requesting location and can pause, skip and recenter", () => {
  render(<LuqiDrivePage />);
  fireEvent.click(screen.getByRole("button", { name: "Start drive demo" }));
  expect(screen.getByText("DEMO IN MOTION")).toBeTruthy();
  act(() => vi.advanceTimersByTime(3000));
  fireEvent.click(screen.getByRole("button", { name: "Pause demo" }));
  expect(screen.getByText("DEMO PAUSED")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Skip to next demo stop" }),
  );
  expect(
    screen.getAllByRole("heading", { name: "Magaliesberg" }).length,
  ).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Recenter map" }));
  expect(watchPosition).not.toHaveBeenCalled();
  stops.forEach((stop, i) =>
    expect(distanceKm(demoFrame((i + 1) * legSeconds), stop)).toBeLessThan(
      0.001,
    ),
  );
  expect(demoFrame(demoSeconds).arrived).toBe(true);
});

it("shows a fresh device fix, expires it, and releases the watcher on navigation", () => {
  const view = render(<LuqiDrivePage />);
  fireEvent.click(screen.getByRole("button", { name: "Use phone GPS" }));
  expect(screen.getByText("ACQUIRING GPS")).toBeTruthy();
  act(() => update(fix()));
  expect(screen.getByText("DEVICE GPS")).toBeTruthy();
  expect(screen.getByText("36 km/h")).toBeTruthy();
  expect(screen.getByText(/Near Tswaing crater/)).toBeTruthy();
  act(() => vi.advanceTimersByTime(31000));
  expect(screen.queryByText("36 km/h")).toBeNull();
  expect(screen.getByText(/GPS signal is stale/)).toBeTruthy();
  view.unmount();
  expect(clearWatch).toHaveBeenCalledWith(13);
});

it("recovers from denied permission with demo available and ignores expired callbacks", () => {
  render(<LuqiDrivePage />);
  fireEvent.click(screen.getByRole("button", { name: "Use phone GPS" }));
  act(() => fail({ code: 1 } as GeolocationPositionError));
  expect(screen.getByText(/permission was declined/i)).toBeTruthy();
  act(() => update(fix()));
  expect(screen.queryByText("DEVICE GPS")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Start drive demo" }));
  expect(screen.getByText("DEMO IN MOTION")).toBeTruthy();
});
