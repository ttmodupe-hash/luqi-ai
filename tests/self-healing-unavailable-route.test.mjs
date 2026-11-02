import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("both Luqi application trees use the honest closed route, not the legacy live dashboard", () => {
  for (const root of ["src", "app/src"]) {
    const routes = read(root + "/App.tsx");
    assert.match(routes, /SelfHealingPage\s*=\s*lazyQueryPage\(\(\)\s*=>\s*import\("\.\/pages\/SelfHealingUnavailablePage"\)\)/);
    assert.match(routes, /path="\/self-healing"\s+element=\{<SelfHealingPage\s*\/>\}/);
    assert.doesNotMatch(routes, /SelfHealingPage\s*=\s*lazyQueryPage\(\(\)\s*=>\s*import\("\.\/pages\/SelfHealingPage"\)\)/);
  }
});

test("the mirrored unavailable page has no poller, AI request or fake completion claim", () => {
  const page = read("src/pages/SelfHealingUnavailablePage.tsx");
  assert.equal(page, read("app/src/pages/SelfHealingUnavailablePage.tsx"));
  assert.match(page, /Automated repair is not available/);
  assert.match(page, /to="\/chat"/);
  assert.match(page, /to="\/"/);
  assert.doesNotMatch(page, /(?:fetch\(|trpc\.|setInterval\(|useEffect\(|useQuery\(|useMutation\()/);
});

test("backend keeps the autonomous pipeline unavailable until reviewed", () => {
  const backend = read("api/rest-compat.ts");
  assert.match(backend, /SELF_HEALING_PIPELINE_NOT_CONFIGURED/);
  assert.match(backend, /restCompat\.get\(`\$\{prefix\}\/self-healing\/pipeline\/jobs`,\s*selfHealingUnavailable\)/);
  assert.match(backend, /restCompat\.post\(`\$\{prefix\}\/self-healing\/pipeline\/run`,\s*selfHealingUnavailable\)/);
});
