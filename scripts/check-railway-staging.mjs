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

const floatingChat = fs.readFileSync("app/src/components/FloatingAiChat.tsx", "utf8");
const backend = fs.readFileSync("api/boot.ts", "utf8");
assert.match(floatingChat, /fetch\("\/api\/v1\/luqi-core"/,
  "floating chat must use the quota-controlled backend route");
assert.doesNotMatch(floatingChat, /GoogleGenAI|VITE_GEMINI_API_KEY|process\.env\.GEMINI_API_KEY/,
  "no browser-side Gemini fallback or API key exposure");
assert.match(backend, /status: 'unavailable'[\s\S]*?503/,
  "failed AI calls must return honest server errors rather than fake success");

const educationUI = fs.readFileSync("app/src/components/ExperientialSimulatorSandbox.tsx", "utf8");
const educationServer = fs.readFileSync("api/services/experientialEducationOrchestrator.ts", "utf8");
assert.doesNotMatch(educationUI, /new\\s+Function\\s*\\(|\\beval\\s*\\(/,
  "untrusted educational JS must not execute in the browser");
assert.doesNotMatch(educationServer, /execSync|generateContent|orchestrateRequest/,
  "untrusted model JS or paid self-repair must not execute server-side");
assert.match(educationServer, /status: "FAILED"/,
  "unreviewed simulations must report failure, never fabricated success");

// Existing legacy Railway configs remain unchanged until live service config
// and precedence can be inspected through the Railway account permissions.
console.log("Railway staging configuration passed static fail-closed preflight.");
