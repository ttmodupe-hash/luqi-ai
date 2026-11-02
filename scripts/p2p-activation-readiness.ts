/**
 * Operator-only, read-only preflight for P2P activation; NEVER changes live
 * flags, secrets, database tables, account roles or private messages.
 */
import {checkP2PReadiness} from '../db/p2pPreflight';
import {checkP2POperatorTestCohort,type P2PCohortSafety} from './p2p-operator-audit';

export type ActivationAssessment =
 {status:'blocked';reason:'missing_required_configuration'|'invalid_report_key'|'database_preflight_failed'|'moderator_not_ready'|'test_pair_not_ready'|'operator_audit_unavailable'}
 | {status:'ready_for_two_device_test';note:'database_and_key_preflight_only'};
export function p2pConfigurationIsComplete(env:Record<string,string|undefined>):boolean {
 const key=env.LUQI_P2P_REPORT_KEY??'';
 return /^[A-Za-z0-9_-]{43}$/.test(key) &&
   Buffer.from(key,'base64url').length===32 && !!env.DATABASE_URL;
}
export async function assessP2PActivation(
 env:Record<string,string|undefined>,
 preflight:(environment:Record<string,string|undefined>)=>Promise<void>=checkP2PReadiness,
 cohortAudit:(environment:Record<string,string|undefined>)=>Promise<P2PCohortSafety>=checkP2POperatorTestCohort,
):Promise<ActivationAssessment>{
 const key=env.LUQI_P2P_REPORT_KEY??'';
 if(!key||!env.DATABASE_URL)return{status:'blocked',reason:'missing_required_configuration'};
 if(!/^[A-Za-z0-9_-]{43}$/.test(key)||Buffer.from(key,'base64url').length!==32)
   return{status:'blocked',reason:'invalid_report_key'};
 try {
   // Only the local preflight environment has enabled=true. This does
   // not stage, deploy, save or mutate any Railway configuration.
   await preflight({...env,LUQI_P2P_ENABLED:'true'});
 }catch{return{status:'blocked',reason:'database_preflight_failed'};}
 let cohort:P2PCohortSafety;
 try{cohort=await cohortAudit({...env,LUQI_P2P_ENABLED:'true'});}
 catch{return{status:'blocked',reason:'operator_audit_unavailable'};}
 if(!cohort.moderatorPresent)return{status:'blocked',reason:'moderator_not_ready'};
 if(!cohort.mutualTestPairPresent)return{status:'blocked',reason:'test_pair_not_ready'};
 // Only operator/database prerequisites are confirmed; NOT privacy, real age,
 // tested messaging or production rollout. Never flip a feature flag here.
 return{status:'ready_for_two_device_test',note:'database_and_key_preflight_only'};
}
