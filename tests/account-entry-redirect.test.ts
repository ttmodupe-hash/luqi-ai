import { describe, expect, it } from "vitest";
import app from "../api/boot";

describe("direct account entry URLs", () => {
  it.each(["/signup", "/register", "/sign-up", "/join"])(
    "redirects %s to the reviewed account creation form without forwarding private query fields",
    async path => {
      const result = await app.request(path + "?email=private%40example.invalid&token=do-not-forward");
      expect(result.status).toBe(302);
      expect(result.headers.get("location")).toBe("/#/join");
      expect(result.headers.get("cache-control")).toBe("no-store");
      expect(result.headers.get("location")).not.toContain("email=");
      expect(result.headers.get("location")).not.toContain("token=");
    },
  );
  it.each(["/login", "/signin", "/sign-in"])(
    "redirects %s to the canonical sign-in without credential propagation",
    async path => {
      const result = await app.request(path + "?password=private&next=https://external.invalid");
      expect(result.status).toBe(302);
      expect(result.headers.get("location")).toBe("/#/login");
      expect(result.headers.get("cache-control")).toBe("no-store");
    },
  );
  it("never handles POST registration credentials through a bookmarked GET-only alias", async () => {
    const result = await app.request("/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "fixture@example.invalid", password: "not-sent" }),
    });
    expect(result.status).not.toBe(302);
  });
});
