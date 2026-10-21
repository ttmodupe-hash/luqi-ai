import assert from "node:assert/strict";
import fs from "node:fs";

const docker = fs.readFileSync("Dockerfile.railway.staging", "utf8");
const ignore = fs.readFileSync("Dockerfile.railway.staging.dockerignore", "utf8");
const config = JSON.parse(fs.readFileSync("railway.staging.example.json", "utf8"));
const boot = fs.readFileSync("api/boot.ts", "utf8");

assert.match(docker, /FROM node:22-/, "use the tested Node major");
assert.match(docker, /npm ci\b/, "deterministic dependency install required");
assert.match(docker, /npm run check && npm run build/, "typecheck and build must fail closed");
assert.match(docker, /USER node/, "staging runtime must not be root");
assert.match(docker, /CMD \["node", "dist\/boot\.js"\]/);
assert.doesNotMatch(docker.split("\n").filter((line) => !/^\s*#/.test(line)).join("\n"), /\|\|\s*true|pip install|npm install\s|legacy-peer-deps/i,
  "never mask dependency failures or install the unrelated legacy Python stack");
assert.match(ignore, /^\.env\.\*$/m);
assert.match(ignore, /^data\/archive$/m);
assert.match(ignore, /^\.omega_parts$/m);
assert.equal(config.build.builder, "DOCKERFILE");
assert.equal(config.build.dockerfilePath, "Dockerfile.railway.staging");
assert.equal(config.deploy.healthcheckPath, "/v1/health");
assert.equal(config.deploy.startCommand, "node dist/boot.js");
assert.match(boot, /app\.get\("\/v1\/health"/);
assert.equal(Object.hasOwn(config, "domains"), false, "no production domains in staging example");

// Existing legacy Railway configs remain unchanged until live service config
// and precedence can be inspected through the Railway account permissions.
console.log("Railway staging configuration passed static fail-closed preflight.");
