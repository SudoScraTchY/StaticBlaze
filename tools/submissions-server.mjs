#!/usr/bin/env node
// Submission receiver. The one piece that must run somewhere other than static hosting.
//
// This is the reference implementation of the endpoint contract the contact form already speaks, so
// the loop is demonstrable end to end today and deployable the moment a host exists. It has no
// dependencies and no database: it appends one JSON line per submission through the same store the
// review tooling reads.
//
// Contract:
//   POST /submit   JSON {name,email,subject,body,website}
//                  201 {ok:true,id}  |  400 {ok:false,errors[]}
//   GET  /health   200 {ok:true,pending:n}
//
// Privacy: no IP is read or logged, no user agent stored, no cookies, no identifier. The honeypot
// field must be empty. Rejections are counted, never stored.
//
// Usage: node tools/submissions-server.mjs [port]        (default 8787)

import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
const store = join(here, 'submissions.mjs');
const port = Number(process.argv[2] || 8787);
const STORE_FILE = join(here, '..', 'var', 'submissions', 'submissions.jsonl');

let rejected = 0;
let accepted = 0;

const reply = (res, code, payload) => {
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    // the site is static hosting and the receiver lives elsewhere, so the form POST is cross-origin
    // and the browser preflights a JSON content-type. Without these two headers the form can never
    // reach the receiver in production.
    'access-control-allow-origin': process.env.SB_ALLOW_ORIGIN || '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'POST, GET, OPTIONS',
  });
  res.end(JSON.stringify(payload));
};

const pending = () => {
  if (!existsSync(STORE_FILE)) return 0;
  return readFileSync(STORE_FILE, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).length;
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { return reply(res, 204, {}); }
  if (req.url?.startsWith('/health')) {
    return reply(res, 200, { ok: true, accepted, rejected, stored: pending() });
  }
  if (req.method !== 'POST' || !req.url?.startsWith('/submit')) {
    return reply(res, 405, { ok: false, errors: ['use POST /submit'] });
  }

  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 64 * 1024) { rejected++; return reply(res, 413, { ok: false, errors: ['payload too large'] }); }
  }

  let body;
  try { body = JSON.parse(raw || '{}'); } catch { rejected++; return reply(res, 400, { ok: false, errors: ['invalid JSON'] }); }

  // hand the payload to the store, which owns validation so both paths agree
  const child = spawnSync(process.execPath, [store, 'add'], { input: JSON.stringify(body), encoding: 'utf8' });
  if (child.status !== 0) {
    rejected++;
    return reply(res, 400, { ok: false, errors: [String(child.stderr || 'rejected').trim()] });
  }
  accepted++;
  reply(res, 201, { ok: true, id: String(child.stdout).trim() });
}).listen(port, () => {
  console.log(`submission receiver on http://localhost:${port}`);
  console.log(`  POST /submit  -> 201 {ok,id} | 400 {ok,errors}`);
  console.log(`  GET  /health  -> counts`);
  console.log(`  store: ${STORE_FILE}`);
});
