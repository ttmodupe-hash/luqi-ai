import { createServer } from 'node:http';

// Disposable, loopback-only foreign origin for browser framing tests. No
// caller-selected URLs, filesystem access, accounts, database or provider keys.
const appOrigin = 'http://127.0.0.1:4386';
const targets = {
  '/lab': `${appOrigin}/labs/algebra_lab.html`,
  '/account': `${appOrigin}/#/login`,
};
createServer((req, res) => {
  const target = targets[req.url];
  if (!target) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Foreign embedding test</title><body><h1>Foreign embedding test</h1><iframe id="target" title="Test frame" src="${target}"></iframe></body></html>`);
}).listen(4387, '127.0.0.1');
