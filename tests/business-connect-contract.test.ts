import{it,expect}from'vitest';
import{createHash}from'node:crypto';
import{readFileSync}from'node:fs';
import{businessDraft,publicBusiness,type BusinessDraft}from'../contracts/business-connect';
import{businessOperatorSettings}from'../db/prepareBusinessStorage';
import{BUSINESS_CREATE_STATEMENTS}from'../db/businessMigration';
import{BUSINESS_SCHEMA_DIGEST,BUSINESS_RUNTIME_GRANTS}from'../db/businessContracts';
const id='00000000-0000-4000-8000-000000000001';
export const sample:BusinessDraft={name:'Synthetic repair service',category:'trades',description:'A synthetic contract-test business description.',services:['Appliance repairs'],province:'GP',locality:'Mabopane',kind:'service_area',serviceArea:'Mabopane and nearby areas',publicAddress:'',phone:'+27125550123',email:'private@example.com',website:'https://example.com',hours:'By arrangement',pricing:'R100 call-out estimate',languages:['English'],visibility:{phone:true,email:false,website:false,address:false,pricing:false}};
it('public projection contains only approved fields and never claims independent verification',()=>{
 const p=publicBusiness(id,2,sample);expect(p.phone).toBe(sample.phone);for(const field of['email','website','publicAddress','pricing','owner_id','draft','visibility'])expect(p).not.toHaveProperty(field);expect(p.locationReview).toBe('owner_provided');expect(p.contactReview).toBe('not_independently_verified');expect(p.externalMaps).toBe('not_submitted');
});
it('rejects hidden address storage, home pins, injected ownership and dangerous contact links',()=>{
 for(const patch of [{publicAddress:'Home address'},{coordinates:{latitude:-25,longitude:28}},{owner_id:1},{phone:'---------'},{website:'javascript:alert(1)'},{website:'https://user:pass@example.com'},{website:'https://127.0.0.1'},{website:'https://localhost.'},{website:'https://service.internal'}])expect(businessDraft.safeParse({...sample,...patch}).success).toBe(false);
 expect(businessDraft.safeParse({...sample,kind:'public_storefront',publicAddress:'Public trading premises',visibility:{...sample.visibility,address:true}}).success).toBe(true);
});
it('pins additive operator DDL and refuses arbitrary targets or unpinned service identity',()=>{
 expect(createHash('sha256').update(BUSINESS_CREATE_STATEMENTS.join('\n')).digest('hex')).toBe(BUSINESS_SCHEMA_DIGEST);expect(BUSINESS_CREATE_STATEMENTS).toHaveLength(6);expect(Object.keys(BUSINESS_RUNTIME_GRANTS)).toHaveLength(6);
 expect(()=>businessOperatorSettings({DATABASE_URL:'mysql://runtime:password@db.example.com/app',LUQI_DB_OPERATOR_URL:'mysql://root:password@db.example.com/app'})).toThrow('BUSINESS_SETUP_SCOPE_REJECTED');
 expect(()=>businessOperatorSettings({DATABASE_URL:'mysql://luqi_web_runtime:password@mysql.railway.internal/app',LUQI_DB_OPERATOR_URL:'mysql://root:password@mysql.railway.internal/app',RAILWAY_PROJECT_ID:'9f627cb8-3136-4b30-89d2-32ca648a1e5f',RAILWAY_ENVIRONMENT_ID:'1e192ef3-1fa6-4684-81fc-60165c7b0e22',RAILWAY_SERVICE_NAME:'web',RAILWAY_GIT_COMMIT_SHA:'a'.repeat(40),LUQI_DB_CHECK_SOURCE_SHA:'a'.repeat(40)})).toThrow();
});
it('both frontend contracts, private forms and directory implementations stay aligned',()=>{
 expect(readFileSync('contracts/business-connect.ts','utf8')).toBe(readFileSync('app/contracts/business-connect.ts','utf8'));
 for(const file of['lib/business-connect-client.ts','components/BusinessPublicCard.tsx','pages/BusinessConnectPage.tsx','pages/BusinessDirectoryPage.tsx','pages/BusinessReviewPage.tsx'])expect(readFileSync('src/'+file,'utf8')).toBe(readFileSync('app/src/'+file,'utf8'));
 for(const file of['src/pages/BusinessConnectPage.tsx','src/pages/BusinessDirectoryPage.tsx'])expect(readFileSync(file,'utf8')).not.toMatch(/localStorage|sessionStorage|watchPosition|dangerouslySetInnerHTML/);
});
