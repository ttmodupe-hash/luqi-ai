import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { superIntelligenceCore } from "./services/superIntelligenceCore";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("LUQI autonomous safety and release invariants", () => {
  it("never executes model-produced code in the Cloud Run application process", async () => {
    const facade = read("api/services/superIntelligenceCore.ts");
    expect(facade).not.toMatch(/\b(?:execSync|spawnSync|eval|new Function)\s*\(/);
    expect(facade).not.toContain('from "child_process"');
    const result = superIntelligenceCore.evaluateSandbox(
      'require("node:fs").writeFileSync("/tmp/untrusted", "bad")',
      "true",
    );
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/cannot execute/i);
    await expect(superIntelligenceCore.executeAutonomousLoop(
      "unsafe", "run code", "true", 1,
    )).rejects.toThrow(/retired/i);
  });

  it("only persists agent suggestions and never describes them as applied", () => {
    const agent = read("api/services/agentReview.ts");
    expect(agent).toContain('status: "proposed"');
    expect(agent).toContain("verifiedByCI: false");
    expect(agent).toContain("codeExecuted: false");
    expect(agent).toContain("humanReviewRequired: true");
    expect(agent).toContain("applied: false");
    expect(agent).toContain("verified: false");
  });

  it("has no Cloud Build image push or direct production traffic switch", () => {
    const cloudBuild = read("cloudbuild.yaml");
    expect(cloudBuild).not.toMatch(/\bdeploy\b\s*\n\s*-\s*['"]?luqi-ai-backend/);
    expect(cloudBuild).not.toMatch(/--update-traffic|--allow-unauthenticated|\bpush\b.*\$PROJECT_ID/);
    expect(cloudBuild).toContain("build-only");
  });

  it("guards production deployment instead of silently running on main push", () => {
    const deploy = read(".github/workflows/deploy.yml");
    expect(deploy).not.toMatch(/branches:\s*\[main\]/);
    expect(deploy).not.toMatch(/gcloud run deploy|--clear-env-vars|GCP_SA_KEY/);
    expect(deploy).toContain("Production deployment disabled");
  });
});
