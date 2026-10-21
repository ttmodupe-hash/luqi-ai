import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  reserveRateLimit: vi.fn(),
  getAuthDb: vi.fn(),
}));
vi.mock("./security/rateLimit", () => ({ reserveRateLimit: mocks.reserveRateLimit }));
vi.mock("./queries/connection", () => ({ getAuthDb: mocks.getAuthDb }));
import { loginAccount, registerAccount } from "./auth";

const emailDigest = (email: string) =>
  createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

describe("HTTP account authentication throttle", () => {
  beforeEach(() => {
    mocks.reserveRateLimit.mockReset().mockResolvedValue(undefined);
    mocks.getAuthDb.mockReset();
  });

  it("reserves global and normalized per-email quota before password lookup", async () => {
    mocks.getAuthDb.mockResolvedValue({
      select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }),
    });
    await expect(loginAccount(" Person@Example.COM ", "incorrect")).rejects.toThrow("Invalid email or password.");
    expect(mocks.reserveRateLimit).toHaveBeenNthCalledWith(1, "auth:login:global", 100);
    expect(mocks.reserveRateLimit).toHaveBeenNthCalledWith(2,
      `auth:login:${emailDigest("person@example.com")}`, 10);
    expect(mocks.getAuthDb).toHaveBeenCalledOnce();
  });

  it("rejects exhausted login quota before touching account database", async () => {
    mocks.reserveRateLimit.mockRejectedValueOnce(
      Object.assign(new Error("Too many requests"), { code: "TOO_MANY_REQUESTS" }),
    );
    await expect(loginAccount("person@example.com", "incorrect")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mocks.getAuthDb).not.toHaveBeenCalled();
  });

  it("counts weak-password registration attempts and persists no account", async () => {
    await expect(registerAccount(" New@Example.COM ", "short")).rejects.toThrow(/12 characters/);
    expect(mocks.reserveRateLimit).toHaveBeenNthCalledWith(1, "auth:register:global", 100);
    expect(mocks.reserveRateLimit).toHaveBeenNthCalledWith(2,
      `auth:register:${emailDigest("new@example.com")}`, 5);
    expect(mocks.getAuthDb).not.toHaveBeenCalled();
  });

  it("rejects exhausted registration quota before password validation", async () => {
    mocks.reserveRateLimit.mockRejectedValueOnce(
      Object.assign(new Error("Rate limited"), { code: "TOO_MANY_REQUESTS" }),
    );
    await expect(registerAccount("new@example.com", "short")).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
    });
    expect(mocks.getAuthDb).not.toHaveBeenCalled();
  });
});
