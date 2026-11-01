/** LUQI Motion Studio: locally animated original 2D character rigs, not 3D or AI video. */
export const RIG_SECONDS=4;
export const LUQI_RIGS={
 scholar:{name:'Luqi Scholar',skin:'#9B633E',coat:'#38685C',backdrop:'#183D31',accent:'#B8E9D4'},
 engineer:{name:'Luqi Network Engineer',skin:'#BE8A61',coat:'#3C67AD',backdrop:'#142B4B',accent:'#BBD8FF'},
 storyteller:{name:'Luqi Storyteller',skin:'#815437',coat:'#A06C4B',backdrop:'#41303C',accent:'#F7DCAA'},
} as const;
export type RigId=keyof typeof LUQI_RIGS;
export const MOTIONS=['wave','type','walk'] as const;
export type MotionId=typeof MOTIONS[number];
export const JOINTS=['leftArm','rightArm','leftLeg','rightLeg','head','torso'] as const;
export type Joint=typeof JOINTS[number];
export type Pose=Record<Joint,number>;
export type Keyframe={time:number;pose:Pose};
const Z:Pose={leftArm:0,rightArm:0,leftLeg:0,rightLeg:0,head:0,torso:0};
const pose=(v:Partial<Pose>):Pose=>({...Z,...v});
export function presetMotion(name:MotionId):Keyframe[]{
 const scenes:Record<MotionId,Pose[]>={
  wave:[pose({rightArm:-115}),pose({rightArm:-155,head:8}),pose({rightArm:-115,head:-8}),pose({rightArm:-155,head:8}),pose({rightArm:-115})],
  type:[pose({leftArm:-62,rightArm:62,head:8}),pose({leftArm:-48,rightArm:44,head:10}),pose({leftArm:-66,rightArm:68,head:8}),pose({leftArm:-49,rightArm:50,head:10}),pose({leftArm:-62,rightArm:62,head:8})],
  walk:[pose({leftArm:25,rightArm:-25,leftLeg:-24,rightLeg:24}),pose({}),pose({leftArm:-25,rightArm:25,leftLeg:24,rightLeg:-24}),pose({}),pose({leftArm:25,rightArm:-25,leftLeg:-24,rightLeg:24})],
 };
 return scenes[name].map((p,index)=>({time:index,pose:{...p}}));
}
export function validKeyframes(frames:readonly Keyframe[]):boolean{
 return Array.isArray(frames)&&frames.length===5&&frames.every((f,i)=>f?.time===i&&f.pose&&JOINTS.every(k=>Number.isFinite(f.pose[k])&&Math.abs(f.pose[k])<=160));
}
export function frameAt(frames:readonly Keyframe[],seconds:number):Pose{
 if(!validKeyframes(frames)||!Number.isFinite(seconds))throw Error('Invalid keyframes or timeline');
 const value=Math.min(RIG_SECONDS,Math.max(0,seconds)),i=Math.min(3,Math.floor(value));
 const t=value-i, eased=t*t*(3-2*t), from=frames[i].pose,to=frames[i+1].pose;
 return Object.fromEntries(JOINTS.map(j=>[j,from[j]+(to[j]-from[j])*eased])) as Pose;
}
function safeTitle(s:string):string{
 if(typeof s!=='string'||s.trim().length===0||s.length>80)throw Error('Use an artwork title of 1–80 characters.');
 return s.trim();
}
function esc(s:string):string{return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
const n=(v:number)=>v.toFixed(2);
export function serializeRig(id:RigId,motion:MotionId,title:string,frames:readonly Keyframe[]):string{
 if(!Object.hasOwn(LUQI_RIGS,id)||!MOTIONS.includes(motion)||!validKeyframes(frames))throw Error('Invalid rig project');
 return JSON.stringify({format:'luqi.motion-rig.v1',title:safeTitle(title),template:id,action:motion,durationSeconds:RIG_SECONDS,mode:'local_2d_vector_keyframes',mediaFileIncluded:false,frames},null,2);
}
/** Script-free, self-contained snapshot; no assets or dynamic SVG element injection. */
export function rigSvg(id:RigId,title:string,p:Pose):string{
 if(!Object.hasOwn(LUQI_RIGS,id)||JOINTS.some(j=>!Number.isFinite(p[j])||Math.abs(p[j])>160))throw Error('Invalid rig pose');
 const c=LUQI_RIGS[id],label=esc(safeTitle(title));
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><title>${label}</title>
 <rect width="640" height="360" fill="${c.backdrop}"/>
 <path d="M0 305 H640" stroke="${c.accent}" opacity=".7" stroke-width="3"/>
 <circle cx="320" cy="150" r="125" stroke="${c.accent}" opacity=".2" fill="none" stroke-width="2"/>
 <g transform="rotate(${n(p.torso)} 320 165)">
 <g transform="translate(302 232) rotate(${n(p.leftLeg)})"><rect x="-12" width="24" height="90" rx="12" fill="#243448"/></g>
 <g transform="translate(338 232) rotate(${n(p.rightLeg)})"><rect x="-12" width="24" height="90" rx="12" fill="#243448"/></g>
 <rect x="283" y="145" width="74" height="96" rx="23" fill="${c.coat}"/>
 <g transform="translate(283 160) rotate(${n(p.leftArm)})"><rect x="-12" width="24" height="98" rx="12" fill="${c.skin}"/><circle cy="96" r="12" fill="${c.skin}"/></g>
 <g transform="translate(357 160) rotate(${n(p.rightArm)})"><rect x="-12" width="24" height="98" rx="12" fill="${c.skin}"/><circle cy="96" r="12" fill="${c.skin}"/></g>
 <g transform="rotate(${n(p.head)} 320 116)"><circle cx="320" cy="110" r="40" fill="${c.skin}"/>
 <path d="M282 97 Q285 55 320 69 Q355 55 359 97" fill="#22272C"/>
 <circle cx="307" cy="114" r="4" fill="#22272C"/><circle cx="333" cy="114" r="4" fill="#22272C"/>
 <path d="M308 132 Q320 143 333 132" stroke="#493124" fill="none" stroke-width="3" stroke-linecap="round"/></g></g>
 <text x="20" y="336" font-family="sans-serif" font-size="16" fill="#fff">${label}</text></svg>`;
}
