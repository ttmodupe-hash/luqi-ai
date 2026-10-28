/** Private reviewed operator entrypoint. This is never a web startup command. */
import {prepareFeatureStorage} from '../db/prepareFeatureStorage';
const deadline=setTimeout(()=>{console.error('RELEASE_SETUP_DEADLINE');process.exit(1)},90000);
try{if(process.argv.length!==2)throw Error('RELEASE_SETUP_SCOPE_REJECTED');
 console.log(JSON.stringify(await prepareFeatureStorage(process.env,process.env.LUQI_RELEASE_MIGRATION_DIRECTORY??'db/migrations')));
}catch{console.error('RELEASE_SETUP_UNAVAILABLE');process.exitCode=1}
finally{clearTimeout(deadline)}
