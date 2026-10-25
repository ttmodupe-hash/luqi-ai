#!/usr/bin/env node
/** Bounded offline stdin-only release posture reader; never uses credentials. */
import { assessReleaseControlPosture } from './release-control-posture.mjs';

try {
  if (process.argv.length !== 2 || process.stdin.isTTY) throw Error('STDIN_REQUIRED');
  const chunks=[]; let total=0;
  for await(const chunk of process.stdin) {
    total+=Buffer.byteLength(chunk);
    if (total > 5 * 1024) throw Error('INPUT_TOO_LARGE');
    chunks.push(chunk);
  }
  const report=assessReleaseControlPosture(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  // Exit 0 means safe to put before a HUMAN review, NEVER launch approved.
  process.exitCode=report.status==='HUMAN_REVIEW_REQUIRED'?0:2;
} catch {
  process.stderr.write('Release-control observations are missing, invalid or unsafe. No source values echoed.\n');
  process.exitCode=1;
}
