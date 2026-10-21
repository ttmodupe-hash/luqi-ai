import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("the default LUQI build path cannot deploy to production", () => {
  it("only builds a local validation image, never pushes latest or switches live Cloud Run traffic", () => {
    const cloudBuild = readFileSync("cloudbuild.yaml", "utf8");
    expect(cloudBuild).toContain("luqi-ai-validation:$SHORT_SHA");
    // Inspect active YAML argument values; comments may describe the old risk.
    const lines = cloudBuild.split("\n").filter((line) => !line.trimStart().startsWith("#"));
    const args = lines.join("\n");
    expect(args).not.toMatch(/^\s*-\s*['"]?deploy['"]?\s*$/m);
    expect(args).not.toMatch(/^\s*-\s*['"]?push['"]?\s*$/m);
    expect(args).not.toMatch(/--update-traffic/);
    expect(args).not.toMatch(/--allow-unauthenticated/);
  });

  it("keeps production deployment behind the explicit safety guard", () => {
    const config = readFileSync(".github/workflows/deploy.yml", "utf8");
    expect(config).toContain("Production deployment disabled");
    expect(config).not.toContain("gcloud run deploy");
  });

  it("makes GCP discovery read-only and separately approved", () => {
    const config = readFileSync(".github/workflows/gcp-readonly-inventory.yml", "utf8");
    expect(config).toContain("READ_ONLY_INVENTORY");
    expect(config).toContain("workload_identity_provider");
    expect(config).toContain("gcloud run services list");
    expect(config).not.toContain("gcloud run deploy");
    expect(config).not.toContain("--update-traffic");
  });
});
