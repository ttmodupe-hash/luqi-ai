/// <reference lib="webworker" />
import { createLocalArchive, openLocalArchive } from './archive-crypto';
import { exactKeys, validateDocument, validatePassphrase } from './archive-contract';
const worker = self as unknown as DedicatedWorkerGlobalScope;
let running = false;
worker.onmessage = async event => {
  if (running) return;
  running = true;
  try {
    const command = event.data;
    if (command?.kind === 'seal') {
      exactKeys(command,['kind','document','passphrase']);validatePassphrase(command.passphrase);
      worker.postMessage({ok:true,kind:'sealed',result:await createLocalArchive(validateDocument(command.document),command.passphrase)});
    } else if (command?.kind === 'open') {
      exactKeys(command,['kind','envelope','recoveryFile','passphrase']);validatePassphrase(command.passphrase);
      worker.postMessage({ok:true,kind:'opened',result:await openLocalArchive(command.envelope,command.recoveryFile,command.passphrase)});
    } else throw new Error('UNSUPPORTED_COMMAND');
  } catch { worker.postMessage({ok:false}); }
  finally { worker.close(); }
};
