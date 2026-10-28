/** Explicit operator invocation only, never imported by the web server. */
import 'dotenv/config';
import {assessP2PActivation} from './p2p-activation-readiness';
const result=await assessP2PActivation(process.env);
if(result.status==='blocked'){
 console.error('Luqi Circles activation BLOCKED: '+result.reason+
   '. Leave LUQI_P2P_ENABLED disabled; review docs/luqi-p2p-activation.md.');
 process.exitCode=1;
}else{
 console.log('Read-only P2P preflight passed. Still requires moderation sign-off, verified roles and two-device acceptance. No live flag changed.');
}
