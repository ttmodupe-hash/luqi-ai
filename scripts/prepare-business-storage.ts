/** Private one-off operator CLI. No HTTP server or credentials in output. */
import {prepareBusinessStorage} from '../db/prepareBusinessStorage';
const deadline=setTimeout(()=>{console.error('BUSINESS_SETUP_DEADLINE');process.exit(1)},60000);
try{if(process.argv.length!==2)throw Error('BUSINESS_SETUP_SCOPE_REJECTED');console.log(JSON.stringify(await prepareBusinessStorage(process.env)));}
catch{console.error('BUSINESS_SETUP_UNAVAILABLE');process.exitCode=1;}
finally{clearTimeout(deadline);}
