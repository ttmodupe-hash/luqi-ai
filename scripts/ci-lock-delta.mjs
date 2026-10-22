import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const oldLock = JSON.parse(execFileSync("git", ["show", "HEAD:package-lock.json"], { encoding: "utf8", maxBuffer: 5_000_000 }));
const newLock = JSON.parse(readFileSync("package-lock.json", "utf8"));
if (!newLock.packages?.["node_modules/drizzle-orm"]?.version?.startsWith("0.45.")) {
  throw new Error("npm install did not resolve patched Drizzle ORM");
}
const changed = [];
for (const path of new Set([...Object.keys(oldLock.packages), ...Object.keys(newLock.packages)])) {
  if (JSON.stringify(oldLock.packages[path]) !== JSON.stringify(newLock.packages[path])) {
    changed.push([path, newLock.packages[path] ?? null]);
  }
}
if (!changed.length || changed.length > 60) throw new Error("Unexpected lockfile drift " + changed.length);
console.log("LUQI_LOCK_DELTA_BEGIN" + JSON.stringify({
  drizzleVersion: newLock.packages["node_modules/drizzle-orm"].version,
  entries: changed,
}) + "LUQI_LOCK_DELTA_END");
