import { describe, expect, it } from "vitest";
import { reviewContentForCommercialUse } from "./content-rights";

const base = {
  title: "African science lesson", sourceUrl: "https://example.org/lesson",
  license: "cc-by-4.0" as const, attribution: "Example author, CC BY 4.0",
  commercialUseApproved: true, languages: ["zu"], subjects: ["physics"],
};

describe("external learning content licensing", () => {
  it("accepts reviewed, attributed commercially usable content", () => {
    expect(reviewContentForCommercialUse(base).approved).toBe(true);
  });
  it("blocks noncommercial datasets despite public availability", () => {
    expect(reviewContentForCommercialUse({ ...base, license: "noncommercial" }).approved).toBe(false);
  });
  it("requires human approval", () => {
    expect(reviewContentForCommercialUse({ ...base, commercialUseApproved: false }).approved).toBe(false);
  });
  it("requires written permission for proprietary content", () => {
    expect(reviewContentForCommercialUse({ ...base, license: "proprietary-permission", attribution: "" }).approved).toBe(false);
    expect(reviewContentForCommercialUse({ ...base, license: "proprietary-permission", permissionReference: "contract-123" }).approved).toBe(true);
  });
});
