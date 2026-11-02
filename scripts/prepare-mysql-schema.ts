/** Operator-only additive schema command. Never imported by the web runtime. */
import { bootstrapDatabase } from '../db/bootstrap';
import { checkRuntimeSchema } from '../db/runtimeSchema';

const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && !['--check', '--apply', '--help'].includes(args[0]))) {
  console.error('Usage: prepare-mysql-schema [--check|--apply|--help]');
  process.exitCode = 1;
} else if (args[0] === '--help') {
  console.log('Default: read-only runtime schema check. --apply explicitly creates missing base tables; no seeds or ALTERs.');
} else {
  try {
    if (args[0] === '--apply') await bootstrapDatabase();
    const result = await checkRuntimeSchema();
    if (result.status !== 'validated') throw new Error('DATABASE_REQUIRED');
    console.log(`[Database] Validated ${result.tables} runtime tables without schema writes`);
  } catch {
    console.error('[Database] Schema command failed; inspect configuration, permissions and schema privately (details redacted).');
    process.exitCode = 1;
  }
}
