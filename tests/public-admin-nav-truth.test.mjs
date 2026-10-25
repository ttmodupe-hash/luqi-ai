import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("public/admin portal separation", () => {
  it("does not advertise private administration in public workspace chrome", () => {
    const source = readFileSync("src/components/WorkspaceLayout.tsx", "utf8");
    const mirror = readFileSync("app/src/components/WorkspaceLayout.tsx", "utf8");
    assert.equal(source, mirror);
    assert.ok(!source.includes('<Link to="/admin">'));
    assert.ok(!source.includes('Administration</Link>'));
    for (const route of ["/privacy", "/terms", "/contact", "/service-status", "/pricing"]) {
      assert.ok(source.includes('to="' + route + '"'));
    }
  });
  it("keeps the guarded administrator route available for separately verified owners", () => {
    const routes = readFileSync("src/App.tsx", "utf8");
    const admin = readFileSync("src/components/AdminSovereignPortal.tsx", "utf8");
    assert.ok(routes.includes('path="/admin"'));
    assert.ok(admin.includes("Administrator sign-in unavailable"));
    assert.ok(admin.includes("reviewed server-side administrator session"));
  });
});
