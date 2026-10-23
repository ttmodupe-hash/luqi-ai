import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe.each(["public/service-worker.js", "app/public/sw.js"])(
  "%s status freshness",
  (workerPath) => {
    it.each([
      "/v1/readiness",
      "/v1/release",
      "/api/v1/companion/conversations/export",
      "/v1/health",
      "/health",
      "/api/v1/companion/conversations",
      "/api/v1/omega/tasks",
      "/api/v1/omega/tasks/status",
    ])("does not intercept or cache %s", (path) => {
      const listeners: Record<string, (event: unknown) => void> = {};
      const fetch = vi.fn(),
        caches = { match: vi.fn(), open: vi.fn() };
      runInNewContext(readFileSync(workerPath, "utf8"), {
        self: {
          location: { origin: "https://luqi.example" },
          addEventListener: (
            name: string,
            callback: (event: unknown) => void,
          ) => {
            listeners[name] = callback;
          },
        },
        URL,
        fetch,
        caches,
      });
      const respondWith = vi.fn();
      listeners.fetch({
        request: { url: `https://luqi.example${path}`, method: "GET" },
        respondWith,
      });
      expect(respondWith).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
      expect(caches.match).not.toHaveBeenCalled();
      expect(caches.open).not.toHaveBeenCalled();
    });
  },
);
