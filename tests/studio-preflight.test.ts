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
  it('does not claim history or skincare presets are independently source-verified', () => {
    const history = STUDIO_BRIEF_PRESETS.find(item => item.id === 'history')!.brief;
    const skincare = STUDIO_BRIEF_PRESETS.find(item => item.id === 'skincare')!.brief;
    expect(history.subject).toMatch(/check original sources/i);
    expect(history.subject).not.toMatch(/through verified source material/i);
    expect(skincare.callToAction).toMatch(/ingredient label/i);
    expect(skincare.callToAction).not.toMatch(/verified ingredients/i);
    expect(studioPreflight(history).ready).toBe(true);
    const exported = creativeBriefText(history);
    expect(exported).toContain('Luqi has not independently checked original sources for this script');
    expect(exported).toContain('Verify facts, dates, commercial claims');
    expect(exported).not.toContain('through verified source material');
  });
  it('keeps all maximum-length browser inputs valid and preserves meaningful scene text', () => {
    const brief = {
      subject: 'S'.repeat(96), camera: 'C'.repeat(80),
      lighting: 'L'.repeat(80), movement: 'M'.repeat(80),
      setting: 'P'.repeat(80), audience: 'A'.repeat(64),
      callToAction: 'T'.repeat(96), appearance: 'V'.repeat(96),
    };
    expect(studioPreflight(brief)).toMatchObject({ completed: 5, ready: true });
    const scenes = creativeBriefScenes(brief);
    expect(scenes).toHaveLength(6);
    expect(scenes.every(scene => scene.caption.length <= 240 && scene.title.length <= 64 && scene.question.length <= 140)).toBe(true);
    expect(scenes[0].caption).toContain(brief.subject);
    expect(scenes[0].caption).toContain(brief.setting);
    expect(scenes[1].caption).toContain(brief.camera);
    expect(scenes[1].caption).toContain(brief.lighting);
    expect(scenes[2].caption).toContain(brief.movement);
    expect(scenes[3].caption).toContain(brief.appearance);
    expect(scenes[5].caption).toContain(brief.audience);
    expect(scenes[5].caption).toContain(brief.callToAction);
    expect(() => storyboardJson(scenes, 'portrait', 2.5, 9.81, 5, 'story')).not.toThrow();
    const exported = creativeBriefText(brief);
    expect(exported).toContain(`Audience: ${brief.audience}`);
    expect(exported).toContain(`Call to action: ${brief.callToAction}`);
    expect(exported).toContain(`Scene 6: ${scenes[5].caption}`);
  });
  it('rejects overlong and malformed fields without silently truncating claims', () => {
    const base = STUDIO_BRIEF_PRESETS[0].brief;
    expect(() => creativeBriefScenes({ ...base, subject: 'x'.repeat(300) })).toThrow(/length/);
    expect(() => creativeBriefScenes({ ...base, camera: '\n \n' })).toThrow(/Complete all five/);
    expect(() => creativeBriefText({ ...base, audience: 'x'.repeat(200) })).toThrow(/length/);
    expect(creativeBriefScenes({ ...base, audience: '  local customers  ' })[5].caption).toContain('For local customers');
    const accepted = creativeBriefScenes({ ...base, subject: 'x'.repeat(96), setting: 'y'.repeat(80), audience: 'z'.repeat(64) });
    expect(accepted[0].caption).toContain('y'.repeat(80));
    expect(accepted[5].caption).toContain('z'.repeat(64));
    expect(accepted.every(scene => scene.caption.length <= 240)).toBe(true);
  });
});
