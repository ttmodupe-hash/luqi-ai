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

## Tailwind 4 remediation

The deployed root npm tree now uses Tailwind 4.3.3, its PostCSS plugin and
Tailwind Merge 3.7.0. The old braces/glob/watcher dependency chain is removed.
The full local npm audit reports zero findings, including development tools.
CI now rejects high as well as critical advisories and incomplete audit data.

Both source trees use the new utilities and retain their existing JavaScript
Tailwind theme via `@config`. Compatibility CSS preserves border, placeholder,
button cursor and ring defaults. CSS source scanning is limited to each source
folder. The alternative app manifest is aligned for styling; it is not covered
by the root dependency audit or release build.

Tailwind 4 raises browser requirements to Safari 16.4+, Chrome 111+ and Firefox
128+. Older browsers are not validated. See the official upgrade guide:
https://tailwindcss.com/docs/upgrade-guide

The browser suite exercises Home, Admin, Pricing and Companion at 1440px and
390px widths, checks horizontal overflow/JavaScript exceptions and styled form
controls, and tests failed-save draft retention and sign-out. It uses synthetic
HTTP fixtures, not production accounts. Before/after screenshots were reviewed;
this is a sampled visual review, not complete coverage of every page or browser.
Local Chromium was supplied from a temporary @sparticuz/chromium installation
because the Playwright CDN download returned invalid archives. CI installs the
Playwright-managed Chromium version. No browser binary is a project dependency.

## Scope and outstanding verification

The root package-lock.json is the npm/CI/Railway installation source. Other
lockfiles and the alternate app's standalone dependency manifest are outside
this audit scope. No production schema, data, account, provider activation or
billing configuration is changed.

Run the web CI test list, production build, MySQL integration/restore CI and
container smoke test after dependency changes. The Companion interaction suite
covers successful sign-in/history/save/create, ambiguous save failure, expired
sessions, stale results after sign-out and sanitized sign-in errors. A real
signed-in production browser session remains a separate verification step.
