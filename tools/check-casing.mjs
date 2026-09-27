#!/usr/bin/env node
// Case-sensitivity guard.
//
// Windows and macOS are case-insensitive, Linux is not. A file committed as `foo.csproj` while the
// solution references `Foo.csproj` builds perfectly locally and fails on the CI runner with
// "project not found" - which is exactly how the Pages deploy broke on 18d5eb7: the generator's
// test project was committed as `staticblaze.site.tests.csproj` while StaticBlaze.slnx referenced
// `StaticBlaze.Site.Tests.csproj`, so `dotnet test` could not load the solution on Linux, the Test
// step failed, and every later step was skipped.
//
// This checks the git index (case-sensitive by definition) rather than the working tree (which on
// Windows would lie), and it also flags source files whose basename starts lowercase, since that is
// where these mismatches come from.
//
// Usage: node tools/check-casing.mjs [repoRoot]

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = process.argv[2] || '.';
const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).split('\n').map((l) => l.trim()).filter(Boolean);

let tracked;
try {
  tracked = new Set(git(['ls-files']));
} catch (e) {
  console.error('cannot read the git index: ' + e.message);
  process.exit(2);
}
const trackedArr = [...tracked];

const problems = [];

/* ---- 1. every Project Path in the solution must exist with exact case ---- */
const slnx = join(root, 'StaticBlaze.slnx');
if (existsSync(slnx)) {
  const text = readFileSync(slnx, 'utf8');
  const refs = [...text.matchAll(/Project Path="([^"]+)"/g)].map((m) => m[1]);
  console.log(`=== solution references (${refs.length}) ===`);
  for (const ref of refs) {
    const ok = tracked.has(ref);
    // on a case-insensitive filesystem the wrong-case file still exists; find it to explain the fix
    const near = ok ? null : trackedArr.find((f) => f.toLowerCase() === ref.toLowerCase());
    console.log(`  ${ok ? 'ok     ' : 'MISSING'} ${ref}${near ? `   (committed as "${near}")` : ''}`);
    if (!ok) problems.push(`solution references "${ref}" but the index has no such path${near ? `; it is committed as "${near}"` : ' at all'}`);
  }
} else {
  console.log('=== no StaticBlaze.slnx found, skipping solution check ===');
}

/* ---- 2. source files whose basename starts lowercase ---- */
const SOURCE = /\.(cs|csproj|razor|slnx|props|targets)$/;
const lower = trackedArr.filter((f) => SOURCE.test(f) && /^[a-z]/.test(f.split('/').pop()));
console.log(`\n=== source files with a lowercase initial (${lower.length}) ===`);
for (const f of lower) console.log(`  ${f}`);
if (lower.length) {
  problems.push(`${lower.length} source file(s) start lowercase, which is where case mismatches come from: ${lower.join(', ')}`);
}

/* ---- 3. any .cs file whose name disagrees with its class name is worth knowing about ---- */
const mismatched = [];
for (const f of trackedArr.filter((x) => x.endsWith('.cs') && x.startsWith('tests/'))) {
  const base = f.split('/').pop().replace(/\.cs$/, '');
  if (!/^[A-Z]/.test(base)) continue;
  let text = '';
  try { text = readFileSync(join(root, f), 'utf8'); } catch { continue; }
  const cls = text.match(/public\s+(?:sealed\s+)?class\s+([A-Za-z0-9_]+)/);
  if (cls && cls[1] !== base) mismatched.push(`${f} declares class ${cls[1]}`);
}
if (mismatched.length) {
  console.log(`\n=== file name versus class name (${mismatched.length}) ===`);
  for (const m of mismatched) console.log(`  ${m}`);
}

console.log(`\nPROBLEMS: ${problems.length}`);
for (const p of problems) console.log(`  - ${p}`);
console.log(`\nRESULT: ${problems.length === 0 ? 'PASS' : 'FAIL'}`);
console.log('note: this reads the git index, which is case-sensitive even on Windows.');
process.exit(problems.length === 0 ? 0 : 1);
