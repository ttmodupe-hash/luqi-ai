import type { StudioScene } from './content-studio';

/** A reviewed, local Chat-to-Studio proposal. Never a model-issued tool call.
 * It stays in React memory, contains only bounded text, and has no external URLs.
 */
export type VideoTheme = 'pendulum' | 'gravity' | 'story';
export type StudioVideoPlan = {
  goal: string;
  audience: string;
  explanation: string;
  sceneSeconds: 5 | 15;
  theme: Exclude<VideoTheme, 'pendulum'>;
  scenes: StudioScene[];
};

const tidy = (value: string, limit: number) => value
  .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit).trim();

export function isVideoCreationRequest(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || value.length > 6000) return false;
  const text = value.toLowerCase();
  if (/\b(?:do not|don't|never)\s+(?:create|make|generate|produce)\s+(?:a\s+)?(?:video|cartoon|film|animation)\b/.test(text)) return false;
  return /\b(?:video|cartoon|animation|animated clip|short film)\b/.test(text) &&
    /\b(?:create|make|generate|produce|build|plan|want|would like|turn|explain|show)\b/.test(text);
}

// The confirmed Chat answer may offer exactly six reviewed scene lines.
// This is plain text only; it never executes links, models or provider commands.
function scenesFromAnswer(reply: string): StudioScene[] | null {
  const found = new Map<number, StudioScene>();
  for (const line of reply.split(/\r?\n/).slice(0, 70)) {
    const match = line.match(/^\s*(?:[-*]\s*)?(?:scene\s*)?([1-6])\s*[.):\-]\s*(.+)$/i);
    if (!match) continue;
    const number = Number(match[1]);
    const sections = match[2].split(/\s+\|\s+/);
    if (sections.length !== 3 || found.has(number)) continue;
    const title = tidy(sections[0], 64), caption = tidy(sections[1], 240);
    const question = tidy(sections[2], 140);
    if (title && caption && question) found.set(number, { title, caption, question });
  }
  return found.size === 6 ? [1, 2, 3, 4, 5, 6].map(number => found.get(number)!) : null;
}

const toddlerGravity: StudioScene[] = [
  { title: 'Hello, little explorer!', caption: 'Look at this colourful ball. Where will it go?', question: 'Can you point to the ball?' },
  { title: 'Ready... drop!', caption: 'Down goes the ball! Gravity pulls it toward the Earth.', question: 'Where did the ball go?' },
  { title: 'Up and down', caption: 'A soft ball goes up. Then gravity brings it down.', question: 'Can you point up, then down?' },
  { title: 'Bounce!', caption: 'Boing! The ball bounces up. And comes back down again.', question: 'Can you say boing?' },
  { title: 'An apple falls', caption: 'Look! Even an apple falls down toward the ground.', question: 'Where does the apple go?' },
  { title: 'Gravity is our helper', caption: 'Gravity helps pull things toward Earth. Down, down, down!', question: 'Can you say down?' },
];
const generalGravity: StudioScene[] = [
  { title: 'Why do things fall?', caption: 'Gravity is the pull that draws objects toward Earth.', question: 'Which way does a dropped ball move?' },
  { title: 'Drop a ball', caption: 'Let go of a ball and watch it fall toward the ground.', question: 'What changes when you let go?' },
  { title: 'Toss it up', caption: 'A ball can rise when thrown, then gravity brings it down.', question: 'What happens near the highest point?' },
  { title: 'Watch a bounce', caption: 'The floor pushes the ball back up after impact; gravity keeps pulling down.', question: 'Why does it not bounce forever?' },
  { title: 'Notice everyday gravity', caption: 'Gravity acts on dropped toys, apples, and raindrops.', question: 'Where else do you see gravity?' },
  { title: 'Explain it simply', caption: 'Gravity pulls objects toward Earth. Try a safe demonstration with a soft ball.', question: 'Can you describe the motion?' },
];

function subjectFromGoal(goal: string): string {
  const match = goal.match(/\b(?:about|explaining|on|of|teaching)\s+(.+?)(?=\s+for\s+(?:my|our|a|an|the)\b|[.!?]|$)/i);
  return tidy(match?.[1] ?? goal, 90) || 'your idea';
}

function generalScenes(goal: string, reply: string): StudioScene[] {
  const subject = subjectFromGoal(goal);
  const sentences = reply.replace(/<[^>]{0,100}>/g, ' ').split(/(?<=[.!?])\s+|\r?\n/)
    .map(part => tidy(part.replace(/^(?:[-*]|\d+[.):])\s*/, ''), 220))
    .filter(part => part.length > 16 && !/^\s*(?:https?:\/\/|www\.)/i.test(part))
    .slice(0, 12);
  const captions = [
    'Today we will discover ' + subject + '.',
    sentences[0] ?? 'Let us begin with one simple idea about ' + subject + '.',
    sentences[1] ?? 'Look closely at an example and notice what changes.',
    sentences[2] ?? 'Watch the idea again from a different angle.',
    sentences[3] ?? 'Think about how it connects to everyday life.',
    'What did you learn about ' + subject + '?',
  ];
  const titles = ['Let us begin', 'First idea', 'See it differently', 'Look closer', 'Try an example', 'Your turn'];
  const questions = ['What do you notice?', 'Can you explain that simply?', 'What changed?', 'What stayed the same?', 'Where else might this happen?', 'What would you tell a friend?'];
  return titles.map((title, index) => ({ title, caption: tidy(captions[index], 240), question: questions[index] }));
}

/** A confirmed model reply is needed before approval; fallback never invents a
 * provider reply. The entire proposal is visible and editable in Studio.
 */
export function proposeStudioVideo(goal: string, confirmedReply: string): StudioVideoPlan | null {
  if (!isVideoCreationRequest(goal) || typeof confirmedReply !== 'string' || !confirmedReply.trim()) return null;
  const short = /\b(?:toddler|preschool|2[\s-]?(?:year|yr)[\s-]?old|two[\s-]?year[\s-]?old|two[\s-]?(?:years|yrs)\s+old)\b/i.test(goal);
  const gravity = /\b(?:gravity|gravitational|falling objects|things fall)\b/i.test(goal);
  const scenes = scenesFromAnswer(confirmedReply) ??
    (gravity ? (short ? toddlerGravity : generalGravity).map(scene => ({ ...scene })) : generalScenes(goal, confirmedReply));
  return {
    goal: tidy(goal, 600),
    audience: short ? 'Young child (around age 2)' : 'Audience described in your request',
    explanation: short ? 'Six short, gentle scenes (30 seconds). Simple visuals and short captions are suited to early learners.' :
      'Six scenes (90 seconds). This is a local illustrated video draft, not a cinematic generative-video service.',
    sceneSeconds: short ? 5 : 15,
    theme: gravity ? 'gravity' : 'story',
    scenes,
  };
}
