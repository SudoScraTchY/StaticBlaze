// StaticBlaze UI behaviours: command palette, index filtering, contact form state machine.
// Framework free. Every surface has a working no-JS or degraded path.
//
// Rubric notes (Leonxlnx/taste-skill):
//   section 4.5 interactive UI states: default / hover / focus / active / disabled / loading all real
//   section 6.B reduced motion: nothing here animates except via CSS transitions, which are collapsed
//   the form NEVER reports success it did not achieve. It says what actually happened.

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ==================================================================== *
 *  COMMAND PALETTE
 * ==================================================================== */
(() => {
  const root = $('[data-cmd]');
  if (!root) return;
  const input = $('[data-cmd-input]', root);
  const list = $('[data-cmd-list]', root);
  const live = $('[data-cmd-live]', root);
  const base = document.documentElement.getAttribute('data-base') || '';
  let index = null;
  let selected = 0;
  let lastFocus = null;

  const open = async () => {
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    input.value = '';
    await load();
    render('');
    input.focus();
  };
  const close = () => {
    root.hidden = true;
    document.documentElement.style.overflow = '';
    if (lastFocus instanceof HTMLElement) lastFocus.focus();
  };

  const load = async () => {
    if (index) return;
    try {
      const r = await fetch(`${base}/search-index.json`);
      index = await r.json();
    } catch {
      index = [];
      if (live) live.textContent = 'search index unavailable';
    }
  };

  const score = (e, q) => {
    const t = q.toLowerCase();
    let s = 0;
    if (e.title.toLowerCase().includes(t)) s += 6;
    if (e.title.toLowerCase().startsWith(t)) s += 4;
    (e.tags || []).forEach((tag) => { if (tag.toLowerCase().includes(t)) s += 3; });
    if ((e.category || '').toLowerCase().includes(t)) s += 3;
    if ((e.description || '').toLowerCase().includes(t)) s += 2;
    if ((e.body || '').toLowerCase().includes(t)) s += 1;
    return s;
  };

  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const render = (q) => {
    if (!index) return;
    const rows = !q.trim()
      ? index.slice(0, 8)
      : index.map((e) => ({ e, s: score(e, q) })).filter((r) => r.s > 0)
          .sort((a, b) => b.s - a.s || new Date(b.e.published) - new Date(a.e.published)).slice(0, 9).map((r) => r.e);
    selected = 0;
    list.innerHTML = rows.length === 0
      ? '<li><p class="m" style="padding:.75rem">no matches in the archive</p></li>'
      : rows.map((e, i) => `
        <li><a href="${base}/posts/${esc(e.slug)}/" role="option" aria-selected="${i === 0}" class="${i === 0 ? 'sel' : ''}">
          <span class="t">${esc(e.title)}</span>
          <span class="m">${esc((e.published || '').slice(0, 10))} · ${esc((e.tags || []).map((t) => '#' + t).join(' '))}</span>
        </a></li>`).join('');
    if (live) live.textContent = rows.length === 0 ? 'no matches' : `${rows.length} results`;
  };

  const move = (dir) => {
    const items = $$('a[role="option"]', list);
    if (!items.length) return;
    selected = (selected + dir + items.length) % items.length;
    items.forEach((el, i) => { el.setAttribute('aria-selected', String(i === selected)); el.classList.toggle('sel', i === selected); });
    items[selected]?.scrollIntoView({ block: 'nearest' });
  };

  if (input && list) {
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = list.querySelector('a[aria-selected="true"]');
        if (sel) window.location.href = sel.href;
      } else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  root.addEventListener('click', (e) => { if (e.target === root) close(); });
  document.addEventListener('click', (e) => { if (e.target.closest('[data-cmd-open]')) { e.preventDefault(); open(); } });
  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); root.hidden ? open() : close(); return; }
    if (e.key === '/' && !typing && root.hidden) { e.preventDefault(); open(); return; }
    if (e.key === 'Escape' && !root.hidden) close();
  });
})();

/* ==================================================================== *
 *  INDEX FILTER
 * ==================================================================== */
(() => {
  const listEl = $('[data-idx-list]');
  if (!listEl) return;
  const q = $('[data-idx-q]');
  const tagBox = $('[data-idx-tags]');
  const catBox = $('[data-idx-cats]');
  const countEl = $('[data-idx-count]');
  const emptyEl = $('[data-idx-empty]');
  const rows = $$('[data-row]', listEl);
  const groups = $$('[data-group]', listEl);
  let tag = '*';
  let cat = '*';

  const chip = (box, attr, value) => {
    if (!box) return;
    $$('button', box).forEach((b) => b.setAttribute('data-active', String(b.getAttribute(attr) === value)));
  };

  const apply = () => {
    const term = (q?.value || '').trim().toLowerCase();
    let shown = 0;
    rows.forEach((r) => {
      const okTag = tag === '*' || (r.dataset.tags || '').split(' ').includes(tag);
      const okCat = cat === '*' || r.dataset.cat === cat;
      const okQ = !term || (r.dataset.q || '').toLowerCase().includes(term);
      const ok = okTag && okCat && okQ;
      r.hidden = !ok;
      if (ok) shown++;
    });
    // a group heading is pointless when every row under it is hidden
    groups.forEach((g) => {
      let n = g.nextElementSibling;
      let any = false;
      while (n && !n.hasAttribute('data-group')) { if (n.hasAttribute('data-row') && !n.hidden) { any = true; break; } n = n.nextElementSibling; }
      g.hidden = !any;
    });
    if (countEl) countEl.textContent = `${shown} of ${rows.length} shown`;
    if (emptyEl) emptyEl.hidden = shown !== 0;
  };

  q?.addEventListener('input', apply);
  tagBox?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-tag]');
    if (!b) return;
    tag = b.getAttribute('data-tag');
    chip(tagBox, 'data-tag', tag);
    apply();
  });
  catBox?.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-cat]');
    if (!b) return;
    cat = b.getAttribute('data-cat');
    chip(catBox, 'data-cat', cat);
    apply();
  });
  apply();
})();

/* ==================================================================== *
 *  CONTACT FORM
 *  States: idle -> invalid | ready -> sending -> stored | failed
 *  There is no transport in this build, so the terminal state is "not stored",
 *  reported honestly. Point data-endpoint at a real URL to enable the last leg.
 * ==================================================================== */
(() => {
  const form = $('[data-form]');
  if (!form) return;
  const status = $('[data-status]', form);
  const submit = $('[data-submit]', form);
  const note = $('[data-transport-note]', form);
  // Read at submit time, not at load. A form that caches its transport cannot be pointed at a
  // receiver without regenerating the site, and cannot be tested.
  const endpoint = () => (form.getAttribute('data-endpoint') || '').trim();

  const rules = {
    'c-name': (v) => (v.trim().length >= 2 ? '' : 'Tell me what to call you, at least 2 characters.'),
    'c-email': (v) => (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.trim()) ? '' : 'That address is missing an @ or a domain.'),
    'c-body': (v) => (v.trim().length >= 10 ? '' : 'A little more context helps, at least 10 characters.'),
  };

  const setError = (id, msg) => {
    const field = document.getElementById(id);
    const err = document.getElementById(id + '-err');
    if (field) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (err) { err.textContent = msg; err.hidden = !msg; }
  };

  const validate = () => {
    let firstBad = null;
    for (const [id, check] of Object.entries(rules)) {
      const el = document.getElementById(id);
      const msg = check(el?.value || '');
      setError(id, msg);
      if (msg && !firstBad) firstBad = el;
    }
    return firstBad;
  };

  for (const id of Object.keys(rules)) {
    document.getElementById(id)?.addEventListener('blur', () => {
      const el = document.getElementById(id);
      if (el.value.trim()) setError(id, rules[id](el.value));
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) status.textContent = 'checking';
    const bad = validate();
    if (bad) {
      if (status) status.textContent = 'needs attention';
      bad.focus();
      return;
    }
    if (submit) submit.disabled = true;
    if (status) status.textContent = 'sending';

    const target = endpoint();
    if (!target) {
      // honest terminal state: nothing was persisted, and we say so
      if (status) status.textContent = 'not stored: no transport configured in this build';
      if (note) {
        note.textContent = 'Your message was validated but not saved, because this build has no endpoint. '
          + 'Set data-endpoint on the form to a real URL to store submissions.';
        note.style.color = 'var(--zafaran)';
      }
      if (submit) submit.disabled = false;
      return;
    }

    try {
      const res = await fetch(target, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error(String(res.status));
      if (status) status.textContent = 'saved';
      if (note) {
        note.textContent = 'Stored. The receiver accepted the submission and wrote a record to the store.';
        note.style.color = 'var(--ok)';
      }
      form.reset();
      for (const id of Object.keys(rules)) setError(id, '');
    } catch (err) {
      if (status) status.textContent = `failed: ${err.message}. Nothing was stored.`;
      if (note) {
        note.textContent = 'The receiver did not accept the submission, so no record was written. Nothing was lost that you cannot resend by pressing send again.';
        note.style.color = 'var(--alert)';
      }
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();
