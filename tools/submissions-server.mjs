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
// Guards beyond validation:
//   - rate limit: 5 accepted-or-attempted submissions per 10 minutes per client, tracked in memory
//     against a per-process salted hash of the remote address. The address itself is never logged,
//     never stored, and the hash cannot be correlated across restarts (the salt is random per run).
//   - honeypot: the "website" field must be empty (enforced by the store).
//   - notification: set SB_WEBHOOK_URL to POST accepted submissions onward (Slack/Discord/anything).
//
// Usage: node tools/submissions-server.mjs [port]        (default 8787)

import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const store = join(here, 'submissions.mjs');
const port = Number(process.argv[2] || 8787);
const STORE_FILE = join(here, '..', 'var', 'submissions', 'submissions.jsonl');

let rejected = 0;
let accepted = 0;

// ---- rate limiting -------------------------------------------------------
// Sliding window per client, keyed by a one-way hash so the address itself is neither stored nor
// logged. The salt is random per process: two runs cannot be joined by comparing hashes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const SALT = randomBytes(16);
const attempts = new Map(); // hash -> [timestamps]

const clientKey = (req) => {
  const addr = req.socket?.remoteAddress || 'unknown';
  return createHash('sha256').update(SALT).update(addr).digest('hex').slice(0, 16);
};

const rateLimited = (req) => {
  const key = clientKey(req);
  const now = Date.now();
  const list = (attempts.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_WINDOW) {
    attempts.set(key, list);
    return Math.ceil((WINDOW_MS - (now - list[0])) / 1000);
  }
  list.push(now);
  attempts.set(key, list);
  // opportunistic cleanup so the map cannot grow forever
  if (attempts.size > 5000) {
    for (const [k, v] of attempts) if (!v.some((t) => now - t < WINDOW_MS)) attempts.delete(k);
  }
  return 0;
};

// ---- notification --------------------------------------------------------
// Fire-and-forget. A failing webhook must never turn an accepted submission into an error.
const notify = (id, payload) => {
  const url = process.env.SB_WEBHOOK_URL;
  if (!url) return;
  const body = JSON.stringify({
    text: `new contact submission ${id}`,
    id,
    name: payload.name,
    email: payload.email,
    subject: payload.subject,
    body: String(payload.body || '').slice(0, 500),
  });
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(5000) })
    .catch((err) => console.log(`webhook failed: ${err.message}`));
};

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

  const retryAfter = rateLimited(req);
  if (retryAfter > 0) {
    rejected++;
    res.setHeader('retry-after', String(retryAfter));
    return reply(res, 429, { ok: false, errors: [`too many submissions; try again in ${retryAfter}s`], retry_after: retryAfter });
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
  const id = String(child.stdout).trim();
  notify(id, body);
  reply(res, 201, { ok: true, id });
}).listen(port, () => {
  console.log(`submission receiver on http://localhost:${port}`);
  console.log(`  POST /submit  -> 201 {ok,id} | 400 {ok,errors}`);
  console.log(`  GET  /health  -> counts`);
  console.log(`  store: ${STORE_FILE}`);
});
