#!/usr/bin/env node
// Contact/subscribe submission store.
//
// Design decisions that matter for privacy:
//   - the store lives under var/ which is gitignored. The repository is public (GitHub Pages), so
//     committing visitor messages would publish them. Submissions are site OPERATIONAL data, not
//     site CONTENT, and never enter content/ or dist/.
//   - no IP address, no user agent string, no cookie, no identifier is recorded. Only what the
//     visitor deliberately typed, plus a timestamp and a coarse source label.
//   - output goes to artifacts/submissions/, also gitignored.
//
// Verbs:
//   add            read a JSON object from stdin, validate, append, print the new id
//   list           print a summary table
//   export         write artifacts/submissions/submissions.json and .csv and review.html
//   set-status     set-status <id> <new|read|replied|spam>
//
// Usage: node tools/submissions.mjs <verb> [args]

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const STORE = 'var/submissions/submissions.jsonl';
const OUT = 'artifacts/submissions';

const STATUSES = ['new', 'read', 'replied', 'spam'];

function read() {
  if (!existsSync(STORE)) return [];
  return readFileSync(STORE, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function writeAll(records) {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : ''));
}

function append(record) {
  mkdirSync(dirname(STORE), { recursive: true });
  appendFileSync(STORE, JSON.stringify(record) + '\n');
}

function validate(input) {
  const errors = [];
  const name = String(input.name ?? '').trim();
  const email = String(input.email ?? '').trim();
  const subject = String(input.subject ?? '').trim() || 'no subject';
  const body = String(input.body ?? '').trim();

  if (name.length < 2) errors.push('name must be at least 2 characters');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.push('email is not a valid address');
  if (body.length < 10) errors.push('body must be at least 10 characters');
  if (String(input.website ?? '').trim() !== '') errors.push('honeypot rejected');
  if (name.length > 200 || email.length > 320 || body.length > 8000) errors.push('field too long');

  return { errors, clean: { name, email, subject, body } };
}

function newId() {
  const t = new Date();
  const stamp = t.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const rand = Math.random().toString(36).slice(2, 6);
  return `sub_${stamp}_${rand}`;
}

const [, , verb, ...rest] = process.argv;

if (verb === 'add') {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  let input;
  try { input = JSON.parse(raw); } catch { console.error('invalid JSON on stdin'); process.exit(2); }

  const { errors, clean } = validate(input);
  if (errors.length) { console.error('rejected: ' + errors.join('; ')); process.exit(3); }

  const record = {
    id: newId(),
    receivedAt: new Date().toISOString(),
    source: String(input.source ?? 'web-form').slice(0, 40),
    status: 'new',
    ...clean,
  };
  append(record);
  console.log(record.id);
  process.exit(0);
}

if (verb === 'list') {
  const records = read();
  if (!records.length) { console.log('no submissions'); process.exit(0); }
  console.log(`${records.length} submission(s) in ${STORE}\n`);
  const pad = (s, n) => String(s).padEnd(n).slice(0, n);
  console.log('  ' + pad('id', 26) + pad('receivedAt', 26) + pad('status', 9) + pad('source', 11) + 'subject');
  for (const r of records) {
    console.log('  ' + pad(r.id, 26) + pad(r.receivedAt, 26) + pad(r.status, 9) + pad(r.source, 11) + r.subject);
  }
  const byStatus = records.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
  console.log('\n  by status: ' + JSON.stringify(byStatus));
  process.exit(0);
}

if (verb === 'set-status') {
  const [id, status] = rest;
  if (!STATUSES.includes(status)) { console.error(`status must be one of ${STATUSES.join(', ')}`); process.exit(2); }
  const records = read();
  const rec = records.find((r) => r.id === id);
  if (!rec) { console.error(`no such id: ${id}`); process.exit(3); }
  rec.status = status;
  writeAll(records);
  console.log(`${id} -> ${status}`);
  process.exit(0);
}

if (verb === 'export') {
  const records = read();
  mkdirSync(OUT, { recursive: true });

  writeFileSync(join(OUT, 'submissions.json'), JSON.stringify({ exportedAt: new Date().toISOString(), count: records.length, records }, null, 2));

  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cols = ['id', 'receivedAt', 'status', 'source', 'name', 'email', 'subject', 'body'];
  const csv = [cols.join(',')].concat(records.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n') + '\n';
  writeFileSync(join(OUT, 'submissions.csv'), csv);

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Submissions review</title><style>
:root{--g:#06070d;--p:#0e1120;--i:#e9ecf5;--d:#98a0bd;--e:rgba(233,236,245,.12);--a:#57c5c6;--z:#f5a524}
body{margin:0;background:var(--g);color:var(--i);font:15px/1.6 "IBM Plex Sans",system-ui,sans-serif;padding:32px}
h1{font-size:20px;letter-spacing:-.02em}
code,.m{font-family:"IBM Plex Mono",ui-monospace,monospace}
p.m{color:var(--d);font-size:12.5px}
table{width:100%;border-collapse:collapse;margin-top:20px;font-size:13.5px}
th,td{border-bottom:1px solid var(--e);padding:8px 10px;text-align:start;vertical-align:top}
th{font:500 11px/1.5 "IBM Plex Mono",monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--d)}
td.id{font-family:"IBM Plex Mono",monospace;font-size:12px;color:var(--z);white-space:nowrap}
select{background:var(--p);color:var(--i);border:1px solid var(--e);border-radius:2px;padding:3px 6px;font-family:"IBM Plex Mono",monospace;font-size:11px}
.body{max-width:52ch;color:var(--d)}
</style></head><body>
<h1>Submissions review</h1>
<p class="m">${records.length} record(s) · exported ${new Date().toISOString()} · store <code>${STORE}</code> · no IP, no user agent, no identifier is recorded</p>
<p class="m">Export files: <code>${OUT}/submissions.json</code> · <code>${OUT}/submissions.csv</code>. Both are gitignored: the repository is public, so visitor messages must never be committed.</p>
<table><thead><tr><th>id</th><th>received</th><th>status</th><th>source</th><th>from</th><th>subject</th><th>message</th></tr></thead><tbody>
${records.map((r) => `<tr><td class="id">${r.id}</td><td class="m">${r.receivedAt}</td><td><select data-id="${r.id}">${STATUSES.map((s) => `<option${s === r.status ? ' selected' : ''}>${s}</option>`).join('')}</select></td><td class="m">${r.source}</td><td>${escapeHtml(r.name)}<br><span class="m">${escapeHtml(r.email)}</span></td><td>${escapeHtml(r.subject)}</td><td class="body">${escapeHtml(r.body)}</td></tr>`).join('\n')}
</tbody></table></body></html>`;
  writeFileSync(join(OUT, 'review.html'), html);

  console.log(`exported ${records.length} record(s):`);
  console.log(`  ${OUT}/submissions.json`);
  console.log(`  ${OUT}/submissions.csv`);
  console.log(`  ${OUT}/review.html`);
  process.exit(0);
}

function escapeHtml(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

console.error(`unknown verb: ${verb ?? '(none)'}\nverbs: add, list, export, set-status`);
process.exit(2);
