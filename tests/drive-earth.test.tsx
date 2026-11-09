// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import DriveEarthPanel from "../src/features/drive/DriveEarthPanel";
import { createMotionSmoother, EONET_URL, gibsImageUrl, loadEarthEvents, parseEarthEvents, validImageryDay, yesterdayUtc } from "../src/features/drive/drive-earth";
const now = Date.parse("2026-11-09T12:00:00Z");
const place = { id: "tswaing", name: "Tswaing crater", lat: -25.41, lon: 28.08 };
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("on-device display smoothing, not positioning corrections", () => {
  it("smooths speed without exposing or altering position accuracy", () => {
    const filter = createMotionSmoother();
    expect(filter.next({ speed: 36, heading: 90, timestamp: now - 1000 }, now)?.speed).toBe(36);
    const estimate = filter.next({ speed: 72, heading: 90, timestamp: now }, now)!;
    expect(estimate.speed).toBeGreaterThan(36); expect(estimate.speed).toBeLessThan(72);
    expect(estimate).not.toHaveProperty("accuracy"); expect(estimate).not.toHaveProperty("lat");
  });
  it("handles the north crossing, not an erroneous south-facing average", () => {
    const filter = createMotionSmoother();
    filter.next({ speed: 36, heading: 359, timestamp: now - 1000 }, now);
    const heading = filter.next({ speed: 36, heading: 1, timestamp: now }, now)!.heading!;
    expect(heading < 5 || heading > 355).toBe(true);
  });
  it("clears motion on stop, missing speed, stale fixes and invalid timestamps", () => {
    const filter = createMotionSmoother();
    filter.next({ speed: 60, heading: 60, timestamp: now - 1000 }, now);
    expect(filter.next({ speed: 0, heading: 60, timestamp: now }, now)).toEqual({ speed: 0, heading: null, timestamp: now });
    expect(filter.next(null, now)).toBeNull();
    expect(filter.next({ speed: null, heading: 60, timestamp: now }, now)).toBeNull();
    expect(filter.next({ speed: 20, heading: 60, timestamp: now - 30000 }, now)).toBeNull();
    expect(filter.next({ speed: 20, heading: 60, timestamp: now + 6000 }, now)).toBeNull();
    expect(filter.next({ speed: NaN, heading: 60, timestamp: now }, now)).toBeNull();
  });
  it("ignores duplicate/out-of-order fixes and resets after a gap", () => {
    const filter = createMotionSmoother();
    const first = filter.next({ speed: 20, heading: 70, timestamp: now }, now);
    expect(filter.next({ speed: 100, heading: 200, timestamp: now - 100 }, now)).toEqual(first);
    expect(filter.next({ speed: 100, heading: 200, timestamp: now }, now)).toEqual(first);
    expect(filter.next({ speed: 100, heading: 200, timestamp: now + 11000 }, now + 11000)?.speed).toBe(100);
    filter.reset(); expect(filter.next({ speed: 10, heading: null, timestamp: now }, now)?.heading).toBeNull();
  });
});

describe("bounded official public-data requests", () => {
  it("constructs an allowlisted bounded WMS image for a public place", () => {
    const url = new URL(gibsImageUrl(place, "2026-11-08", now));
    expect(url.origin).toBe("https://gibs.earthdata.nasa.gov");
    expect(url.searchParams.get("LAYERS")).toBe("MODIS_Terra_CorrectedReflectance_TrueColor");
    expect(url.searchParams.get("BBOX")).toBe("27.0800,-26.4100,29.0800,-24.4100");
    expect(url.searchParams.get("WIDTH")).toBe("640"); expect(url.searchParams.get("TIME")).toBe("2026-11-08");
    expect(yesterdayUtc(now)).toBe("2026-11-08");
    expect(validImageryDay("2026-02-30", now)).toBe(false);
    expect(validImageryDay("2026-11-10", now)).toBe(false);
    expect(() => gibsImageUrl({ lat: NaN, lon: 28 }, "2026-11-08", now)).toThrow();
  });
  it("distinguishes invalid feeds from empty feeds and bounds/rejects stale metadata", () => {
    expect(() => parseEarthEvents({ error: "upstream" }, now)).toThrow();
    expect(parseEarthEvents({ events: [] }, now)).toEqual([]);
    const item = { id: "EONET_1", title: "Observed event", categories: [{ id: "wildfires" }], geometry: [{ date: "2026-11-08T12:00:00Z" }], closed: null };
    expect(parseEarthEvents({ events: [item] }, now)[0].closed).toBe(false);
    expect(parseEarthEvents({ events: [{ ...item, closed: undefined }] }, now)[0].closed).toBeNull();
    expect(parseEarthEvents({ events: [{ ...item, geometry: [{ date: "2020-01-01" }] }] }, now)).toEqual([]);
    expect(parseEarthEvents({ events: [{ ...item, id: "../redirect" }] }, now)).toEqual([]);
    expect(parseEarthEvents({ events: Array.from({ length: 30 }, (_, n) => ({ ...item, id: `EONET_${n}` })) }, now)).toHaveLength(10);
  });
  it("does not send credentials, referrers or GPS parameters", async () => {
    const request = vi.fn(async () => new Response('{"events":[]}', { headers: { "Content-Type": "application/json" } }));
    const abort = new AbortController();
    expect(await loadEarthEvents(abort.signal, request as typeof fetch)).toEqual([]);
    expect(request).toHaveBeenCalledWith(EONET_URL, expect.objectContaining({ credentials: "omit", referrerPolicy: "no-referrer", redirect: "error", signal: abort.signal }));
  });
  it("rejects failures, wrong content types, and oversized bodies", async () => {
    const signal = new AbortController().signal;
    await expect(loadEarthEvents(signal, (async () => new Response("down", { status: 503 })) as typeof fetch)).rejects.toThrow();
    await expect(loadEarthEvents(signal, (async () => new Response("<html>wrong</html>", { headers: { "Content-Type": "text/html" } })) as typeof fetch)).rejects.toThrow();
    await expect(loadEarthEvents(signal, (async () => new Response(" ".repeat(512001), { headers: { "Content-Type": "application/json" } })) as typeof fetch)).rejects.toThrow();
  });
});

describe("optional in-Luqi satellite context", () => {
  it("does not fetch on mount or GPS updates; loads only after an explicit click", async () => {
    const request = vi.fn(async () => new Response('{"events":[]}', { headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", request);
    const { rerender } = render(<DriveEarthPanel target={place} fix={null} />);
    expect(request).not.toHaveBeenCalled(); expect(screen.queryByRole("img")).toBeNull();
    rerender(<DriveEarthPanel target={place} fix={{ lat: -31.123456, lon: 19.654321, accuracy: 24, speed: 60, heading: 20, timestamp: Date.now() }} />);
    expect(request).not.toHaveBeenCalled(); expect(screen.getByText("±24 m")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load NASA satellite context" }));
    await waitFor(() => expect(screen.getByText(/No recent matching records/)).toBeTruthy());
    const image = screen.getByRole("img");
    expect(image.getAttribute("src")).not.toContain("31.123456");
    expect(image.getAttribute("src")).not.toContain("19.654321");
    expect(request).toHaveBeenCalledTimes(1);
    fireEvent.load(image);
    fireEvent.click(screen.getByRole("button", { name: "Clear satellite context" }));
    expect(screen.queryByRole("img")).toBeNull();
  });
  it("makes upstream failures unknown rather than safe and discards old place imagery", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { rerender } = render(<DriveEarthPanel target={place} fix={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Load NASA satellite context" }));
    await waitFor(() => expect(screen.getByText(/Event feed unavailable. Conditions are unknown/)).toBeTruthy());
    fireEvent.error(screen.getByRole("img"));
    expect(screen.getByText(/Imagery unavailable/)).toBeTruthy();
    rerender(<DriveEarthPanel target={{ ...place, id: "other", name: "Other public place" }} fix={null} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText(/Not loaded. Your trip/)).toBeTruthy();
  });
});
