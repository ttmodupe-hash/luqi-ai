import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Static source contract only; it cannot authenticate a live deployment.
const read = file => readFileSync(new URL('../.github/workflows/' + file, import.meta.url), 'utf8');
const guard = "github.event_name == 'workflow_dispatch' && github.ref == 'refs/heads/main'";
const cases = [
  ['public-release-checks.yml', 'luqi-public-release'],
  ['custom-domain-https.yml', 'luqi-custom-https'],
  ['lab-framing.yml', 'lab-framing'],
];

describe('predeploy GitHub CI must not wait for a Railway deployment it blocks', () => {
  it('retains source checks on pull requests and main pushes plus manual acceptance', () => {
    for (const [file] of cases) {
      const text = read(file);
      assert.ok(text.includes('  pull_request:\n'), file);
      assert.ok(text.includes('  push:\n    branches: [main]'), file);
      assert.ok(text.includes('  workflow_dispatch:\n'), file);
      assert.ok(text.includes('permissions:\n  contents: read'), file);
    }
  });
  it('gates live public and custom-domain HTTPS probes to manual dispatch on main', () => {
    for (const [file, step] of [
      ['public-release-checks.yml', 'Wait for the expected live commit and verify its public safety boundaries'],
      ['custom-domain-https.yml', 'Verify live custom domain after matching public Railway revision'],
    ]) {
      const text = read(file);
      assert.ok(text.includes('- name: ' + step + '\n        if: ' + guard + '\n'), file);
      assert.ok(text.includes('LUQI_VERIFY_PUBLIC: "true"'), file);
      assert.ok(text.includes('LUQI_EXPECTED_COMMIT: ${{ github.sha }}'), file);
      assert.ok(!text.includes("github.event_name != 'pull_request'"), file);
    }
  });
  it('retains actual Chromium/WebKit framing tests for main push and PR', () => {
    const text = read('lab-framing.yml');
    assert.ok(text.includes('  production-browser-boundary:\n    runs-on: ubuntu-24.04'));
    assert.ok(text.includes('npx --no-install playwright test --config=playwright.framing.config.ts'));
    assert.ok(text.includes('  public-framing:\n    if: ' + guard + '\n    needs: production-browser-boundary'));
    assert.ok(text.includes('run: node scripts/verify-deployed-release.mjs'));
    assert.ok(text.includes('run: node scripts/verify-lab-framing.mjs'));
    assert.ok(text.includes('LUQI_EXPECTED_COMMIT: ${{ github.sha }}'));
  });
  it('fails closed when manual release acceptance is dispatched from another branch', () => {
    for (const [file] of cases) {
      const text=read(file);
      assert.ok(text.includes("if: github.event_name == 'workflow_dispatch'\n        run: test \"$GITHUB_REF\" = 'refs/heads/main'"),file);
    }
  });
  it('does not allow manual postdeploy acceptance to cancel main push CI', () => {
    for (const [file, prefix] of cases) {
      assert.ok(read(file).includes('group: ' + prefix + '-${{ github.event_name }}-${{ github.ref }}'), file);
    }
  });
});
