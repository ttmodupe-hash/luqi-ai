import type { StudioScene } from './content-studio';

/** Pure local production planning; never validates claims, spends credits or renders video. */
export type StudioCreativeBrief = {
  subject: string; camera: string; lighting: string; movement: string; setting: string;
  audience: string; callToAction: string; appearance: string;
};
export const EMPTY_STUDIO_BRIEF: StudioCreativeBrief = {
  subject: '', camera: '', lighting: '', movement: '', setting: '',
  audience: '', callToAction: '', appearance: '',
};
const FIELD_LIMITS: Record<keyof StudioCreativeBrief, number> = {
  subject: 96, camera: 80, lighting: 80, movement: 80, setting: 80,
  audience: 64, callToAction: 96, appearance: 96,
};
const REQUIRED = [
  { key: 'subject', label: 'Subject and action' },
  { key: 'camera', label: 'Camera and framing' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'movement', label: 'Motion' },
  { key: 'setting', label: 'Setting' },
] as const;

/** Five-part completeness checklist, NOT a predicted visual-quality score. */
export function studioPreflight(brief: StudioCreativeBrief) {
  const missing = REQUIRED.filter(({ key }) => {
    const value = brief[key];
    return typeof value !== 'string' || !value.trim() || value.trim().length > FIELD_LIMITS[key];
  }).map(({ label }) => label);
  return { completed: REQUIRED.length - missing.length, total: REQUIRED.length,
    missing, ready: missing.length === 0 };
}
function cleanBrief(brief: StudioCreativeBrief): StudioCreativeBrief {
  const copy = {} as StudioCreativeBrief;
  for (const key of Object.keys(FIELD_LIMITS) as Array<keyof StudioCreativeBrief>) {
    const raw: unknown = brief[key];
    if (typeof raw !== 'string' || raw.length > FIELD_LIMITS[key] + 32)
      throw new Error('Keep each field within its listed length. Your storyboard was not changed.');
    const value = raw.replace(/\s+/g, ' ').trim();
    if (value.length > FIELD_LIMITS[key])
      throw new Error('Keep each field within its listed length. Your storyboard was not changed.');
    copy[key] = value;
  }
  if (!studioPreflight(copy).ready)
    throw new Error('Complete all five cinematic planning fields before applying the storyboard.');
  return copy;
}
export function creativeBriefScenes(input: StudioCreativeBrief): StudioScene[] {
  const b = cleanBrief(input);
  const scenes: StudioScene[] = [
    { title: '01 · Introduce the idea',
      caption: `${b.subject}. Set in ${b.setting}${b.audience ? ', for ' + b.audience : ''}.`,
      question: 'Who is this story for, and what should viewers understand?' },
    { title: '02 · Establish the image',
      caption: `Camera: ${b.camera}. Lighting: ${b.lighting}. Use only artwork you own or may use.`,
      question: 'Does the framing clearly show the subject?' },
    { title: '03 · Add purposeful motion',
      caption: `Motion direction: ${b.movement}. Keep the visual understandable without audio.`,
      question: 'What does movement add to this story?' },
    { title: '04 · Keep the look consistent',
      caption: `${b.appearance || 'Keep approved brand colours, wardrobe and subject references consistent.'} This is a planning note, not an AI identity lock.`,
      question: 'Have you reviewed continuity and obtained permissions?' },
    { title: '05 · Explain what matters',
      caption: `Show a real, relevant use case for ${b.subject}. Verify benefits, facts and prices before publishing.`,
      question: 'Which claims need independent evidence?' },
    { title: '06 · End with a clear action',
      caption: `${b.callToAction || 'Invite customers to check your current details before visiting or ordering.'} Confirm the final call to action.`,
      question: 'Is this invitation accurate and easy to follow?' },
  ];
  if (scenes.some(scene => scene.title.length > 64 || scene.caption.length > 240 ||
      !scene.caption.trim() || scene.question.length > 140))
    throw new Error('The creative brief is too long for six editable scenes. Shorten it first.');
  return scenes;
}
export function creativeBriefText(input: StudioCreativeBrief): string {
  const b = cleanBrief(input);
  return ['LUQI STUDIO — LOCAL PRE-FLIGHT PRODUCTION BRIEF',
    'Planning checklist only. No model prediction, video credits, identity lock, or paid rendering.',
    'Verify source facts, commercial claims, cast and music rights before publishing.', '',
    ...Object.entries({ Subject: b.subject, Camera: b.camera, Lighting: b.lighting,
      Motion: b.movement, Setting: b.setting, Audience: b.audience || 'Not specified',
      'Call to action': b.callToAction || 'Not specified',
      'Continuity note': b.appearance || 'Not specified',
    }).map(([label, value]) => `${label}: ${value}`), '',
    ...creativeBriefScenes(b).map((scene, i) => `Scene ${i + 1}: ${scene.caption}\nReview: ${scene.question}`),
    '', 'This file is a script direction, not a rendered film or publishing confirmation.', ''].join('\n');
}
export const STUDIO_BRIEF_PRESETS: ReadonlyArray<{ id: string; label: string; brief: StudioCreativeBrief }> = [
  { id: 'kota', label: 'Township kota / takeaway', brief: {
    subject: 'Showcase a locally prepared kota and its serving experience', camera: '50mm close-up of prepared food',
    lighting: 'Warm softbox and natural food texture', movement: 'Slow tabletop push-in and reveal',
    setting: 'Local takeaway counter', audience: 'local lunchtime customers',
    callToAction: 'Check the current menu, prices and store contact details before ordering',
    appearance: 'Use the shop’s own approved brand colours and product photos',
  } },
  { id: 'skincare', label: 'Marula / rooibos product showcase', brief: {
    subject: 'Present a locally made botanical skincare product without medical claims',
    camera: '85mm product close-up with label readable', lighting: 'Soft studio reflections',
    movement: 'Subtle slow turntable motion', setting: 'Simple clean product table',
    audience: 'customers exploring locally made products',
    callToAction: 'Read verified ingredients and contact the maker for current availability',
    appearance: 'Match the approved packaging colours and label across the six scenes',
  } },
  { id: 'solar', label: 'Solar contractor introduction', brief: {
    subject: 'Introduce a small solar installation contractor and its process',
    camera: 'Wide exterior establishing view and close-ups', lighting: 'Natural daylight',
    movement: 'Slow walk-through of the work sequence', setting: 'A consented demonstration property',
    audience: 'homeowners comparing solar services',
    callToAction: 'Request a written quotation and verify licensing and system specifications',
    appearance: 'Use the contractor’s approved logo and safety equipment',
  } },
  { id: 'history', label: 'African history explainer', brief: {
    subject: 'Introduce one historical African place through verified source material',
    camera: 'Wide landscape view and close-up of cited details', lighting: 'Natural documentary lighting',
    movement: 'Gentle pan across original illustrated scenes', setting: 'A clearly identified historical location',
    audience: 'curious learners and families',
    callToAction: 'Open the original sources and check dates and interpretations',
    appearance: 'Distinguish historical sources from invented artwork or reconstructions',
  } },
];
