# Dependency remediation and verification

The October 2026 root npm audit identified 14 affected dependency entries,
including two critical entries in the Vitest/tinypool chain. Counts include
transitive effects and are not a count of distinct vulnerabilities or evidence
of exploitation.

## Changes

- Upgrade Vitest 3 to patched 4.1.12. The old tinypool dependency is removed;
  Vitest and its mocker packages resolve to the patched release line.
- Override the old esbuild nested under `@esbuild-kit/core-utils` with the
  root project's esbuild constraint (`$esbuild`). Do not downgrade drizzle-kit
  to the old version suggested by npm's automatic major-version remedy.
- Override postcss-selector-parser to the patched 7.1.6 or later release.
  This crosses the old parser's major-version constraint, so the production
  stylesheet build must pass before release.
- Add jsdom and Testing Library for Companion account interaction tests.
  These use mock HTTP responses and synthetic credentials, never a production
  account, real provider or paid inference.
- Keep the production-scope audit report and add an all-dependency CI gate
  that rejects critical findings or incomplete/malformed audit output.
  High and moderate findings remain visible; they are not suppressed.

## Remaining work

Tailwind 3 still depends on the vulnerable braces/glob/watcher chain. The
available recommended fix requires a Tailwind 4 migration. That needs its own
stylesheet and visual regression review across the application's pages;
this change does not claim to resolve those high-severity findings.

The root package-lock.json is the npm/CI/Railway installation source. Other
lockfiles and the alternate app's standalone dependency manifest are outside
this audit scope. No production schema, data, account, provider activation or
billing configuration is changed.

Run the web CI test list, production build, MySQL integration/restore CI and
container smoke test after dependency changes. The Companion interaction suite
covers successful sign-in/history/save/create, ambiguous save failure, expired
sessions, stale results after sign-out and sanitized sign-in errors. A real
signed-in production browser session remains a separate verification step.
