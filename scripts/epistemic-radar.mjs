#!/usr/bin/env node
/** Operator CLI. Default is a plan; explicit --fetch performs fixed public GETs only.
 * Compile the two TS modules to a disposable directory; pass its path as --build.
 * No secrets, shell, provider API, auto-scheduler or claim publication.
 */
import { readFile, open, rename, unlink, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const args=process.argv.slice(2);
function argument(name){const i=args.indexOf(name);return i<0?null:args[i+1];}
let lock,temporary; let ownsLock=false;
try {
  if(args.some((a,i)=>a.startsWith('--')&&!['--build','--state','--fetch'].includes(a)))throw new Error('Unknown option');
  const build=argument('--build'),statePath=argument('--state');
  if(!build||!statePath)throw new Error('Usage: node scripts/epistemic-radar.mjs --build COMPILED_DIRECTORY --state STATE_JSON [--fetch]');
  const {runRadarOnce,dueSources,validateRadarState}=await import(pathToFileURL(path.resolve(build,'epistemic-probe.js')).href);
  const target=path.resolve(statePath);await mkdir(path.dirname(target),{recursive:true});
  let state={version:1,lastAttempt:{},lastSuccess:{}};
  if(!args.includes('--fetch')){
    try{state=validateRadarState(JSON.parse(await readFile(target,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
    console.log(JSON.stringify({mode:'plan_only',dueSourceIds:dueSources(state,new Date().toISOString()),networkRequests:0,promotionEnabled:false}));
  } else {
    // One process for this state path. Do not automatically remove an old lock: an operator must reconcile a crashed run.
    lock=target+'.lock';await open(lock,'wx',0o600).then(h=>h.close());ownsLock=true;
    try{state=validateRadarState(JSON.parse(await readFile(target,'utf8')));}catch(e){if(e.code!=='ENOENT')throw e;}
    const report=await runRadarOnce(state);
    temporary=target+'.'+process.pid+'.tmp';
    const handle=await open(temporary,'wx',0o600);
    try{await handle.writeFile(JSON.stringify(report.state));await handle.sync();}finally{await handle.close();}
    await rename(temporary,target);temporary=undefined;
    console.log(JSON.stringify({mode:'fingerprint_only',promotionEnabled:false,observations:report.observations,reportDigest:report.reportDigest}));
  }
}catch(e){console.error(e instanceof Error && e.message.startsWith('Usage:')?e.message:'EPISTEMIC_RADAR_UNAVAILABLE');process.exitCode=1;}
finally{
  if(temporary)await unlink(temporary).catch(()=>{});
  if(ownsLock && lock)await unlink(lock).catch(()=>{});
}
