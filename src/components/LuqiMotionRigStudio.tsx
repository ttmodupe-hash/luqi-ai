import { useEffect, useMemo, useRef, useState } from 'react';
import { JOINTS, LUQI_RIGS, MOTIONS, RIG_SECONDS, frameAt, presetMotion, rigSvg, serializeRig,
 type Joint, type MotionId, type RigId } from '../lib/motion-rig';
import '../motion-rig.css';
import LuqiRigVideoRecorder from './LuqiRigVideoRecorder';
import type { StudioAudioAssets } from './StudioAudioPanel';
const labels:Record<Joint,string>={leftArm:'Left arm',rightArm:'Right arm',leftLeg:'Left leg',rightLeg:'Right leg',head:'Head tilt',torso:'Body lean'};
export default function LuqiMotionRigStudio({ audio, disabled, onRecordingChange }: {
 audio: StudioAudioAssets; disabled: boolean; onRecordingChange: (active: boolean) => void;
}) {
 const [rig,setRig]=useState<RigId>('scholar'),[action,setAction]=useState<MotionId>('wave');
 const [frames,setFrames]=useState(()=>presetMotion('wave'));
 const [selected,setSelected]=useState(0),[time,setTime]=useState(0),[playing,setPlaying]=useState(false);
 const [title,setTitle]=useState('Luqi original character motion'),[notice,setNotice]=useState('');
 const raf=useRef<number|null>(null);
 const current=useMemo(()=>frameAt(frames,time),[frames,time]),palette=LUQI_RIGS[rig];
 useEffect(()=>{
  if(!playing)return;
  let last:number|null=null;
  const tick=(now:number)=>{
    if(last!==null)setTime(t=>(t+(now-last!)/1000)%RIG_SECONDS);
    last=now;raf.current=requestAnimationFrame(tick);
  };
  raf.current=requestAnimationFrame(tick);
  return ()=>{if(raf.current!==null)cancelAnimationFrame(raf.current);raf.current=null;};
 },[playing]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)setPlaying(false);};
  document.addEventListener('visibilitychange',hide);
  return ()=>document.removeEventListener('visibilitychange',hide);
 },[]);
 function choose(a:MotionId){if(disabled)return;setPlaying(false);setAction(a);setFrames(presetMotion(a));setSelected(0);setTime(0);setNotice('');}
 function change(j:Joint,v:number){
  if(disabled)return;
  setPlaying(false);setTime(selected);
  setFrames(old=>old.map((f,i)=>i===selected?{...f,pose:{...f.pose,[j]:v}}:f));setNotice('');
 }
 function download(filename:string,mime:string,data:string){
  let link:string|undefined;
  try{
   link=URL.createObjectURL(new Blob([data],{type:mime}));
   const a=document.createElement('a');a.href=link;a.download=filename;a.click();
   setNotice('Downloaded locally. Review before publishing.');
  }catch{setNotice('Download unavailable in this browser. Your keyframes remain here.');}
  finally{if(link)window.setTimeout(()=>URL.revokeObjectURL(link!),1000);}
 }
 const pose=frames[selected].pose;
 return <section className="luqi-motion-rig" aria-label="Luqi Motion Studio">
  <header>
   <p>LUQI MOTION STUDIO · ON-DEVICE KEYFRAMES</p>
   <h2>Build original character motion</h2>
   <p>Pose six joints, change keyframes, preview smooth movement, and save a reusable vector frame or motion project. No additional account, API key, or paid AI call.</p>
  </header>
  <div className="luqi-motion-layout">
   <div className="luqi-motion-stage">
    <svg viewBox="0 0 640 360" role="img" aria-label={'Live 2D rig preview: '+palette.name}>
     <title>Luqi vector character rig</title>
     <rect width="640" height="360" fill={palette.backdrop}/>
     <path d="M0 305 H640" stroke={palette.accent} strokeOpacity=".7" strokeWidth="3"/>
     <circle cx="320" cy="150" r="125" fill="none" stroke={palette.accent} strokeOpacity=".2" strokeWidth="2"/>
     <g transform={`rotate(${current.torso} 320 165)`}>
      <g transform={`translate(302 232) rotate(${current.leftLeg})`}><rect x="-12" width="24" height="90" rx="12" fill="#243448"/></g>
      <g transform={`translate(338 232) rotate(${current.rightLeg})`}><rect x="-12" width="24" height="90" rx="12" fill="#243448"/></g>
      <rect x="283" y="145" width="74" height="96" rx="23" fill={palette.coat}/>
      <g transform={`translate(283 160) rotate(${current.leftArm})`}><rect x="-12" width="24" height="98" rx="12" fill={palette.skin}/><circle cy="96" r="12" fill={palette.skin}/></g>
      <g transform={`translate(357 160) rotate(${current.rightArm})`}><rect x="-12" width="24" height="98" rx="12" fill={palette.skin}/><circle cy="96" r="12" fill={palette.skin}/></g>
      <g transform={`rotate(${current.head} 320 116)`}><circle cx="320" cy="110" r="40" fill={palette.skin}/>
       <path d="M282 97 Q285 55 320 69 Q355 55 359 97" fill="#22272C"/>
       <circle cx="307" cy="114" r="4" fill="#22272C"/><circle cx="333" cy="114" r="4" fill="#22272C"/>
       <path d="M308 132 Q320 143 333 132" stroke="#493124" fill="none" strokeWidth="3" strokeLinecap="round"/></g>
     </g>
     <text x="20" y="336" fontSize="16" fontFamily="sans-serif" fill="#fff">{title}</text>
    </svg>
    <label>Preview time · {time.toFixed(2)} s
      <input aria-label="Motion timeline" disabled={disabled} type="range" min="0" max={RIG_SECONDS} step=".05" value={time} onChange={e=>{setPlaying(false);setTime(Number(e.target.value));}}/>
    </label>
    <div className="luqi-motion-buttons">
     <button type="button" disabled={disabled} aria-pressed={playing} onClick={()=>setPlaying(v=>!v)}>{playing?'Pause rig preview':'Play rig preview'}</button>
     <button type="button" disabled={disabled} onClick={()=>choose(action)}>Reset keyframes</button>
    </div>
    <p role="status" aria-live="polite">{notice||'This is a genuine, locally rendered 2D vector rig; not an AI-created film.'}</p>
   </div>
   <div className="luqi-motion-controls">
    <div className="luqi-motion-grid">
     <label>Character template
      <select aria-label="Motion character" disabled={disabled} value={rig} onChange={e=>setRig(e.target.value as RigId)}>
       {Object.entries(LUQI_RIGS).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}
      </select>
     </label>
     <label>Motion preset
      <select aria-label="Motion preset" disabled={disabled} value={action} onChange={e=>choose(e.target.value as MotionId)}>
       {MOTIONS.map(m=><option value={m} key={m}>{m==='wave'?'Wave':m==='type'?'Typing':'Walking'}</option>)}
      </select>
     </label>
    </div>
    <fieldset>
     <legend>Selected keyframe: {selected} s</legend>
     <div className="luqi-motion-keys" role="group" aria-label="Motion keyframes">
       {frames.map((f,i)=><button type="button" disabled={disabled} aria-pressed={selected===i} key={f.time} onClick={()=>{setPlaying(false);setSelected(i);setTime(i);}}>{i} s</button>)}
     </div>
     <div className="luqi-motion-grid">
      {JOINTS.map(j=><label key={j}>{labels[j]} · {pose[j]}°
       <input aria-label={'Motion '+labels[j]} disabled={disabled} type="range" min="-160" max="160" step="1" value={pose[j]} onChange={e=>change(j,Number(e.target.value))}/>
      </label>)}
     </div>
    </fieldset>
    <label>Artwork title
      <input aria-label="Motion artwork title" disabled={disabled} maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/>
    </label>
    <div className="luqi-motion-buttons">
     <button type="button" disabled={disabled} onClick={()=>{try{download('luqi-motion-frame.svg','image/svg+xml',rigSvg(rig,title,current));}catch(e){setNotice(e instanceof Error?e.message:'Invalid SVG');}}}>Download SVG frame</button>
     <button type="button" disabled={disabled} onClick={()=>{try{download('luqi-motion-project.json','application/json',serializeRig(rig,action,title,frames));}catch(e){setNotice(e instanceof Error?e.message:'Invalid rig');}}}>Download rig keyframes (JSON)</button>
    </div>
   </div>
  </div>
  <LuqiRigVideoRecorder rig={rig} frames={frames} title={title} audio={audio}
    disabled={disabled} onRecordingChange={active => { if(active) setPlaying(false); onRecordingChange(active); }} />
  <p className="luqi-motion-note">SVG saves a vector frame, JSON saves the keyframes. The character recorder creates a real four-second video of the moving rig, with selected sound when supported. The six-scene storyboard remains a separate editor above.</p>
 </section>;
}
