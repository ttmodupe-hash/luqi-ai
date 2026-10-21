import { describe, expect, it } from "vitest";
import { isAllowedApiMutation, trustedOrigins } from "./requestOrigin";

const approved = trustedOrigins("https://luqi-ai.com", "https://luqi.ai.studio");

function makeRequest(method: string, headers: Record<string, string> = {}) {
  return new Request("https://luqi-ai.com/api/trpc/guardian.link", { method, headers });
}

describe("state-changing API request origin verification", () => {
  it("allows legitimate same-origin cookie-authenticated requests", () => {
    expect(isAllowedApiMutation(makeRequest("POST", {
      origin: "https://luqi-ai.com", cookie: "luqi_session=test",
    }), approved)).toBe(true);
  });

  it("rejects foreign origins, even when the browser has a valid session", () => {
    expect(isAllowedApiMutation(makeRequest("POST", {
      origin: "https://attacker.example", cookie: "luqi_session=test",
    }), approved)).toBe(false);
  });

  it("rejects cookie-authenticated mutations without origin evidence", () => {
    expect(isAllowedApiMutation(makeRequest("POST", {
      cookie: "luqi_session=test",
    }), approved)).toBe(false);
  });

  it("allows explicit bearer token server clients without an origin", () => {
    expect(isAllowedApiMutation(makeRequest("POST", {
      authorization: "Bearer caller-managed-token",
    }), approved)).toBe(true);
  });

  it("rejects cross-site unsafe requests without a trusted origin", () => {
    expect(isAllowedApiMutation(makeRequest("POST", {
      "sec-fetch-site": "cross-site",
    }), approved)).toBe(false);
  });

  it("does not mistake arbitrary paths, HTTP origins or invalid URLs for approved hosts", () => {
    expect(approved.has("https://attacker.example")).toBe(false);
    expect(trustedOrigins("http://unsecured.example", "not a url").size).toBe(0);
    expect(isAllowedApiMutation(makeRequest("POST", {
      origin: "https://luqi-ai.com.attacker.example",
    }), approved)).toBe(false);
  });

  it("does not change safe GET request behaviour", () => {
    expect(isAllowedApiMutation(makeRequest("GET"), approved)).toBe(true);
  });
});
