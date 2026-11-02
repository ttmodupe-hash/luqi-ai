/** Private one-shot entrypoint. No web server, writes, provider or payment client. */
import {inspectReleaseDatabase} from '../db/releaseInspection';
const deadline=setTimeout(()=>{console.error('RELEASE_INSPECTION_DEADLINE');process.exit(1)},45000);
try{if(process.argv.length!==2)throw Error('RELEASE_INSPECTION_SCOPE_REJECTED');
  console.log(JSON.stringify(await inspectReleaseDatabase(process.env)));
}catch{console.error('RELEASE_INSPECTION_UNAVAILABLE');process.exitCode=1}
finally{clearTimeout(deadline)}
