/** Private operator CLI, never a startup hook or HTTP endpoint. */
import { prepareRuntimeRole } from '../db/runtimeRole';
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--check', '--provision-new', '--help'].includes(args[0]))) {
  console.error('Usage: prepare-mysql-runtime-role [--check|--provision-new|--help]');
  process.exitCode = 1;
} else if (args[0] === '--help') {
  console.log('Default: read-only grant/schema check. --provision-new explicitly creates a new table-restricted web identity; never alters an existing identity.');
} else {
  try { console.log(JSON.stringify(await prepareRuntimeRole(process.env, args[0] === '--provision-new'))); }
  catch { console.error('[Database] Runtime role preparation failed (details redacted).'); process.exitCode = 1; }
}
