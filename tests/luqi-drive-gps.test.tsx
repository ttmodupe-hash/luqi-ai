// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import TripFuel from "../src/features/drive/TripFuel";
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

it("leaves fuel input blank instead of inventing a national pump price", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  render(<TripFuel />);
  for (const label of ["Road distance (km)", "Fuel use (L/100 km)", "Pump price (R/L)"]) {
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe("");
  }
  expect(screen.getByRole("status", { name: "Trip fuel estimate" }).textContent).toContain(
    "Enter three positive amounts",
  );
  expect(screen.getByText(/No live pump price is loaded/)).toBeTruthy();
  const notice = screen.getByRole("link", { name: /official DMPR fuel-price notices/ });
  expect(notice.getAttribute("href")).toBe(
    "https://www.dmpr.gov.za/Branches/Petroleum-Resources/Fuel-Prices",
  );
  expect(notice.getAttribute("rel")).toContain("noopener");
  expect(notice.getAttribute("rel")).toContain("noreferrer");
  expect(fetcher).not.toHaveBeenCalled();
});

it("only estimates after explicit positive values and clears stale costs on edits", () => {
  render(<TripFuel />);
  const distance = screen.getByLabelText("Road distance (km)");
  const use = screen.getByLabelText("Fuel use (L/100 km)");
  const price = screen.getByLabelText("Pump price (R/L)");
  const estimate = screen.getByRole("status", { name: "Trip fuel estimate" });

  fireEvent.change(distance, { target: { value: "145" } });
  fireEvent.change(use, { target: { value: "7.4" } });
  expect(estimate.textContent).not.toContain("R214.60");
  fireEvent.change(price, { target: { value: "20" } });
  expect(estimate.textContent).toContain("10.7 L · R214.60");
  expect(estimate.textContent).toContain("estimated fuel cost");

  fireEvent.change(price, { target: { value: "" } });
  expect(estimate.textContent).toContain("Enter three positive amounts");
  fireEvent.change(price, { target: { value: "0" } });
  expect(estimate.textContent).toContain("Enter three positive amounts");
  fireEvent.change(price, { target: { value: "-20" } });
  expect(estimate.textContent).toContain("Enter three positive amounts");
  fireEvent.change(price, { target: { value: "21" } });
  expect(estimate.textContent).toContain("R225.33");
  fireEvent.change(distance, { target: { value: "" } });
  expect(estimate.textContent).toContain("Enter three positive amounts");
});

it("keeps both public Luqi-Drive fuel components identical without fixed pump prices", () => {
  const main = readFileSync("src/features/drive/TripFuel.tsx", "utf8");
  const app = readFileSync("app/src/features/drive/TripFuel.tsx", "utf8");
  expect(main).toBe(app);
  expect(main).not.toContain('"21.45"');
});
