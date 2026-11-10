import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const paths = [
  'src/components/KhoroSpatialVisionLab.tsx',
  'app/src/components/KhoroSpatialVisionLab.tsx',
];

test('Spatial Vision opens with a local interactive demo before upload', () => {
  for (const path of paths) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /LIVE · LOCAL · ZERO PROVIDER SPEND/);
    assert.match(source, /Pause motion/);
    assert.match(source, /Next learning layer/);
    assert.match(source, /Upload is optional/);
    assert.match(source, /demoScenes/);
  }
});

test('Spatial Vision source copies stay aligned', () => {
  assert.equal(readFileSync(paths[0], 'utf8'), readFileSync(paths[1], 'utf8'));
});

test('Spatial Vision motion remains local and honours reduced motion', () => {
  for (const path of ['src/spatial-vision.css', 'app/src/spatial-vision.css']) {
    const css = readFileSync(path, 'utf8');
    assert.match(css, /@keyframes luqi-core-pulse/);
    assert.match(css, /@media \(prefers-reduced-motion:reduce\)/);
    assert.match(css, /no external fonts or trackers/);
  }
  assert.equal(readFileSync('src/spatial-vision.css', 'utf8'), readFileSync('app/src/spatial-vision.css', 'utf8'));
});
