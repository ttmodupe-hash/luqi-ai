/** Explicit private one-shot; never a web route or startup hook. */
import{acceptBusinessStorage}from'../db/businessAcceptance';
const deadline=setTimeout(()=>{console.error('BUSINESS_ACCEPTANCE_DEADLINE');process.exit(1)},90000);
try{if(process.argv.length!==2)throw Error('BUSINESS_ACCEPTANCE_SCOPE_REJECTED');console.log(JSON.stringify(await acceptBusinessStorage(process.env)));}
catch(e){const message=e instanceof Error?e.message:'';console.error(/^BUSINESS_ACCEPTANCE_[A-Z_]+$/.test(message)?message:'BUSINESS_ACCEPTANCE_UNCONFIRMED');process.exitCode=1;}
finally{clearTimeout(deadline);}
