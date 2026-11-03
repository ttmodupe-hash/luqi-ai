import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const description = 'Explore Luqi Chat, practical learning, South African service guidance, opportunities and everyday tools. Check sources and availability; some features require sign-in.';
const canonical = 'https://app.luqi-ai.com/#/chat';

test('the public HTML and install manifests use current, truthful descriptions', () => {
  for (const path of ['index.html', 'app/index.html']) {
    const html = read(path);
    assert.ok(html.includes('<meta name="description" content="' + description + '"'), path);
    assert.doesNotMatch(html, /limited signed-in AI text trial/i);
    assert.ok(html.includes("register('/sw.js'"), path);
  }
  for (const path of ['public/manifest.json', 'app/public/manifest.json']) {
    const manifest = JSON.parse(read(path));
    assert.equal(manifest.description, description, path);
    assert.equal(manifest.short_name, 'Luqi', path);
  }
  assert.equal(read('public/manifest.json'), read('app/public/manifest.json'));
  assert.equal(read('public/sw.js'), read('app/public/sw.js'));
});

test('the historical marketing page links to live Luqi, not the retired prototype or waitlist', () => {
  const html = read('docs/index.html');
  assert.ok(html.split('href="' + canonical + '"').length >= 4);
  assert.match(html, /Explore Luqi today/);
  assert.match(html, /Features vary by access and readiness/);
  assert.doesNotMatch(html, /preparing for launch|join the waitlist|launching first in South Africa|generation activates at launch/i);
  assert.doesNotMatch(html, /prototypes\/chat-ui\.html|luqi-ai-production\.up\.railway\.app/i);
  assert.doesNotMatch(html, /fetch\(ENGINE|setInterval\(beat/);
  assert.doesNotMatch(html, /Waitlist members get in first|before the public gates open|Engine deployment/i);
  assert.doesNotMatch(html, /fraud families in the live|sourced entries in the African|22<\/div>|15 official-source guides/i);
  assert.doesNotMatch(html, /omega-super-ai|id="pulse-(?:badge|now|total)"/i);
  assert.match(html, /Customer application/);
  assert.match(html, /Guest trial and registration/);
  assert.match(html, /Mobile acceptance and subscriptions/);
  assert.match(html, /github\.com\/ttmodupe-hash\/luqi-ai/);
});
