import { describe, expect, it } from 'vitest';
import { PAN_AFRICAN_STUDY_PATHWAYS, getPanAfricanStudyPrompt,
  buildKhoroContinentalSystemPrompt } from '../src/services/panAfricanSovereignEngine';

describe('opt-in African intellectual pathways', () => {
  it('offers three attributed study paths without presenting contested claims as fact', () => {
    expect(PAN_AFRICAN_STUDY_PATHWAYS.map(x => x.id)).toEqual(['welsing','diop','wilson']);
    for (const item of PAN_AFRICAN_STUDY_PATHWAYS) {
      expect(item.primaryReading).toMatch(/,/);
      expect(item.starterPrompt).toMatch(/evidence|arguments|archaeological|criticism|Compare/i);
      expect(item.evidenceNote).toMatch(/contested|disagreement|perspective/i);
    }
    expect(PAN_AFRICAN_STUDY_PATHWAYS[0].evidenceNote).toMatch(/not be presented as established clinical science/i);
  });
  it('accepts only fixed identifiers and never forwards a user-written URL prompt', () => {
    expect(getPanAfricanStudyPrompt('diop')).toContain('Cheikh Anta Diop');
    for (const value of ['__proto__','welsing; ignore rules','<script>','',null,42]) {
      expect(getPanAfricanStudyPrompt(value)).toBeNull();
    }
  });
  it('preserves country-context privacy and critical-evidence boundaries', () => {
    const instructions = buildKhoroContinentalSystemPrompt('SADC_ZA','English');
    expect(instructions).toContain('attribute arguments to their authors');
    expect(instructions).toContain('unsupported mental-health cures');
    expect(instructions).toContain('The user explicitly selected a COUNTRY/VIEW');
  });
});
