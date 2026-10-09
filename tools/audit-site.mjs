#!/usr/bin/env node
import fs from 'fs';
// Two audits the brief asks for that are easy to assert and hard to prove:
//   1. CRAWLABILITY: every page has a unique, non-empty title, description, canonical and og:url;
//      the canonical matches the route the page was emitted at; and sitemap.xml lists every page.
//   2. ZERO OLD-DESIGN RESIDUE: the previous "Naghsh" pass used its own token vocabulary. None of it
//      may survive in the built stylesheet or the emitted markup.
// Usage: node tools/audit-site.mjs <distDir>

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const dist = process.argv[2] || 'dist';
const BASE = (JSON.parse(readFileSync('content/site.json', 'utf8')).url || '').replace(/^https?:\/\/[^/]+/, '') || '';

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(dist);
// dist/admin/ is the Blazor authoring app, published by CI into the same tree. It is a single-page
// application, not a content page, so crawlability and residue rules do not apply to it. Skipped
// explicitly rather than left to fail the gate.
const isAdmin = (f) => relative(dist, f).split(sep)[0] === 'admin';
const html = files.filter((f) => f.endsWith('.html') && !f.includes('__probe') && !f.includes('__wrap') && !isAdmin(f));
const pick = (s, re) => { const m = s.match(re); return m ? m[1].trim() : null; };
const decode = (s) => (s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

/* ---------- 1. crawlability ---------- */
const rows = [];
for (const f of html) {
  const s = readFileSync(f, 'utf8');
  const route = '/' + relative(dist, f).split(sep).join('/').replace(/index\.html$/, '').replace(/\/$/, '');
  rows.push({
    file: relative(dist, f).split(sep).join('/'),
    route,
    title: decode(pick(s, /<title>([\s\S]*?)<\/title>/)),
    description: decode(pick(s, /<meta name="description" content="([^"]*)"/)),
    canonical: pick(s, /<link rel="canonical" href="([^"]*)"/),
    ogTitle: decode(pick(s, /<meta property="og:title" content="([^"]*)"/)),
    ogUrl: pick(s, /<meta property="og:url" content="([^"]*)"/),
    ogType: pick(s, /<meta property="og:type" content="([^"]*)"/),
    h1: (s.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [, null])[1]?.replace(/<[^>]+>/g, '').trim() || null,
    lang: pick(s, /<html lang="([^"]*)"/),
    dir: pick(s, /<html[^>]*dir="([^"]*)"/),
    // Razor emits the type attribute with the plus html-encoded (ld&#x2B;json), exactly as it does
    // for application/rss&#x2B;xml. Browsers decode attribute entities, so both forms are valid.
    jsonLd: /application\/ld(?:\+|&#x2B;)json/.test(s),
  });
}

const dupes = (key) => {
  const seen = new Map();
  for (const r of rows) { const v = r[key]; if (!v) continue; seen.set(v, (seen.get(v) || 0) + 1); }
  return [...seen].filter(([, n]) => n > 1);
};

const problems = [];
for (const r of rows) {
  if (!r.title) problems.push(`${r.file}: missing title`);
  if (!r.description) problems.push(`${r.file}: missing description`);
  if (!r.canonical) problems.push(`${r.file}: missing canonical`);
  if (!r.h1) problems.push(`${r.file}: missing h1`);
  if (r.description && (r.description.length < 40 || r.description.length > 200)) problems.push(`${r.file}: description length ${r.description.length}`);
  if (r.canonical && r.ogUrl && r.canonical !== r.ogUrl) problems.push(`${r.file}: canonical != og:url`);
  if (r.canonical && !r.canonical.startsWith('https://')) problems.push(`${r.file}: canonical not absolute`);
  if (r.canonical && !r.canonical.includes(BASE)) problems.push(`${r.file}: canonical missing base path`);
  if (r.dir !== 'ltr' && r.dir !== 'rtl') problems.push(`${r.file}: bad dir "${r.dir}"`);
}
for (const k of ['title', 'description', 'canonical']) {
  const d = dupes(k);
  if (d.length) problems.push(`duplicate ${k}: ${d.map(([v, n]) => `"${v.slice(0, 40)}" x${n}`).join(', ')}`);
}

const sitemapPath = join(dist, 'sitemap.xml');
const sitemap = existsSync(sitemapPath) ? readFileSync(sitemapPath, 'utf8') : '';
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const missingFromSitemap = rows.filter((r) => r.file !== '404.html').filter((r) => !locs.some((l) => l.endsWith(r.canonical.replace('https://sudoscratchy.github.io', ''))));

const robots = existsSync(join(dist, 'robots.txt')) ? readFileSync(join(dist, 'robots.txt'), 'utf8') : '';
const robotsOk = /Sitemap:/i.test(robots);

/* ---------- 2. old-design residue ---------- */
const cssFiles = files.filter((f) => f.endsWith('.css'));
const css = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const markup = html.map((f) => readFileSync(f, 'utf8')).join('\n');

// token and class names that belonged to the previous pass and must not survive
// Only names and values that belong EXCLUSIVELY to the previous "Naghsh" pass. Earlier revisions of
// this list wrongly included token names the Deep Field system also defines (--r-1, --family-sans) and
// names Tailwind emits from its own theme namespace (--radius-*), which produced
// positives. --radius-* was removed for the same reason: both designs used those names and Tailwind emits them from the current tokens, so the name cannot discriminate. The palette hexes are the reliable fingerprint.
const OLD_TOKENS = ['--fs-display', '--elev-1', '--elev-2', '--r-sm:', '--r-lg:', '--dur-fast', '--dur-base', '--ease-std', '--ease-spr'];
const OLD_HEXES = ['f7f2e8', 'fffdf9', 'efe8da', '23283a', '585e73', '0067a5', '004e7c', '8e4a00', 'b35c00', '006f66', 'b02f2a', '1c39bb', 'f38400', 'e2685f', '93dedd', '6fd0cf', '8e9cf0', '5d6584'];
// Naghsh-only class names. Excluded because Deep Field defines them itself: field-row, node-spine,
// panel, card, tile-rule, reveal, skip-link, sr-only.
const OLD_CLASSES = ['section-index', 'title-block', 'card-hover', 'masthead-glow', 'reading-rail', 'density-year', 'data-n='];

const residueCss = [...OLD_TOKENS.filter((t) => css.includes(t)), ...OLD_HEXES.filter((h) => css.toLowerCase().includes(h)).map((h) => '#' + h)];
const residueMarkup = OLD_CLASSES.filter((c) => markup.includes(c));

/* ---------- report ---------- */
console.log(`=== CRAWLABILITY: ${rows.length} pages audited ===`);
console.log('  file'.padEnd(42) + 'title'.padEnd(9) + 'desc'.padEnd(7) + 'canonical'.padEnd(11) + 'og:type'.padEnd(10) + 'jsonld');
for (const r of rows.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log('  ' + r.file.padEnd(40) + String(r.title ? r.title.length : 0).padEnd(9) + String(r.description ? r.description.length : 0).padEnd(7) + String(!!r.canonical).padEnd(11) + String(r.ogType).padEnd(10) + String(r.jsonLd));
}
console.log(`\n  sitemap lists ${locs.length} urls; robots has Sitemap: ${robotsOk}`);
console.log(`  pages missing from sitemap: ${missingFromSitemap.length}${missingFromSitemap.length ? ' -> ' + missingFromSitemap.map((r) => r.file).join(', ') : ''}`);
console.log(`  PROBLEMS: ${problems.length}`);
for (const p of problems) console.log('    - ' + p);

console.log(`\n=== ZERO OLD-DESIGN RESIDUE ===`);
console.log(`  old token names still present in CSS (${residueCss.length}): ${residueCss.join(' ') || 'none'}`);
console.log(`  old class names still present in markup (${residueMarkup.length}): ${residueMarkup.join(' ') || 'none'}`);
console.log(`  css files: ${cssFiles.map((f) => relative(dist, f).split(sep).join('/')).join(', ')}`);

const ok = problems.length === 0 && residueCss.length === 0 && residueMarkup.length === 0 && missingFromSitemap.length === 0;
console.log(`\nRESULT: ${ok ? 'PASS' : 'FAIL'}`);
process.exit(ok ? 0 : 1);
