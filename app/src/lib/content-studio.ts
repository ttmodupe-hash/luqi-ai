/** Local, original motion graphics. No account, provider or publishing client. */
export const CLIP_SECONDS = 90;
export const SCENE_SECONDS = 15;
export interface StudioScene { title: string; caption: string; question: string }
export const SHOWCASE_SCENES: readonly StudioScene[] = [
  { title: 'Make room for curiosity.', caption: 'LUQI brings your ideas, hands-on learning and original motion graphics into one workspace.', question: 'What would you like to understand or create?' },
  { title: 'See an idea from every angle.', caption: 'Explore a pendulum in three dimensions. Change its length, move the camera and compare what happens.', question: 'Predict first: will a longer pendulum move faster?' },
  { title: 'Let time tell the story.', caption: 'Scrub the timeline. Compare motion across time, the fourth axis in this learning view.', question: 'What changed? What stayed the same? What explains it?' },
  { title: 'Keep your ideas together.', caption: 'Private notes have a separate signed-in space. This animation uses original graphics and no private account content.', question: 'Connect a new idea to an example from your own life.' },
  { title: 'Turn an explanation into a creation.', caption: 'Edit six scenes. Choose landscape, portrait or square. Export your script, subtitles and a silent 90-second animation.', question: 'Could someone new to the topic explain it back?' },
  { title: 'Create with care. Share with purpose.', caption: 'Review facts, permissions and context before uploading. Direct social publishing and professional submissions are not connected.', question: 'Whose permission, evidence or review is still needed?' },
];
export type StudioFormat = 'landscape' | 'portrait' | 'square';
export const STUDIO_FORMATS: Record<StudioFormat, { width: number; height: number; label: string }> = {
  landscape: { width: 1280, height: 720, label: '16:9 landscape · YouTube' },
  portrait: { width: 720, height: 1280, label: '9:16 portrait · TikTok / WhatsApp' },
  square: { width: 900, height: 900, label: '1:1 square · Facebook' },
};
export function sceneAt(seconds: number): number {
  return Math.min(5, Math.max(0, Math.floor((Number.isFinite(seconds) ? seconds : 0) / SCENE_SECONDS)));
}
export function pendulumPeriod(length: number, gravity: number): number {
  if (!Number.isFinite(length) || length < .5 || length > 4 || !Number.isFinite(gravity) || gravity < 1 || gravity > 20) throw new Error('Invalid simulation parameters');
  return 2 * Math.PI * Math.sqrt(length / gravity);
}
export function pendulumPoint(time: number, length: number, gravity: number): [number, number, number] {
  const theta = .3 * Math.cos(2 * Math.PI * time / pendulumPeriod(length, gravity));
  return [length * Math.sin(theta), -length * Math.cos(theta), 0];
}
export function projectPoint(point: readonly number[], yaw: number): [number, number, number] {
  const a = yaw * Math.PI / 180, b = -.24;
  const x = point[0] * Math.cos(a) + point[2] * Math.sin(a);
  const z = -point[0] * Math.sin(a) + point[2] * Math.cos(a);
  const y = point[1] * Math.cos(b) - z * Math.sin(b), depth = point[1] * Math.sin(b) + z * Math.cos(b);
  const perspective = 6 / (8 - depth);
  return [x * perspective, -y * perspective, depth];
}
function validate(scenes: readonly StudioScene[]) {
  if (scenes.length !== 6 || scenes.some(s => !s.title.trim() || s.title.length > 64 || !s.caption.trim() ||
      s.caption.length > 240 || !s.question.trim() || s.question.length > 140)) throw new Error('Complete all six bounded scenes before export.');
}
export function storyboardJson(scenes: readonly StudioScene[], format: StudioFormat, length: number, gravity: number): string {
  validate(scenes); pendulumPeriod(length, gravity);
  return JSON.stringify({ format: 'luqi.storyboard.v1', durationSeconds: CLIP_SECONDS, aspect: format,
    audio: 'none', rendering: 'local_original_motion_graphics', publishing: 'not_connected',
    simulation: { model: 'small_angle_pendulum', lengthMetres: length, gravityMetresPerSecondSquared: gravity },
    scenes: scenes.map((s, i) => ({ ...s, startSeconds: i * SCENE_SECONDS, durationSeconds: SCENE_SECONDS })) }, null, 2);
}
const stamp = (seconds: number) => `00:${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')},000`;
export function subtitles(scenes: readonly StudioScene[]): string {
  validate(scenes);
  return scenes.map((s, i) => `${i + 1}\n${stamp(i * 15)} --> ${stamp((i + 1) * 15)}\n${s.title}\n${s.caption.replace(/\r?\n/g, ' ')}\n`).join('\n');
}
export function episodeOutline(scenes: readonly StudioScene[]): string {
  validate(scenes);
  return 'LUQI · 90-second script / podcast outline\nNarration draft only; no audio has been generated.\n\n' + scenes.map((s, i) =>
    `${i * 15}–${(i + 1) * 15}s · ${s.title}\n${s.caption}\nHost / learning question: ${s.question}\n`).join('\n') +
    '\nBefore publication: verify facts and local rules; obtain rights and guest consent; identify opinion, uncertainty and synthetic material. Tax/accounting submissions require a separate authorized workflow and professional review.\n';
}

export function drawStudioFrame(ctx: CanvasRenderingContext2D, width: number, height: number, time: number,
  scenes: readonly StudioScene[], length: number, gravity: number, yaw: number) {
  const s = scenes[sceneAt(time)], portrait = height > width, scale = width / (portrait ? 720 : 1280);
  ctx.save(); ctx.scale(scale, scale);
  const w = width / scale, h = height / scale;
  const background = ctx.createLinearGradient(0, 0, w, h);
  background.addColorStop(0, '#101e19'); background.addColorStop(.6, '#152b24'); background.addColorStop(1, '#071412');
  ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#274339'; ctx.lineWidth = 1;
  for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  // Same original open-Q construction as the public LUQI mark, no images/fonts fetched.
  ctx.save(); ctx.translate(42, 35); ctx.scale(.7, .7); ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.strokeStyle = '#d0eeaa'; ctx.beginPath(); ctx.moveTo(49, 24);
  ctx.bezierCurveTo(45, 12, 32, 8, 21, 14); ctx.bezierCurveTo(10, 20, 8, 34, 14, 44);
  ctx.bezierCurveTo(20, 54, 34, 57, 44, 49); ctx.bezierCurveTo(49, 45, 52, 39, 51, 33); ctx.stroke();
  ctx.strokeStyle = '#e2b66c'; ctx.beginPath(); ctx.moveTo(34, 38); ctx.bezierCurveTo(41, 41, 45, 49, 53, 56); ctx.stroke(); ctx.restore();
  ctx.fillStyle = '#f3f6ee'; ctx.font = '600 25px sans-serif'; ctx.fillText('LUQI AI', 100, 68);
  ctx.fillStyle = '#b4c8b9'; ctx.font = '16px sans-serif'; ctx.fillText('CREATE  /  EXPLAIN  /  UNDERSTAND', 42, 115);
  const textX = 48, textY = portrait ? 195 : 220, textWidth = portrait ? w - 96 : 560;
  function wrap(value: string, maxWidth: number): string[] {
    const lines: string[] = []; let line = '';
    for (const word of value.split(/\s+/)) {
      if (ctx.measureText(line + word).width > maxWidth && line) { lines.push(line.trim()); line = ''; }
      for (const character of word) {
        if (ctx.measureText(line + character).width > maxWidth && line) { lines.push(line.trim()); line = ''; }
        line += character;
      }
      line += ' ';
    }
    if (line) lines.push(line.trim());
    return lines;
  }
  function text(value: string, x: number, y: number, maxWidth: number, font: string, color: string, lineHeight: number) {
    ctx.font = font; ctx.fillStyle = color; const lines = wrap(value, maxWidth);
    lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
    return y + lines.length * lineHeight;
  }
  let titleSize = 48, captionSize = 24;
  for (;;) {
    ctx.font = `600 ${titleSize}px sans-serif`; const titleRows = wrap(s.title, textWidth).length;
    ctx.font = `${captionSize}px sans-serif`; const captionRows = wrap(s.caption, textWidth).length;
    if (textY + titleRows * titleSize * 1.19 + 22 + captionRows * captionSize * 1.5 <= (portrait ? 590 : 540) || titleSize <= 24) break;
    titleSize -= 2; captionSize = Math.max(16, captionSize - 1);
  }
  const endTitle = text(s.title, textX, textY, textWidth, `600 ${titleSize}px sans-serif`, '#f2f6e9', titleSize * 1.19);
  text(s.caption, textX, endTitle + 22, textWidth, `${captionSize}px sans-serif`, '#becfc2', captionSize * 1.5);
  const centerX = portrait ? w / 2 : w * .76, centerY = portrait ? h * .62 : h * .49;
  const unit = portrait ? 100 : 105, originY = 1.6;
  function p(point: readonly number[]) {
    const v = projectPoint(point, yaw + 12 * Math.sin(time / 9));
    return [centerX + v[0] * unit, centerY + (v[1] - originY * .75) * unit];
  }
  function line(a: readonly number[], b: readonly number[], color: string, thickness = 1) {
    const pa = p(a), pb = p(b); ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
  }
  for (let n = -3; n <= 3; n++) {
    line([n, -4.2, -3], [n, -4.2, 3], '#3c5d4f'); line([-3, -4.2, n], [3, -4.2, n], '#3c5d4f');
  }
  line([-2, 0, -.6], [-2, -4.2, -.6], '#6f9680', 4); line([2, 0, -.6], [2, -4.2, -.6], '#6f9680', 4);
  line([-2, 0, -.6], [2, 0, -.6], '#b9d7ad', 5); line([0, 0, -.6], [0, 0, 0], '#b9d7ad', 3);
  for (let n = 15; n > 0; n--) {
    const point = p(pendulumPoint(time - n * .09, length, gravity)); ctx.fillStyle = `rgba(189,227,147,${(16 - n) / 70})`;
    ctx.beginPath(); ctx.arc(point[0], point[1], 8, 0, Math.PI * 2); ctx.fill();
  }
  const bob = pendulumPoint(time, length, gravity); line([0, 0, 0], bob, '#e0eacf', 3);
  const bp = p(bob), ball = ctx.createRadialGradient(bp[0] - 6, bp[1] - 7, 1, bp[0], bp[1], 20);
  ball.addColorStop(0, '#ffdf97'); ball.addColorStop(.6, '#e2b66c'); ball.addColorStop(1, '#92642f');
  ctx.fillStyle = ball; ctx.beginPath(); ctx.arc(bp[0], bp[1], 20, 0, Math.PI * 2); ctx.fill();
  const promptY = h - (portrait ? 235 : 135);
  text(s.question, 48, promptY, w - 96, '20px sans-serif', '#d0eeaa', 29);
  ctx.fillStyle = '#9db6a7'; ctx.font = '15px sans-serif';
  ctx.fillText(`3D small-angle model  ·  L ${length.toFixed(1)} m  ·  T ≈ ${pendulumPeriod(length, gravity).toFixed(2)} s`, 48, h - 74);
  ctx.fillText(`SCENE ${sceneAt(time) + 1} / 6  ·  ${Math.floor(time).toString().padStart(2, '0')} / 90 s  ·  ORIGINAL LUQI MOTION GRAPHICS`, 48, h - 43);
  ctx.fillStyle = '#294c3d'; ctx.fillRect(48, h - 24, w - 96, 3);
  ctx.fillStyle = '#cce9a0'; ctx.fillRect(48, h - 24, (w - 96) * Math.min(1, time / 90), 3);
  ctx.restore();
}
