import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const paths = [
  ["public/diagnostics.html", "Legacy diagnostics unavailable", "/#/service-status"],
  ["public/security.html", "Legacy security console unavailable", "/#/service-status"],
  ["public/workspace.html", "LUQI workspace has moved", "/#/"],
];

describe("retired public security and workspace entrypoints", () => {
  for (const [path, heading, destination] of paths) {
    it(path + " contains only honest navigation, no action surface", () => {
      const html = readFileSync(path, "utf8");
      assert.ok(html.includes("<h1>" + heading + "</h1>"));
      assert.ok(html.includes('href="' + destination + '"'));
      assert.ok(html.includes("No login, payment, administrator privilege"));
      assert.match(html, /form-action 'none'/);
      assert.match(html, /default-src 'none'/);
      assert.doesNotMatch(html, /<(?:form|input|textarea|button|script|iframe)\b/i);
      for (const forbidden of ["localStorage", "sessionStorage", "fetch(", "XMLHttpRequest", "WebSocket", "luqi_admin_token", "luqi_user_email", "success: true"]) {
        assert.ok(!html.includes(forbidden), "Old side-effect behavior must remain retired");
      }
    });
  }
});
