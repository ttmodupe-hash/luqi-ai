import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { AnyRouter } from "@trpc/server";
import { createContext } from "./context";

export function createTrpcHttp(router: AnyRouter) {
  const app = new Hono();
  app.use("*", async (c, next) => {
    await next();
    c.header("Cache-Control", "no-store");
  });
  app.use("*", bodyLimit({ maxSize: 64 * 1024,
    onError: c => c.json({ code: "TRPC_BODY_TOO_LARGE" }, 413),
  }));
  app.all("*", c => fetchRequestHandler({
    endpoint: "/api/trpc", req: c.req.raw, router, createContext, maxBatchSize: 10,
  }));
  return app;
}
