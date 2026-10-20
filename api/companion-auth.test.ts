import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "./router";

const previousNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousNodeEnv;
});

describe("companion authentication boundary", () => {
  it("rejects conversation reads without a verified user even in development", async () => {
    process.env.NODE_ENV = "development";
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/api/trpc"),
      user: null,
    });

    await expect(caller.companion.getConversations()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("rejects memory writes without a verified user", async () => {
    process.env.NODE_ENV = "development";
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/api/trpc"),
      user: null,
    });

    await expect(caller.companion.addMemory({
      content: "should not persist",
      category: "test",
    })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("keeps personality metadata public", async () => {
    const caller = appRouter.createCaller({
      req: new Request("http://localhost/api/trpc"),
      user: null,
    });

    const personalities = await caller.companion.listPersonalities();
    expect(personalities.length).toBeGreaterThan(0);
  });
});
