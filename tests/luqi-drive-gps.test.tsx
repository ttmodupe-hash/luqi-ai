// @vitest-environment jsdom
import React from "react";
import { MemoryRouter } from "react-router";
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
  render(
    <MemoryRouter initialEntries={["/drive?trail=heritage"]}>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
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
  const view = render(
    <MemoryRouter initialEntries={["/drive?trail=heritage"]}>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
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
  render(
    <MemoryRouter initialEntries={["/drive?trail=heritage"]}>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
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
  for (const label of [
    "Road distance (km)",
    "Fuel use (L/100 km)",
    "Pump price (R/L)",
  ]) {
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe("");
  }
  expect(
    screen.getByRole("status", { name: "Trip fuel estimate" }).textContent,
  ).toContain("Enter three positive amounts");
  expect(screen.getByText(/No live pump price is loaded/)).toBeTruthy();
  const notice = screen.getByRole("link", {
    name: /official DMPR fuel-price notices/,
  });
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

it("filters the selected highway, links six facts per area and releases GPS when switching corridors", () => {
  render(
    <MemoryRouter initialEntries={["/drive?trail=n3"]}>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
  expect(
    screen
      .getByRole("button", { name: "N3 · Johannesburg to Durban" })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Use phone GPS" }));
  const report = fix();
  act(() =>
    update({
      ...report,
      coords: { ...report.coords, latitude: -29.49, longitude: 30.24 },
    }),
  );
  expect(screen.getByText(/Near Howick\. The local briefing/)).toBeTruthy();
  expect(screen.getByText(/NEARBY STORY · Howick/)).toBeTruthy();
  fireEvent.click(screen.getByText("Explore six roadside stories in English"));
  expect(screen.getByText("Fauna & flora")).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: /uMngeni Local Municipality/ })
      .getAttribute("href"),
  ).toBe("https://umngeni.gov.za/about-umngeni/");
  fireEvent.click(
    screen.getByRole("button", { name: "N1 · Pretoria to Polokwane" }),
  );
  expect(clearWatch).toHaveBeenCalledWith(13);
  act(() => update(report));
  expect(screen.queryByText("DEVICE GPS")).toBeNull();
  expect(screen.getByRole("button", { name: /01 Modimolle/ })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Start drive demo" }));
  fireEvent.click(
    screen.getByRole("button", { name: "Skip to next demo stop" }),
  );
  expect(screen.getByText("02 / 02")).toBeTruthy();
  expect(screen.getByText("STORY PREVIEW · Mokopane")).toBeTruthy();
});

it("offers all nine provinces, matches GPS within a province away from its featured stop and rejects an uncertain border fix", () => {
  render(
    <MemoryRouter initialEntries={["/drive"]}>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("heading", { name: "All nine provinces" }),
  ).toBeTruthy();
  const map = screen.getByRole("group", {
    name: "Interactive South Africa map, all nine provinces",
  });
  expect(map.querySelectorAll("[data-province]")).toHaveLength(9);
  fireEvent.click(
    screen.getByRole("button", { name: "Explore Northern Cape" }),
  );
  expect(
    screen.getByRole("heading", { name: "Augrabies Falls National Park" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Use phone GPS" }));
  const report = fix();
  act(() =>
    update({
      ...report,
      coords: { ...report.coords, latitude: -32.25, longitude: 24.53 },
    }),
  );
  expect(screen.getByText(/GPS places you in Eastern Cape/)).toBeTruthy();
  expect(
    screen.getByRole("heading", { name: "Addo Elephant National Park" }),
  ).toBeTruthy();
  act(() =>
    update({
      ...report,
      coords: { ...report.coords, latitude: -29.3, longitude: 27.5 },
    }),
  );
  expect(screen.getByText(/province could not be confirmed/)).toBeTruthy();
});

it("offers two bundled South African narrators without device voices and plays the selected province's own clip", async () => {
  const play = vi.fn().mockResolvedValue(undefined),
    pause = vi.fn();
  class AudioStub {
    src = "";
    play = play;
    pause = pause;
    static latest: AudioStub;
    constructor() {
      AudioStub.latest = this;
    }
  }
  vi.stubGlobal("Audio", AudioStub);
  render(
    <MemoryRouter>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Explore Western Cape" }));
  fireEvent.change(screen.getByLabelText("Narrator"), {
    target: { value: "joburg" },
  });
  await act(async () =>
    fireEvent.click(
      screen.getByRole("button", { name: "Listen to this guide" }),
    ),
  );
  expect(AudioStub.latest.src).toBe("/drive-voices/v1/joburg/za-wc.mp3");
  expect(play).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Stop audio" }));
  expect(pause).toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Briefing language"), {
    target: { value: "sepitori" },
  });
  expect(screen.getByText(/Sepitori is available in writing/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Listen to this guide" }),
  ).toBeNull();
});
import { africanVoices } from "../src/features/drive/DriveVoice";
import { trails } from "../src/features/drive/drive-navigation";
it("never substitutes foreign English defaults and links every guide to two non-empty audio files", () => {
  const voices = [
    "en-US",
    "en-GB",
    "en",
    "en_NG",
    "en-ZA",
    "tn-BW",
    "zu-ZA",
  ].map(
    (lang) => ({ lang, name: lang, voiceURI: lang }) as SpeechSynthesisVoice,
  );
  expect(africanVoices(voices, "english").map((v) => v.lang)).toEqual([
    "en-ZA",
    "en_NG",
  ]);
  expect(africanVoices(voices, "isizulu").map((v) => v.lang)).toEqual([
    "zu-ZA",
  ]);
  for (const trail of trails)
    for (const stop of trail.stops)
      for (const id of ["cape", "joburg"]) {
        const bytes = readFileSync(
          "public/drive-voices/v1/" + id + "/" + stop.id + ".mp3",
        );
        expect(bytes.length).toBeGreaterThan(5000);
      }
});

function enableMatchedNarration() {
  render(
    <MemoryRouter initialEntries={["/drive?trail=heritage"]}>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Use phone GPS" }));
  fireEvent.click(screen.getByLabelText(/Read the matched guide aloud/));
}

async function receiveFixAfter(ms = 0) {
  act(() => vi.advanceTimersByTime(ms));
  await act(async () => update(fix()));
}

it("retries a blocked or stopped guide and starts the daily cooldown on completion", async () => {
  const play = vi
    .fn()
    .mockRejectedValueOnce(new Error("autoplay blocked"))
    .mockResolvedValue(undefined);
  class Clip {
    static latest: Clip;
    onended: (() => void) | null = null;
    play = play;
    pause = vi.fn();
    constructor() {
      Clip.latest = this;
    }
  }
  vi.stubGlobal("Audio", Clip);
  enableMatchedNarration();
  await receiveFixAfter();
  expect(screen.getByText(/Tap Listen to start audio/)).toBeTruthy();
  act(() => Clip.latest.onended?.());
  await receiveFixAfter(179999);
  expect(play).toHaveBeenCalledTimes(1);
  await receiveFixAfter(1);
  expect(play).toHaveBeenCalledTimes(2);

  const interruptedEnd = Clip.latest.onended;
  fireEvent.click(screen.getByRole("button", { name: "Stop audio" }));
  act(() => interruptedEnd?.());
  await receiveFixAfter(180000);
  expect(play).toHaveBeenCalledTimes(3);
  act(() => vi.advanceTimersByTime(5000));
  act(() => Clip.latest.onended?.());
  await receiveFixAfter(86400000 - 1);
  expect(play).toHaveBeenCalledTimes(3);
  await receiveFixAfter(1);
  expect(play).toHaveBeenCalledTimes(4);
});

it("counts a completed manual retry in the chosen device language and ignores an interrupted utterance", async () => {
  class Utterance {
    onend: (() => void) | null = null;
    onerror: (() => void) | null = null;
  }
  const speak = vi.fn<(u: Utterance) => void>();
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("speechSynthesis", {
    getVoices: () => [
      { name: "Device isiZulu", lang: "zu-ZA", voiceURI: "za-zu" },
    ],
    speak,
    cancel: vi.fn(),
  });
  enableMatchedNarration();
  fireEvent.change(screen.getByLabelText("Briefing language"), {
    target: { value: "isizulu" },
  });
  await receiveFixAfter();
  expect(speak).toHaveBeenCalledTimes(1);
  const interrupted = speak.mock.calls[0][0];
  act(() => interrupted.onerror?.());
  act(() => interrupted.onend?.());
  await receiveFixAfter(180000);
  expect(speak).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "Listen to this guide" }));
  expect(speak).toHaveBeenCalledTimes(3);
  act(() => speak.mock.calls[2][0].onend?.());
  await receiveFixAfter(180000);
  expect(speak).toHaveBeenCalledTimes(3);
});

import { emptyFuelDraft, estimateFuel } from "../src/features/drive/trip-fuel";
it("calculates return journeys and equal shares without retaining a stale total for invalid inputs", () => {
  const draft = {
    ...emptyFuelDraft(),
    distance: "600",
    consumption: "12",
    price: "30",
    returning: true,
    travellers: "4",
  };
  expect(estimateFuel(draft)).toEqual({
    distance: 1200,
    litres: 144,
    cost: 4320,
    perKm: 3.6,
    perPerson: 1080,
  });
  for (const bad of ["", " ", "0", "-1", "Infinity", "NaN", "1e309"]) {
    expect(estimateFuel({ ...draft, price: bad })).toBeNull();
  }
  expect(
    estimateFuel({ ...draft, distance: "1e308", consumption: "1e308" }),
  ).toBeNull();
  expect(estimateFuel({ ...draft, travellers: "0" })?.perPerson).toBeNull();
});
it("checks a likely consumption decimal error only after the traveller chooses to correct it", () => {
  render(<TripFuel />);
  fireEvent.change(screen.getByLabelText("Road distance (km)"), {
    target: { value: "600" },
  });
  fireEvent.change(screen.getByLabelText("Fuel use (L/100 km)"), {
    target: { value: "120" },
  });
  fireEvent.change(screen.getByLabelText("Pump price (R/L)"), {
    target: { value: "30" },
  });
  expect(
    screen.getByRole("status", { name: "Trip fuel estimate" }).textContent,
  ).toContain("720.0 L · R21600.00");
  expect(screen.getByText("Check your fuel use")).toBeTruthy();
  expect(
    screen.getByLabelText("Fuel use (L/100 km)").getAttribute("value"),
  ).toBe("120");
  fireEvent.click(screen.getByRole("button", { name: "Use 12.0 L/100 km" }));
  expect(
    screen.getByRole("status", { name: "Trip fuel estimate" }).textContent,
  ).toContain("72.0 L · R2160.00");
  fireEvent.click(screen.getByRole("button", { name: /Return trip/ }));
  fireEvent.change(screen.getByLabelText("Travellers"), {
    target: { value: "4" },
  });
  expect(
    screen.getByRole("status", { name: "Trip fuel estimate" }).textContent,
  ).toContain("144.0 L · R4320.00");
  expect(screen.queryByText("Check your fuel use")).toBeNull();
});
it("keeps the trip budget when changing corridors without starting GPS", () => {
  render(
    <MemoryRouter>
      <LuqiDrivePage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Road distance (km)"), {
    target: { value: "145" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "N3 · Johannesburg to Durban" }),
  );
  expect(
    (screen.getByLabelText("Road distance (km)") as HTMLInputElement).value,
  ).toBe("145");
  expect(navigator.geolocation.watchPosition).not.toHaveBeenCalled();
});
