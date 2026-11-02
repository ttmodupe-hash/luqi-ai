import{test,expect}from'@playwright/test';
import{acceptBusinessStorage,BUSINESS_ACCEPTANCE_INTENT}from'../db/businessAcceptance';
test('private one-off acceptance verifies actual HTTP/storage and cleans only its synthetic account',async({request})=>{
 const adapter:typeof fetch=async(input,init)=>{const response=await request.fetch(String(input),{method:init?.method??'GET',headers:Object.fromEntries(new Headers(init?.headers).entries()),...(init?.body?{data:JSON.parse(String(init.body))}:{}),timeout:12000,maxRedirects:0,failOnStatusCode:false});return new Response(await response.body(),{status:response.status(),headers:response.headers()});};
 const result=await acceptBusinessStorage({DATABASE_URL:'mysql://luqi_business_fixture:business-fixture-only-password@127.0.0.1:3306/luqi_ci',LUQI_DB_OPERATOR_URL:'mysql://root:ci-ephemeral-only-password@127.0.0.1:3306/luqi_ci',GITHUB_ACTIONS:'true',LUQI_MYSQL_CI_FIXTURE:'true',LUQI_BUSINESS_ACCEPTANCE_INTENT:BUSINESS_ACCEPTANCE_INTENT},adapter);
 expect(result).toMatchObject({passed:true,publicProfilesCreated:0,publicationRequested:false,syntheticAccountRemoved:true,removedAccountRejected:true,aiRequests:0});
});
