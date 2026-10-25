import fs from "node:fs";
import assert from "node:assert/strict";

const workflow = fs.readFileSync(".github/workflows/deploy.yml", "utf8");
const cloudbuild = fs.readFileSync("cloudbuild.yaml", "utf8");

// A default-branch push must not start a legacy Google Cloud deployment.
assert.match(workflow, /^on:\s*\n\s+workflow_dispatch:\s*$/m);
assert.doesNotMatch(workflow, /^\s+push\s*:/m);
assert.doesNotMatch(workflow, /google-github-actions|credentials_json:|secrets\.|GCP_DEPLOY_ENABLED|docker\s+push|gcloud\s+run\s+deploy|--update-traffic|--allow-unauthenticated|--clear-env-vars/i);
assert.match(workflow, /\bexit 1\b/, "Manual dispatch must fail closed");
assert.match(workflow, /contents:\s*read/, "Least-privilege GitHub job required");

// Cloud Build may still be triggered outside GitHub, so the repository's
// config must never push an image or mutate Cloud Run. Image builds only.
assert.match(cloudbuild, /id:\s*'build-only'/);
assert.doesNotMatch(cloudbuild, /\b(gcloud|run\s+deploy|docker\s+push)\b|--update-traffic|--allow-unauthenticated|--clear-env-vars|(['"]push['"])|images:\s*\n|\bserviceAccount:/i);
assert.match(cloudbuild, /logging:\s*CLOUD_LOGGING_ONLY/);
console.log("Verified: legacy GCP workflow cannot auto-deploy; Cloud Build config is build-only.");
