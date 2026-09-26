import { readFileSync } from 'node:fs';

// Correct cross-engine test: remove every @supports block (i.e. simulate an engine WITHOUT
// color-mix support) and assert that each critical surface still resolves to an opaque background.
// A naive adjacency regex fails here because Tailwind lifts the color-mix value into its own
// @supports rule and leaves the fallback in the base rule, so the two are not adjacent.
const css = readFileSync(process.argv[2], 'utf8');

let stripped = '';
let i = 0;
while (i < css.length) {
  const at = css.indexOf('@supports', i);
  if (at < 0) { stripped += css.slice(i); break; }
  stripped += css.slice(i, at);
  const open = css.indexOf('{', at);
  let depth = 1, j = open + 1;
  while (j < css.length && depth > 0) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') depth--;
    j++;
  }
  i = j;
}

const surfaces = ['.cockpit', '.panel', '.node', '.hud'];
let pass = 0, fail = 0;
console.log('=== simulated engine without color-mix(): every critical surface must keep an opaque background ===');
for (const sel of surfaces) {
  const re = new RegExp('(?:^|[},])' + sel.replace('.', '\\.') + '\\{[^}]*\\}');
  const m = stripped.match(re);
  const body = m ? m[0] : '';
  const hasOpaque = /background:\s*var\(--(ground|panel|panel-2|ground-2)\)/.test(body);
  const hasMixOnly = /background:\s*color-mix/.test(body) && !hasOpaque;
  const ok = hasOpaque && !hasMixOnly;
  ok ? pass++ : fail++;
  console.log(`  ${sel.padEnd(9)} opaque background present=${String(hasOpaque).padEnd(5)} mix-only=${String(hasMixOnly).padEnd(5)} ${ok ? 'PASS' : 'FAIL'}`);
  if (body) console.log(`            ${body.slice(0, 130)}`);
}
console.log(`\n  passed=${pass} failed=${fail}`);

const prefixed = (css.match(/-webkit-backdrop-filter/g) || []).length;
const plain = (css.match(/(?<!webkit-)backdrop-filter/g) || []).length;
console.log(`\n=== backdrop-filter prefix pairing ===`);
console.log(`  -webkit-backdrop-filter: ${prefixed}   unprefixed: ${plain}   ${prefixed >= 4 && plain >= 4 ? 'PASS (both forms ship)' : 'FAIL'}`);

process.exit(fail === 0 && prefixed >= 4 ? 0 : 1);
