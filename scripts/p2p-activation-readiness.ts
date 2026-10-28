/**
 * Operator-only, read-only preflight for P2P activation; NEVER changes live
 * flags, secrets, database tables, account roles or private messages.
 */
import {checkP2PReadiness} from '../db/p2pPreflight';

export type ActivationAssessment =
 {status:'blocked';reason:'missing_required_configuration'|'invalid_report_key'|'database_preflight_failed'}
 | {status:'ready_for_two_device_test';note:'database_and_key_preflight_only'};
export function p2pConfigurationIsComplete(env:Record<string,string|undefined>):boolean {
 const key=env.LUQI_P2P_REPORT_KEY??'';
 return /^[A-Za-z0-9_-]{43}$/.test(key) &&
   Buffer.from(key,'base64url').length===32 && !!env.DATABASE_URL;
}
export async function assessP2PActivation(
 env:Record<string,string|undefined>,
 preflight:(environment:Record<string,string|undefined>)=>Promise<void>=checkP2PReadiness,
):Promise<ActivationAssessment>{
 const key=env.LUQI_P2P_REPORT_KEY??'';
 if(!key||!env.DATABASE_URL)return{status:'blocked',reason:'missing_required_configuration'};
 if(!/^[A-Za-z0-9_-]{43}$/.test(key)||Buffer.from(key,'base64url').length!==32)
   return{status:'blocked',reason:'invalid_report_key'};
 try {
   // Only the local preflight environment has enabled=true. This does
   // not stage, deploy, save or mutate any Railway configuration.
   await preflight({...env,LUQI_P2P_ENABLED:'true'});
   return{status:'ready_for_two_device_test',note:'database_and_key_preflight_only'};
 }catch{return{status:'blocked',reason:'database_preflight_failed'};}
}
