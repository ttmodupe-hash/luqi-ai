/// <reference lib="webworker" />
import { runPqcLabSelfTest } from './pqc-lab';
const worker = self as unknown as DedicatedWorkerGlobalScope;
let running = false;
worker.onmessage = async event => {
  // A fixed command only: no uploaded records, seeds, keys or arbitrary payloads.
  if (running || event.data !== 'RUN_PUBLIC_SELF_TEST') return;
  running = true;
  try { worker.postMessage({ ok: true, result: await runPqcLabSelfTest() }); }
  catch { worker.postMessage({ ok: false }); }
  finally { worker.close(); }
};
