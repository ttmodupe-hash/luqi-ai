import { describe, expect, it, vi } from "vitest";
import type { Pool } from "mysql2/promise";
import { resetAccountPassword } from "../api/services/accountRecovery";
import { validNewPassword } from "../api/lib/passwordPolicy";

describe("operator account recovery boundary", () => {
  it("enforces the UTF-8 bcrypt boundary", () => {
    expect(validNewPassword("界".repeat(24))).toBe(true);
    for (const password of [null, {}, "short", "a".repeat(73), "界".repeat(25)]) {
      expect(validNewPassword(password)).toBe(false);
    }
  });
  it("rejects invalid identity/password before database access", async () => {
    const getConnection = vi.fn();
    const pool = { getConnection } as unknown as Pool;
    for (const [id, email, password] of [
      [0, "fixture@example.invalid", "Valid-New-Password!"],
      [1.5, "fixture@example.invalid", "Valid-New-Password!"],
      [1, "invalid", "Valid-New-Password!"],
      [1, "fixture@example.invalid", "a".repeat(73)],
    ] as const) {
      await expect(resetAccountPassword(pool, id, email, password))
        .rejects.toMatchObject({ code: "INVALID_INPUT" });
    }
    expect(getConnection).not.toHaveBeenCalled();
  });
  it("does not expose connection errors or attempt an in-memory reset", async () => {
    const pool = { getConnection: vi.fn().mockRejectedValue(new Error("private-database-password")) } as unknown as Pool;
    await expect(resetAccountPassword(pool, 1, "fixture@example.invalid", "Valid-New-Password!"))
      .rejects.toMatchObject({ message: "RECOVERY_UNAVAILABLE" });
  });
  it("refuses nontransactional tables before mutation", async () => {
    const conn = { query: vi.fn().mockResolvedValue([[{ ENGINE: "MyISAM" }, { ENGINE: "InnoDB" }]]),
      beginTransaction: vi.fn(), release: vi.fn() };
    const pool = { getConnection: vi.fn().mockResolvedValue(conn) } as unknown as Pool;
    await expect(resetAccountPassword(pool, 1, "fixture@example.invalid", "Valid-New-Password!"))
      .rejects.toMatchObject({ code: "RECOVERY_UNAVAILABLE" });
    expect(conn.beginTransaction).not.toHaveBeenCalled();
    expect(conn.release).toHaveBeenCalledOnce();
  });
});
