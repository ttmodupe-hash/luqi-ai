import {describe,it,expect} from 'vitest';
import {LUQI_RIGS,MOTIONS,RIG_SECONDS,JOINTS,presetMotion,validKeyframes,frameAt,rigSvg,serializeRig} from '../src/lib/motion-rig';
describe('Luqi Motion Studio local rigging',()=>{
 it('offers original rigs and distinct editable wave, typing and walking poses',()=>{
  expect(Object.keys(LUQI_RIGS)).toHaveLength(3);
  for(const a of MOTIONS){const frames=presetMotion(a);expect(validKeyframes(frames)).toBe(true);expect(frames[0].pose).toEqual(frames[4].pose);}
  expect(presetMotion('wave')[0].pose.rightArm).not.toBe(presetMotion('walk')[0].pose.rightArm);
 });
 it('interpolates smoothly and rejects invalid timeline or out-of-range joints',()=>{
  const frames=presetMotion('wave');
  expect(frameAt(frames,0)).toEqual(frames[0].pose);
  expect(frameAt(frames,RIG_SECONDS)).toEqual(frames[4].pose);
  expect(frameAt(frames,-10)).toEqual(frames[0].pose);
  const halfway=frameAt(frames,.5).rightArm;
  expect(halfway).toBeGreaterThan(-155);expect(halfway).toBeLessThan(-115);
  expect(()=>frameAt(frames,NaN)).toThrow();
  frames[1].pose.leftLeg=Infinity;
  expect(validKeyframes(frames)).toBe(false);
  expect(()=>serializeRig('scholar','wave','Lesson',frames)).toThrow();
 });
 it('escapes SVG titles and serializes real keyframes without fabricated video',()=>{
  const f=presetMotion('type');
  const project=JSON.parse(serializeRig('engineer','type','Network lesson',f));
  expect(project.format).toBe('luqi.motion-rig.v1');
  expect(project.mediaFileIncluded).toBe(false);
  expect(project.frames).toHaveLength(5);
  const image=rigSvg('scholar','A <script> & "B"',frameAt(f,2));
  expect(image).toContain('&lt;script&gt;');expect(image).not.toContain('<script>');
  expect(image).not.toMatch(/<script|<foreignObject|xlink:href/i);
  expect(()=>rigSvg('scholar','',frameAt(f,0))).toThrow();
  expect(JOINTS).toHaveLength(6);
 });
});
