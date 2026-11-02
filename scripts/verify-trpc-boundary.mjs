// Read-only/fail-closed checks: no real account, upload, provider or DB mutation.
const base = process.argv[2] || 'http://127.0.0.1:8765';
async function probe(path, status, message, options = {}) {
  const response = await fetch(base + '/api/trpc/' + path, {
    ...options, signal: AbortSignal.timeout(15000), redirect: 'error',
  });
  const text = await response.text();
  if (response.status !== status || response.headers.get('cache-control') !== 'no-store' ||
      !text.includes(message)) throw new Error('tRPC boundary failed: ' + path);
  console.log(path + ': ' + status + ', no-store, expected response');
}
await probe('ping', 200, '"ok":true');
await probe('archive.listThreads', 503, 'TRPC_PROCEDURE_UNAVAILABLE');
await probe('archive.archiveArtifact', 503, 'TRPC_PROCEDURE_UNAVAILABLE', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"json":{}}',
});
await probe('knowledge.saveArticle', 503, 'TRPC_PROCEDURE_UNAVAILABLE', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"json":{}}',
});
await probe('search.web', 503, 'TRPC_PROCEDURE_UNAVAILABLE');
await probe('offline.getPending', 401, 'AUTH_REQUIRED');
await probe('offline.markSynced', 401, 'AUTH_REQUIRED', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"json":{}}',
});
await probe('ping%2Carchive%2ElistThreads?batch=1', 207, 'TRPC_PROCEDURE_UNAVAILABLE');
