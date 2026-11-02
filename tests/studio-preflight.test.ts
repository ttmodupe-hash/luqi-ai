import { describe, expect, it } from 'vitest';
import { EMPTY_STUDIO_BRIEF, STUDIO_BRIEF_PRESETS, creativeBriefScenes,
  creativeBriefText, studioPreflight } from '../src/lib/studio-preflight';
import { storyboardJson, subtitles } from '../src/lib/content-studio';

describe('Luqi Studio no-provider creative preflight', () => {
  it('checks completeness of five independent creative vectors, not predicted visual quality', () => {
    expect(studioPreflight(EMPTY_STUDIO_BRIEF)).toEqual({ completed: 0, total: 5,
      missing: ['Subject and action','Camera and framing','Lighting','Motion','Setting'], ready: false });
    const filled = { ...EMPTY_STUDIO_BRIEF, subject: 'A warrior walking' };
    expect(studioPreflight(filled)).toMatchObject({ completed: 1, ready: false });
    expect(() => creativeBriefScenes(filled)).toThrow(/Complete all five/);
  });
  it('provides four deterministic original SMME/history examples without cloud billing', () => {
    expect(STUDIO_BRIEF_PRESETS.map(item => item.id)).toEqual(['kota','skincare','solar','history']);
    for (const preset of STUDIO_BRIEF_PRESETS) {
      expect(studioPreflight(preset.brief)).toMatchObject({ completed: 5, total: 5, ready: true });
      const scenes = creativeBriefScenes(preset.brief);
      expect(scenes).toHaveLength(6);
      expect(scenes[0].caption).toContain(preset.brief.subject);
      expect(scenes[1].caption).toContain(preset.brief.camera);
      expect(scenes[1].caption).toContain(preset.brief.lighting);
      expect(scenes[2].caption).toContain(preset.brief.movement);
      expect(scenes[3].caption).toMatch(/planning note, not an AI identity lock/);
      expect(scenes.every(s => s.title.length <= 64 && s.caption.length <= 240 && s.question.length <= 140)).toBe(true);
      const exported = JSON.parse(storyboardJson(scenes, 'portrait', 2.5, 9.81, 5, 'story'));
      expect(exported.durationSeconds).toBe(30);
      expect(exported.rendering).toBe('local_original_motion_graphics');
      expect(exported.publishing).toBe('not_connected');
      expect(subtitles(scenes, 5).match(/ --> /g)).toHaveLength(6);
      expect(creativeBriefScenes(preset.brief)).toEqual(scenes);
    }
  });
  it('prepares a truthful local creative-production brief without a fake credit ledger', () => {
    const content = creativeBriefText(STUDIO_BRIEF_PRESETS[0].brief);
    expect(content).toContain('No model prediction, video credits, identity lock, or paid rendering');
    expect(content).toContain('Scene 6:');
    expect(content).not.toContain('Not specified');
    expect(content).not.toMatch(/100% success|guaranteed identity|rendered film ready/i);
  });
  it('rejects overlong and malformed fields without silently truncating claims', () => {
    const base = STUDIO_BRIEF_PRESETS[0].brief;
    expect(() => creativeBriefScenes({ ...base, subject: 'x'.repeat(300) })).toThrow(/length/);
    expect(() => creativeBriefScenes({ ...base, camera: '\n \n' })).toThrow(/Complete all five/);
    expect(() => creativeBriefText({ ...base, audience: 'x'.repeat(200) })).toThrow(/length/);
    expect(creativeBriefScenes({ ...base, audience: '  local customers  ' })[0].caption).toContain('for local customers');
    expect(() => creativeBriefScenes({ ...base, subject: 'x'.repeat(96), setting: 'x'.repeat(80), audience: 'x'.repeat(64) })).toThrow(/too long/);
  });
});
