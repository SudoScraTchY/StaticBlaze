// StaticBlaze visitor runtime: theme, mermaid, code highlight, copy buttons, search.
// No framework, no build step. Everything heavy loads lazily and only when needed.

// ----- theme -----
const root = document.documentElement;
const BASE = window.SB_BASE || '';
const isDark = () => root.getAttribute('data-theme') === 'dark';

function syncThemeIcons() {
  document.querySelector('[data-icon="moon"]')?.classList.toggle('hidden', !isDark());
  document.querySelector('[data-icon="sun"]')?.classList.toggle('hidden', isDark());
}
syncThemeIcons();

document.addEventListener('click', (e) => {
  const toggle = e.target.closest('[data-theme-toggle]');
  if (!toggle) return;
  const next = isDark() ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  try { localStorage.setItem('sb-theme', next); } catch {}
  syncThemeIcons();
});

// ----- code copy buttons -----
for (const pre of document.querySelectorAll('.post-body pre:not(.mermaid)')) {
  pre.style.position = 'relative';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-btn';
  btn.textContent = 'copy';
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.innerText);
      btn.textContent = 'copied ✓';
    } catch {
      btn.textContent = 'failed ✗';
    }
    setTimeout(() => (btn.textContent = 'copy'), 1500);
  });
  pre.appendChild(btn);
}

// ----- mermaid (lazy ESM, only when diagrams exist) -----
if (document.querySelector('pre.mermaid')) {
  const mermaid = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
  mermaid.default.initialize({
    startOnLoad: false,
    theme: root.getAttribute('data-theme') === 'dark' ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
  });
  await mermaid.default.run({ nodes: [...document.querySelectorAll('pre.mermaid')] });
}

// ----- highlight.js (lazy, only when code blocks exist) -----
if (document.querySelector('.post-body pre code')) {
  const [{ hljs }, css] = await Promise.all([
    import('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/es/core.min.js'),
    fetch('https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/styles/github.min.css').then((r) => r.text()),
  ]);
  const languages = ['csharp', 'css', 'javascript', 'json', 'typescript', 'xml', 'bash', 'yaml', 'sql'];
  await Promise.all(languages.map((name) => import(`https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/es/languages/${name}.min.js`).then((m) => hljs.registerLanguage(name, m.default))));
  const style = document.createElement('style');
  // adapt the light hljs theme to the dark theme by inverting via CSS variables when dark
  style.textContent = css + `
    [data-theme="dark"] .hljs { color: #e8e4d8; background: transparent; }
    [data-theme="dark"] .hljs-comment, [data-theme="dark"] .hljs-quote { color: #8b92a8; }
    [data-theme="dark"] .hljs-keyword, [data-theme="dark"] .hljs-selector-tag, [data-theme="dark"] .hljs-meta { color: #57c5c6; }
    [data-theme="dark"] .hljs-string, [data-theme="dark"] .hljs-attr { color: #f38400; }
    [data-theme="dark"] .hljs-number, [data-theme="dark"] .hljs-literal { color: #00a693; }
    [data-theme="dark"] .hljs-title { color: #e8e4d8; }
    .hljs { background: transparent; padding: 0; }
  `;
  document.head.appendChild(style);
  for (const block of document.querySelectorAll('.post-body pre code')) hljs.highlightElement(block);
}

// ----- search (lazy index fetch on first focus) -----
const searchRoot = document.querySelector('[data-search]');
const input = document.querySelector('[data-search-input]');
const panel = document.querySelector('[data-search-panel]');
let index = null;

if (input && panel) {
  input.addEventListener('focus', loadIndex);
  input.addEventListener('input', () => render(input.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { panel.classList.add('hidden'); input.blur(); }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = [...panel.querySelectorAll('.search-result')];
      const selected = panel.querySelector('.search-result.selected');
      const next = e.key === 'ArrowDown'
        ? items[items.indexOf(selected) + 1] ?? items[0]
        : items[Math.max(0, items.indexOf(selected) - 1)];
      items.forEach((el) => el.classList.remove('selected'));
      next?.classList.add('selected');
    }
    if (e.key === 'Enter') panel.querySelector('.search-result.selected')?.click();
  });
  document.addEventListener('click', (e) => {
    if (!searchRoot.contains(e.target)) panel.classList.add('hidden');
  });
}

async function loadIndex() {
  if (index) return;
  try {
    const response = await fetch(`${BASE}/search-index.json`);
    index = await response.json();
  } catch {
    index = [];
  }
}

function score(entry, query) {
  const q = query.toLowerCase();
  let score = 0;
  if (entry.title.toLowerCase().includes(q)) score += 5;
  if (entry.title.toLowerCase().startsWith(q)) score += 4;
  for (const tag of entry.tags) if (tag.toLowerCase().includes(q)) score += 3;
  if (entry.category.toLowerCase().includes(q)) score += 3;
  if (entry.description.toLowerCase().includes(q)) score += 2;
  if (entry.body.toLowerCase().includes(q)) score += 1;
  return score;
}

function render(query) {
  if (!index || !query.trim()) {
    panel.classList.add('hidden');
    return;
  }
  const results = index
    .map((entry) => ({ entry, score: score(entry, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || new Date(b.entry.published) - new Date(a.entry.published))
    .slice(0, 8);
  panel.innerHTML = results.length === 0
    ? '<p class="search-result text-sm text-muted">no matches</p>'
    : results.map(({ entry }, i) => `
      <a class="search-result ${i === 0 ? 'selected' : ''}" href="${BASE}/posts/${entry.slug}/">
        <span class="block font-medium">${escapeHtml(entry.title)}</span>
        <span class="block text-xs text-muted font-mono mt-0.5">${entry.published.slice(0, 10)} · ${escapeHtml(entry.tags.map((t) => '#' + t).join(' '))}</span>
      </a>`).join('');
  panel.classList.remove('hidden');
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
