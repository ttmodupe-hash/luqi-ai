import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pairs = [
  ['src/lib/possibility-engine.ts', 'app/src/lib/possibility-engine.ts'],
  ['src/pages/PossibilityEnginePage.tsx', 'app/src/pages/PossibilityEnginePage.tsx'],
  ['src/possibility-engine.css', 'app/src/possibility-engine.css'],
  ['src/lib/capability-journey.ts', 'app/src/lib/capability-journey.ts'],
  ['src/pages/CapabilityJourneyPage.tsx', 'app/src/pages/CapabilityJourneyPage.tsx'],
  ['src/capability-journey.css', 'app/src/capability-journey.css'],
] as const;

describe('Possibility Engine release parity', () => {
  it('keeps both frontend source trees identical for the new capability', () => {
    for (const [primary, mirror] of pairs) {
      expect(readFileSync(primary, 'utf8')).toBe(readFileSync(mirror, 'utf8'));
    }
  });

  it('publishes the route, navigation and workspace catalog in both frontends', () => {
    for (const root of ['src', 'app/src']) {
      expect(readFileSync(root + '/App.tsx', 'utf8')).toMatch(/path="\/possibility"/);
      expect(readFileSync(root + '/App.tsx', 'utf8')).toMatch(/path="\/journey"/);
      expect(readFileSync(root + '/components/WorkspaceLayout.tsx', 'utf8')).toMatch(/\["\/possibility", "Possibility"\]/);
      expect(readFileSync(root + '/components/WorkspaceLayout.tsx', 'utf8')).toMatch(/\["\/journey", "My journey"\]/);
      expect(readFileSync(root + '/components/workspace-catalog.ts', 'utf8')).toMatch(/id: "possibility-engine"/);
      expect(readFileSync(root + '/components/workspace-catalog.ts', 'utf8')).toMatch(/id: "capability-journey"/);
      expect(readFileSync(root + '/pages/Home.tsx', 'utf8')).toMatch(/to="\/possibility">Build my path/);
    }
  });
});
