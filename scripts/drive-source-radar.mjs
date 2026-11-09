#!/usr/bin/env node
/** Explicit operator command. No scheduler, model calls, identity, GPS or automatic publishing. */
import {open,readFile,writeFile,rename,unlink,mkdir,lstat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const args=process.argv.slice(2);
if(args.some(a=>a!=='--fetch')||args.length>1){console.error('Use no arguments to plan, or --fetch with explicit operator approval.');process.exitCode=2;}
else {
 let lock=null,tmp='';
 try {
  const build=process.env.LUQI_DRIVE_RADAR_BUILD_DIR;if(!build)throw new Error('BUILD_REQUIRED');
  const {cleanDriveState,planDriveChecks,runDriveRadarOnce}=await import(pathToFileURL(resolve(build,'api/services/drive-source-radar.js')).href);
  const dir=resolve(process.env.LUQI_DRIVE_RADAR_STATE_DIR||'.luqi-drive-radar');
  const fetchRequested=args.includes('--fetch');
  if(fetchRequested&&process.env.LUQI_DRIVE_SOURCE_FETCH_APPROVED!=='true')throw new Error('FETCH_NOT_APPROVED');
  await mkdir(dir,{recursive:true,mode:0o700});
  const lockPath=join(dir,'operator.lock'),statePath=join(dir,'state.json');
  lock=await open(lockPath,'wx',0o600);
  let state={version:1,lastAttempt:{},lastGood:{}};
  try{const stat=await lstat(statePath);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>32768)throw new Error('INVALID_STATE');state=cleanDriveState(JSON.parse(await readFile(statePath,'utf8')));}
  catch(e){if(e?.code!=='ENOENT')throw e;}
  if(!fetchRequested)console.log(JSON.stringify({mode:'plan-only',sourceIds:planDriveChecks(state),networkRequests:0}));
  else {
   const result=await runDriveRadarOnce(state);
   tmp=join(dir,'state.'+process.pid+'.tmp');
   await writeFile(tmp,JSON.stringify(result.state,null,2),{flag:'wx',mode:0o600});await rename(tmp,statePath);tmp='';
   console.log(JSON.stringify({scope:result.scope,observations:result.observations}));
  }
  await lock.close();lock=null;await unlink(lockPath);
 }catch {console.error('DRIVE_RADAR_UNAVAILABLE: check build, approval, state and operator lock. No live-condition verdict was produced.');process.exitCode=1;}
 finally {
  if(tmp)try{await unlink(tmp);}catch{/* no temp */}
  if(lock){await lock.close().catch(()=>{});const dir=resolve(process.env.LUQI_DRIVE_RADAR_STATE_DIR||'.luqi-drive-radar');await unlink(join(dir,'operator.lock')).catch(()=>{});}
 }
}
