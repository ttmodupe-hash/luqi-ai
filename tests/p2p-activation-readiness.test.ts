import {describe,it,expect,vi} from 'vitest';
import {assessP2PActivation,p2pConfigurationIsComplete} from '../scripts/p2p-activation-readiness';
const key=Buffer.alloc(32,9).toString('base64url');
describe('P2P activation requires verified prerequisites',()=>{
 it('blocks missing configuration without touching any DB',async()=>{
   const preflight=vi.fn(async()=>{throw Error('unreachable');});
   expect(await assessP2PActivation({},preflight)).toEqual({status:'blocked',reason:'missing_required_configuration'});
   expect(await assessP2PActivation({DATABASE_URL:'private'},preflight)).toMatchObject({status:'blocked'});
   expect(preflight).not.toHaveBeenCalled();
 });
 it('rejects invalid report key without generating or exposing a new one',async()=>{
   const preflight=vi.fn(async()=>{});
   const status=await assessP2PActivation({DATABASE_URL:'private',LUQI_P2P_REPORT_KEY:'invalid-secret'},preflight);
   expect(status).toEqual({status:'blocked',reason:'invalid_report_key'});
   expect(JSON.stringify(status)).not.toMatch(/invalid-secret|private/);
   expect(preflight).not.toHaveBeenCalled();
 });
 it('insists on production-schema preflight even with a plausible key',async()=>{
   const preflight=vi.fn(async e=>{
     expect(e.LUQI_P2P_ENABLED).toBe('true');throw new Error('tables are not installed');
   });
   const env={DATABASE_URL:'private',LUQI_P2P_REPORT_KEY:key};
   expect(p2pConfigurationIsComplete(env)).toBe(true);
   expect(await assessP2PActivation(env,preflight)).toEqual({status:'blocked',reason:'database_preflight_failed'});
 });
 it('successful read-only checks do not imply enabled messaging or verified people',async()=>{
   const preflight=vi.fn(async()=>{});
   const state=await assessP2PActivation({DATABASE_URL:'private',LUQI_P2P_REPORT_KEY:key},preflight);
   expect(state).toEqual({status:'ready_for_two_device_test',note:'database_and_key_preflight_only'});
   expect(preflight).toHaveBeenCalledOnce();
 });
});
