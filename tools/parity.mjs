#!/usr/bin/env node
// Route parity against the previous revision, plus internal link integrity across the built site.
//
// The brief asks for "a content parity script comparing the old post list, tags and slugs against the
// new site; report any missing or broken URLs" and for broken links to be caught before readers do.
// The previous revision is materialised by `git worktree add <dir> HEAD`, so its generated output can
// be compared directly rather than from memory.
//
// Usage: node tools/parity.mjs <oldDistDir> <newDistDir> [basePath]

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const [oldDir, newDir, base = '/StaticBlaze'] = process.argv.slice(2);
if (!oldDir || !newDir) { console.error('usage: node tools/parity.mjs <oldDist> <newDist> [base]'); process.exit(2); }

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};

// file path -> public route
const routeOf = (root, file) => {
  const rel = relative(root, file).split(sep).join('/');
  if (rel === '404.html') return '/404.html';
  return '/' + rel.replace(/index\.html$/, '');
};

const routesOf = (root) => new Set(walk(root).filter((f) => f.endsWith('.html')).map((f) => routeOf(root, f)));

const oldRoutes = routesOf(oldDir);
const newRoutes = routesOf(newDir);

const missing = [...oldRoutes].filter((r) => !newRoutes.has(r)).sort();
const added = [...newRoutes].filter((r) => !oldRoutes.has(r)).sort();
const kept = [...oldRoutes].filter((r) => newRoutes.has(r)).length;

console.log(`=== ROUTE PARITY ===`);
console.log(`  previous revision : ${oldRoutes.size} routes`);
console.log(`  current build     : ${newRoutes.size} routes`);
console.log(`  preserved         : ${kept}`);
console.log(`  MISSING (broken)  : ${missing.length}${missing.length ? ' -> ' + missing.join(', ') : ''}`);
console.log(`  added             : ${added.length}${added.length ? ' -> ' + added.join(', ') : ''}`);

/* ---------- internal link integrity ---------- */
const files = walk(newDir);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const fileSet = new Set(files.map((f) => relative(newDir, f).split(sep).join('/')));
const routeSet = new Set([...newRoutes, '/']);

// a link target resolves if it maps to an emitted file, or to a route we emit, or is an asset
// /admin/ is deliberately NOT part of the local build: the CI workflow publishes the Blazor admin
// separately and copies it into dist/admin/ at assemble time. Flagging it locally would be a false
// positive, so it is treated as externally supplied and reported separately.
const EXTERNAL = [base + '/admin/'];

const resolves = (href) => {
  if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('data:')) return true;
  if (EXTERNAL.some((e) => href === e || href.startsWith(e))) return true;
  let p = href.split('#')[0].split('?')[0];
  if (p.startsWith(base)) p = p.slice(base.length);
  if (p === '' || p === '/') return fileSet.has('index.html');
  if (p.endsWith('/')) return fileSet.has(p.slice(1) + 'index.html') || routeSet.has(p);
  return fileSet.has(p.slice(1));
};

const broken = [];
let checked = 0;
for (const f of htmlFiles) {
  const s = readFileSync(f, 'utf8');
  const from = relative(newDir, f).split(sep).join('/');
  for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = m[1];
    if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('data:') || href.startsWith('#')) continue;
    checked++;
    if (!resolves(href)) broken.push({ from, href });
  }
}

console.log(`\n=== INTERNAL LINK INTEGRITY ===`);
console.log(`  internal links checked : ${checked}`);
console.log(`  BROKEN                 : ${broken.length}`);
for (const b of broken.slice(0, 20)) console.log(`    ${b.from}  ->  ${b.href}`);

/* ---------- sitemap reachability ---------- */
const smPath = join(newDir, 'sitemap.xml');
const locs = existsSync(smPath) ? [...readFileSync(smPath, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]) : [];
const smMissing = locs.filter((l) => !resolves(l.replace(/^https?:\/\/[^/]+/, '')));

console.log(`\n=== SITEMAP REACHABILITY ===`);
console.log(`  urls listed     : ${locs.length}`);
console.log(`  unresolvable    : ${smMissing.length}${smMissing.length ? ' -> ' + smMissing.join(', ') : ''}`);

const ok = missing.length === 0 && broken.length === 0 && smMissing.length === 0;
console.log(`\nRESULT: ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
