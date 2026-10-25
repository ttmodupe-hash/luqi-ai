import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("retired public login/admin assets", () => {
  const login = readFileSync("public/login.html", "utf8");
  const admin = readFileSync("public/admin.html", "utf8");
  const script = readFileSync("public/login.js", "utf8");

  it("routes old login bookmarks to the reviewed account pages", () => {
    assert.match(login, /href="\/#\/companion"/);
    assert.match(login, /href="\/#\/join"/);
    assert.match(login, /No password or account information is collected here/);
  });
  it("does not render a second password form or unauthorized admin controls", () => {
    for (const html of [login, admin]) {
      assert.doesNotMatch(html, /<form\b|<input\b|<script\b/i);
      assert.doesNotMatch(html, /fetch\s*\(|localStorage|sessionStorage|(?:Register|Compile) Admin/i);
    }
    assert.match(admin, /Legacy administration is unavailable/);
  });
  it("never reintroduces the unused demo login and local-storage signup forms", () => {
    const oldLogin = readFileSync("app/src/pages/LoginPage.tsx", "utf8");
    const oldSignup = readFileSync("app/src/pages/SignupPage.tsx", "utf8");
    assert.match(oldLogin, /<Navigate to="\\/companion" replace \\/>/);
    assert.match(oldSignup, /<Navigate to="\\/join" replace \\/>/);
    for (const source of [oldLogin, oldSignup]) {
      assert.doesNotMatch(source, /demo@|demo123|localStorage|sessionStorage|setItem|fetch\\s*\\(|useApi/);
    }
  });
  it("cannot put a fallback admin token in client storage or call the network", () => {
    assert.doesNotMatch(script, /fetch\s*\(|localStorage|sessionStorage|ADMIN-2026|setItem|requestSubmit/);
    assert.match(script, /preventDefault\(\)/);
    assert.match(script, /location\.replace\("\/#\/companion"\)/);
  });
});
