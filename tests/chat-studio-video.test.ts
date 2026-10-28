import { describe, expect, it } from 'vitest';
import { isVideoCreationRequest, proposeStudioVideo } from '../src/lib/video-plan';
import { sceneAt, sceneAtForDuration, studioDuration, subtitles, episodeOutline, storyboardJson } from '../src/lib/content-studio';
import { parseStudioDraft, serializeStudioDraft } from '../src/lib/studio-draft';

const goal = 'I want to create a video explaining the laws of gravity for my 2 year old child.';
const confirmed = 'We can tell a gentle story about a ball and an apple, using six short scenes.';

describe('reviewed local Chat-to-Studio video contract', () => {
  it('recognises the user video goal, not arbitrary model output or a refusal to create', () => {
    expect(isVideoCreationRequest(goal)).toBe(true);
    expect(isVideoCreationRequest('Help me study for a physics exam')).toBe(false);
    expect(isVideoCreationRequest('Do not create a video; I only need a summary')).toBe(false);
    expect(proposeStudioVideo('Hello', confirmed)).toBeNull();
    expect(proposeStudioVideo(goal, '')).toBeNull();
  });
  it('makes a truthful toddler gravity sequence instead of the generic pendulum', () => {
    const plan = proposeStudioVideo(goal, confirmed)!;
    expect(plan.sceneSeconds).toBe(5);
    expect(studioDuration(plan.sceneSeconds)).toBe(30);
    expect(plan.audience).toContain('age 2');
    expect(plan.theme).toBe('gravity');
    expect(plan.scenes).toHaveLength(6);
    expect(plan.scenes[1].caption).toMatch(/gravity pulls/i);
    expect(plan.scenes[4].title).toMatch(/apple/i);
    expect(sceneAtForDuration(5, plan.sceneSeconds)).toBe(1);
    expect(sceneAtForDuration(30, plan.sceneSeconds)).toBe(5);
    expect([0, 15, 75, 90].map(sceneAt)).toEqual([0, 1, 5, 5]);
    expect(subtitles(plan.scenes, plan.sceneSeconds)).toContain('00:00:25,000 --> 00:00:30,000');
    expect(episodeOutline(plan.scenes, plan.sceneSeconds)).toContain('30-second script');
  });
  it('preserves all six bounded model-suggested scenes when they meet the reviewed contract', () => {
    const reply = Array.from({ length: 6 }, (_, i) =>
      'Scene ' + (i + 1) + ': Topic ' + (i + 1) + ' | This is one clear sentence for the viewer. | What do you see?'
    ).join('\n');
    const plan = proposeStudioVideo('Please create a video about safe gardening for beginners.', reply)!;
    expect(plan.theme).toBe('story');
    expect(plan.sceneSeconds).toBe(15);
    expect(plan.scenes.map(s => s.title)).toEqual(['Topic 1','Topic 2','Topic 3','Topic 4','Topic 5','Topic 6']);
    expect(plan.scenes[0].caption).toContain('clear sentence');
  });
  it('uses a bounded generic illustrated fallback rather than executing model commands', () => {
    const reply = '<script>alert(1)</script> First, learn about magnets. Then test safe examples. Next compare them. Finally review.';
    const plan = proposeStudioVideo('Create a video about magnets.', reply)!;
    expect(plan.scenes).toHaveLength(6);
    expect(plan.scenes.every(s => s.title.length <= 64 && s.caption.length <= 240 && s.question.length <= 140)).toBe(true);
    expect(plan.scenes.every(s => !s.caption.includes('<script>'))).toBe(true);
    expect(plan.explanation).toMatch(/not a cinematic/i);
  });
  it('exports a strict versioned 30-second local draft and restores its exact timing and theme', () => {
    const plan = proposeStudioVideo(goal, confirmed)!;
    const saved = serializeStudioDraft(plan.scenes, 'landscape', 2.5, 9.81, 28, plan.sceneSeconds, plan.theme);
    const source = JSON.parse(saved);
    expect(source.format).toBe('luqi.storyboard.v3');
    expect(source.durationSeconds).toBe(30);
    expect(source.simulation.model).toBe('local_illustration');
    expect(source.scenes[5].startSeconds).toBe(25);
    expect(source.scenes[5].durationSeconds).toBe(5);
    const opened = parseStudioDraft(saved);
    expect(opened.scenes).toEqual(plan.scenes);
    expect(opened.visualTheme).toBe('gravity');
    expect(opened.sceneSeconds).toBe(5);
    expect(JSON.parse(storyboardJson(plan.scenes, 'landscape', 2.5, 9.81, 5, 'gravity')).durationSeconds).toBe(30);
    expect(parseStudioDraft(storyboardJson(plan.scenes, 'landscape', 2.5, 9.81, 5, 'gravity')).visualTheme).toBe('gravity');
  });
  it('fails closed on tampered duration, URLs and extra fields while preserving legacy imports', () => {
    const plan = proposeStudioVideo(goal, confirmed)!;
    const file = JSON.parse(serializeStudioDraft(plan.scenes, 'portrait', 2.5, 9.81, 28, 5, 'gravity'));
    for (const replacement of [
      { ...file, durationSeconds: 90 },
      { ...file, sceneSeconds: 1 },
      { ...file, externalProvider: 'https://not-allowed.invalid' },
      { ...file, scenes: file.scenes.map((s: Record<string, unknown>, i: number) => i ? s : { ...s, durationSeconds: 15 }) },
    ]) expect(() => parseStudioDraft(JSON.stringify(replacement))).toThrow();
    const old = parseStudioDraft(serializeStudioDraft(plan.scenes, 'portrait', 2.5, 9.81, 28));
    expect(old.visualTheme).toBeUndefined();
    expect(old.sceneSeconds).toBeUndefined();
  });
});
