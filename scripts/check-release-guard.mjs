import fs from "node:fs";
import assert from "node:assert/strict";

const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const cloudbuild = fs.readFileSync("cloudbuild.yaml", "utf8");

assert.match(workflow, /workflow_dispatch:/, "Release guard must remain explicitly manual");
assert.doesNotMatch(workflow, /^\s+push\s*:/m, "Auto-deploy on push must remain disabled");
assert.doesNotMatch(workflow, /gcloud\s+run\s+deploy|--update-traffic|--clear-env-vars|credentials_json:|GCP_SA_KEY|docker\s+push/i);
assert.match(workflow, /exit 1/, "Workflow must fail closed");

assert.doesNotMatch(cloudbuild, /'push'|\bpush\b|\brun\s+deploy\b|--update-traffic|--allow-unauthenticated|--clear-env-vars/i);
assert.match(cloudbuild, /build-only/, "Cloud Build must be limited to validation");

console.log("LUQI release guard: workflow auto-deploy disabled; Cloud Build validation-only.");
