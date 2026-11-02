import { describe, expect, it } from 'vitest';
import { CLIP_SECONDS, SHOWCASE_SCENES, STUDIO_FORMATS, episodeOutline, pendulumPeriod,
  pendulumPoint, projectPoint, sceneAt, storyboardJson, subtitles } from '../src/lib/content-studio';
describe('local content and visual learning contracts', () => {
  it('exports exactly six contiguous scenes covering 90 seconds, with truthful processing and publishing status', () => {
    const story = JSON.parse(storyboardJson(SHOWCASE_SCENES, 'portrait', 2.5, 9.81));
    expect(story.durationSeconds).toBe(CLIP_SECONDS);
    expect(story.audio).toBe('none'); expect(story.publishing).toBe('not_connected');
    expect(story.scenes).toHaveLength(6);
    expect(story.scenes.map((s: { startSeconds: number }) => s.startSeconds)).toEqual([0, 15, 30, 45, 60, 75]);
    expect(story.scenes.reduce((sum: number, s: { durationSeconds: number }) => sum + s.durationSeconds, 0)).toBe(90);
  });
  it('provides landscape, portrait and square canvases without relying on third-party assets', () => {
    expect(STUDIO_FORMATS.landscape.width / STUDIO_FORMATS.landscape.height).toBeCloseTo(16 / 9);
    expect(STUDIO_FORMATS.portrait.width / STUDIO_FORMATS.portrait.height).toBeCloseTo(9 / 16);
    expect(STUDIO_FORMATS.square.width).toBe(STUDIO_FORMATS.square.height);
  });
  it('clamps timeline boundaries and keeps the closing scene at the final frame', () => {
    expect([-100, NaN, 0, 14.9, 15, 74.9, 75, 90, 900].map(sceneAt)).toEqual([0, 0, 0, 0, 1, 4, 5, 5, 5]);
  });
  it('generates timed subtitles through 1 minute 30 seconds without missing scenes', () => {
    const srt = subtitles(SHOWCASE_SCENES);
    expect(srt.match(/ --> /g)).toHaveLength(6);
    expect(srt).toContain('00:00:00,000 --> 00:00:15,000');
    expect(srt).toContain('00:01:15,000 --> 00:01:30,000');
    expect(srt).toContain(SHOWCASE_SCENES[5].caption);
  });
  it('makes podcast output an explicit narration draft and includes critical-thinking questions', () => {
    const script = episodeOutline(SHOWCASE_SCENES);
    expect(script).toContain('no audio has been generated');
    for (const scene of SHOWCASE_SCENES) expect(script).toContain(scene.question);
    expect(script).toContain('guest consent');
  });
  it('refuses incomplete/oversized projects before claiming a completed export', () => {
    for (const scenes of [SHOWCASE_SCENES.slice(0, 5), SHOWCASE_SCENES.map((s, i) => i ? s : { ...s, title: '' }),
      SHOWCASE_SCENES.map((s, i) => i ? s : { ...s, caption: 'x'.repeat(241) })]) {
      expect(() => storyboardJson(scenes, 'landscape', 2, 9.81)).toThrow();
      expect(() => subtitles(scenes)).toThrow();
    }
  });
  it('models the square-root relation: quadrupling length doubles the small-angle period', () => {
    expect(pendulumPeriod(4, 9.81) / pendulumPeriod(1, 9.81)).toBeCloseTo(2, 12);
    expect(pendulumPeriod(1, 1.62) / pendulumPeriod(1, 9.81)).toBeCloseTo(Math.sqrt(9.81 / 1.62), 12);
    const period = pendulumPeriod(2.5, 9.81);
    const initial = pendulumPoint(0, 2.5, 9.81), later = pendulumPoint(period, 2.5, 9.81);
    expect(later[0]).toBeCloseTo(initial[0], 12); expect(later[1]).toBeCloseTo(initial[1], 12);
    expect(Math.hypot(...later)).toBeCloseTo(2.5, 12);
  });
  it('changes the camera projection in 3D while preserving depth information', () => {
    const first = projectPoint([1, -2, 1], 0), second = projectPoint([1, -2, 1], 65);
    expect(first).not.toEqual(second); expect(second.every(Number.isFinite)).toBe(true);
    expect(projectPoint([1, -2, -1], 0)[2]).not.toBe(first[2]);
  });
  it('rejects invalid physical parameters instead of displaying invented outputs', () => {
    for (const [length, gravity] of [[0, 9.81], [5, 9.81], [1, 0], [NaN, 9.81]]) {
      expect(() => pendulumPeriod(length, gravity)).toThrow();
    }
  });
});
