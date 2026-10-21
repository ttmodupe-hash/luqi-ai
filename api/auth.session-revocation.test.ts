import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const state = vi.hoisted(() => ({
  getAuthDb: vi.fn(),
}));
vi.mock("./queries/connection", () => ({
  getAuthDb: state.getAuthDb,
}));
import { revokeSession } from "./auth";

describe("session revocation never reports false success", () => {
  beforeEach(() => state.getAuthDb.mockReset());

  it("does not require the database when no session was presented", async () => {
    await expect(revokeSession(new Request("http://localhost/api/auth/logout")))
      .resolves.toBeUndefined();
    expect(state.getAuthDb).not.toHaveBeenCalled();
  });

  it("refuses to claim revocation when persistent storage is unavailable", async () => {
    state.getAuthDb.mockResolvedValue(null);
    await expect(revokeSession(new Request("http://localhost/api/auth/logout", {
      headers: { cookie: "luqi_session=presented-session" },
    }))).rejects.toThrow(/Persistent session storage is unavailable/);
  });

  it("revokes only the digest of the presented token", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockReturnValue({ where });
    state.getAuthDb.mockResolvedValue({ delete: del });
    await revokeSession(new Request("http://localhost/api/auth/logout", {
      headers: { authorization: "Bearer known-session-token" },
    }));
    expect(del).toHaveBeenCalledOnce();
    expect(where).toHaveBeenCalledOnce();
    const query = where.mock.calls[0][0];
    // Drizzle query objects reference table metadata cyclically; inspect only
    // bound parameter values rather than serializing the full SQL AST.
    const values = query.queryChunks
      .filter((chunk: unknown) => !!chunk && typeof chunk === "object" && "value" in chunk)
      .map((chunk: { value: unknown }) => chunk.value);
    expect(values).toContain(
      createHash("sha256").update("known-session-token").digest("hex"),
    );
    expect(values).not.toContain("known-session-token");
  });

  it("propagates failed database deletes rather than claiming logout worked", async () => {
    const where = vi.fn().mockRejectedValue(new Error("database write failed"));
    state.getAuthDb.mockResolvedValue({ delete: () => ({ where }) });
    await expect(revokeSession(new Request("http://localhost/api/auth/logout", {
      headers: { cookie: "luqi_session=presented-session" },
    }))).rejects.toThrow("database write failed");
  });
});
