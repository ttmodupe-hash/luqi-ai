import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const oldLock = JSON.parse(execFileSync("git", ["show", "HEAD:package-lock.json"], { encoding: "utf8", maxBuffer: 5_000_000 }));
const updated = JSON.parse(readFileSync("package-lock.json", "utf8"));
const dependency = updated.packages?.["node_modules/drizzle-orm"];
if (!dependency?.version?.startsWith("0.45.")) {
  throw new Error("Patched Drizzle ORM was not resolved");
}
const required = Object.keys(dependency.dependencies || {});
const missing = required.filter(name => !oldLock.packages?.[`node_modules/${name}`]);
const partial = {
  drizzleVersion: dependency.version,
  rootRequirement: updated.packages[""].dependencies["drizzle-orm"],
  drizzlePackage: dependency,
  mandatoryNewDependencies: missing,
};
console.log("LUQI_MINIMAL_DRIZZLE_LOCK=" + JSON.stringify(partial));
