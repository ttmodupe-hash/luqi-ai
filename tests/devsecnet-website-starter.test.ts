import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  makeWebsiteStarter,
  type WebsiteStarterInput,
} from "../src/features/devsecnet/website-starter";

const sample: WebsiteStarterInput = {
  name: "Soweto Mobile Repairs",
  service: "Phone screen replacements and accessory advice",
  area: "Soweto and surrounding townships",
  phone: "+27 71 234 5678",
};

describe("Luqi customer-value website starter", () => {
  it("produces a real responsive offline HTML page and public telephone link", () => {
    const result = makeWebsiteStarter(sample);
    expect(result.filename).toBe("luqi-simple-service-website.html");
    expect(result.html).toContain("<!doctype html>");
    expect(result.html).toContain('name="viewport"');
    expect(result.html).toContain("Soweto Mobile Repairs");
    expect(result.html).toContain("Phone screen replacements and accessory advice");
    expect(result.html).toContain("Soweto and surrounding townships");
    expect(result.html).toContain('href="tel:+27712345678"');
    expect(result.html).not.toContain("<script");
    expect(result.html).not.toMatch(/https?:\/\//);
  });
  it("escapes user-authored HTML and never produces active scripts or unsafe links", () => {
    const result = makeWebsiteStarter({
      name: '<img src=x onerror="alert(1)">',
      service: "<script>fetch('/api/ai')</script> & business",
      area: '"Gauteng" <svg onload=alert(1)>',
      phone: "",
    });
    expect(result.html).toContain("&lt;img");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&amp; business");
    expect(result.html).toContain("&lt;svg");
    expect(result.html).not.toContain("<script>");
    expect(result.html).not.toContain('<img src=x');
    expect(result.html).not.toContain('href="tel:');
    expect(result.html).toContain("Content-Security-Policy");
  });
  it("rejects empty and overlong details, malicious phone input and non-digits", () => {
    for (const key of ["name", "service", "area"] as const) {
      expect(() => makeWebsiteStarter({ ...sample, [key]: " " })).toThrow();
    }
    expect(() => makeWebsiteStarter({ ...sample, name: "x".repeat(81) })).toThrow();
    expect(() => makeWebsiteStarter({ ...sample, service: "x".repeat(241) })).toThrow();
    expect(() => makeWebsiteStarter({ ...sample, area: "x".repeat(101) })).toThrow();
    for (const phone of ["javascript:alert(1)", "abc123", "123", "+27<svg>", "071234567890123456789"]) {
      expect(() => makeWebsiteStarter({ ...sample, phone })).toThrow();
    }
  });
  it("allows optional public phone and generates deterministic, complete output", () => {
    const local = { ...sample, phone: "" };
    const first = makeWebsiteStarter(local);
    expect(makeWebsiteStarter(local)).toEqual(first);
    expect(first.html).toContain("Contact us");
    expect(first.html).toContain("</html>");
    expect(first.html).not.toContain('href="tel:');
  });
  it("retains the exact root/app frontend mirrors, including the user-facing page", () => {
    for (const relative of [
      "website-starter.ts",
      "website-starter.css",
      "SimpleWebsiteStarter.tsx",
      "DevSecNetStudioPage.tsx",
    ]) {
      expect(readFileSync("src/features/devsecnet/" + relative, "utf8"))
        .toBe(readFileSync("app/src/features/devsecnet/" + relative, "utf8"));
    }
  });
});
