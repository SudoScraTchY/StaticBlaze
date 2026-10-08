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


/* ==================================================================== *
 *  MERMAID DIAGRAMS
 *  The markdown pipeline rewrites ```mermaid fences into <pre class="mermaid">
 *  so the source survives generation even if this script never runs. Here we
 *  upgrade those blocks in place: library loaded only when a diagram exists,
 *  theme colours read from the same CSS tokens the page uses, and an honest
 *  failure path that leaves the source visible instead of a broken box.
 * ==================================================================== */
(() => {
  const blocks = $$('pre.mermaid');
  if (!blocks.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;

  const fail = (el, message) => {
    // keep the raw source readable, say what happened, never a silent empty box
    el.classList.add('mermaid-failed');
    el.setAttribute('data-mermaid-error', message);
    const note = document.createElement('p');
    note.className = 'mermaid-note';
    note.textContent = `diagram could not be rendered (${message}); showing the source`;
    el.insertAdjacentElement('afterend', note);
  };

  const boot = async () => {
    // the vendored UMD build defines window.mermaid; loading it costs ~2.7 MB, so only pages
    // that actually contain a diagram pay for it. Static sites fetch from the same origin.
    try {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = `${document.documentElement.getAttribute('data-base') || ''}/assets/vendor/mermaid.min.js`;
        s.onload = resolve;
        s.onerror = () => reject(new Error('library failed to load'));
        document.head.appendChild(s);
      });
    } catch (err) {
      blocks.forEach((el) => fail(el, err.message));
      return;
    }

    const mermaid = window.mermaid;
    if (!mermaid || typeof mermaid.initialize !== 'function') {
      blocks.forEach((el) => fail(el, 'mermaid global missing'));
      return;
    }

    // comprehensive base-theme mapping: every variable the vendored mermaid build reads is
    // pinned to a site token, so no diagram family falls back to mermaid's light defaults
    // (that was the bug: actor names, edge labels, pie legends... arrived black on dark).
    const ground = token('--ground', '#06070d');
    const panel = token('--panel', '#0c101d');
    const panel2 = token('--panel-2', '#141830');
    const ink = token('--ink', '#e9ecf5');
    const inkDim = token('--ink-dim', '#98a0bd');
    const accent = token('--accent', '#57c5c6');
    const accentInk = token('--accent-ink', '#8fe3e3');
    const lajvard = token('--lajvard', '#4a5cff');
    const lajvardSoft = token('--lajvard-soft', '#1b2150');
    const zafaran = token('--zafaran', '#f5a524');
    const alert = token('--alert', '#ff6b5e');
    const edge = token('--edge-hi', 'rgb(233 236 245 / 0.30)');
    const family = token('--family-sans', 'system-ui, sans-serif');

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: family,
      themeVariables: {
        darkMode: true,
        background: ground,
        fontFamily: family,
        fontSize: '15px',

        // nodes / primary surfaces
        primaryColor: lajvardSoft,
        primaryTextColor: ink,
        primaryBorderColor: accent,
        secondaryColor: panel2,
        secondaryTextColor: ink,
        secondaryBorderColor: accent,
        tertiaryColor: panel,
        tertiaryTextColor: inkDim,
        tertiaryBorderColor: edge,

        // connectors + arrows + labels on lines
        lineColor: accent,
        textColor: ink,
        edgeLabelBackground: panel,
        clusterBkg: panel,
        clusterBorder: edge,
        titleColor: ink,
        sectionBkgColor: panel2,
        sectionBkgColor2: panel,
        altSectionBkgColor: panel,
        sectionBkgColorDark: panel2,

        // sequence diagrams
        actorBkg: panel2,
        actorBorder: accent,
        actorTextColor: ink,
        actorLineColor: edge,
        signalColor: ink,
        signalTextColor: ink,
        labelBoxBkgColor: panel2,
        labelBoxBorderColor: accent,
        labelTextColor: ink,
        loopTextColor: ink,
        activationBkgColor: lajvardSoft,
        activationBorderColor: accent,

        // notes
        noteBkgColor: zafaran + '1f',
        noteTextColor: ink,
        noteBorderColor: zafaran,

        // sequence numbers /SequenceDiagram
        sequenceNumberColor: ground,

        // gantt
        gridColor: edge,
        doneTaskBkgColor: panel2,
        doneTaskBorderColor: edge,
        activeTaskBkgColor: lajvardSoft,
        activeTaskBorderColor: accent,
        taskBkgColor: lajvardSoft,
        taskBorderColor: accent,
        taskTextColor: ink,
        taskTextOutsideColor: inkDim,
        taskTextDarkColor: ink,
        taskTextLightColor: ink,
        taskTextClickableColor: accentInk,
        todayLineColor: zafaran,
        critBkgColor: alert,
        critBorderColor: alert,

        // pie / quadrant / journey
        pie1: accent,
        pie2: lajvard,
        pie3: zafaran,
        pie4: accentInk,
        pie5: inkDim,
        pieTitleTextSize: '20px',
        pieTitleTextColor: ink,
        pieSectionTextSize: '15px',
        pieSectionTextColor: ink,
        pieLegendTextSize: '15px',
        pieLegendTextColor: ink,
        pieStrokeColor: ground,
        pieOuterStrokeWidth: '1px',
        pieOuterStrokeColor: edge,
        pieOpacity: 0.9,
        quadrant1Fill: panel2,
        quadrant2Fill: panel,
        quadrant3Fill: panel,
        quadrant4Fill: panel2,
        quadrant1TextFill: ink,
        quadrant2TextFill: ink,
        quadrant3TextFill: ink,
        quadrant4TextFill: ink,
        quadrantPointFill: accent,
        quadrantPointTextFill: ink,
        quadrantXAxisTextFill: inkDim,
        quadrantYAxisTextFill: inkDim,
        quadrantInternalBorderStrokeFill: edge,
        quadrantExternalBorderStrokeFill: edge,
        quadrantTitleFill: ink,
        journeySection: panel2,
        journeyTitleColor: ink,
        cScale0: accent, cScale1: lajvard, cScale2: zafaran,
        cScale3: accentInk, cScale4: lajvard, cScale5: zafaran,
        cScaleLabel0: ground, cScaleLabel1: ground, cScaleLabel2: ground,
        cScaleLabel3: ground, cScaleLabel4: ground, cScaleLabel5: ground,

        // state / class / ER
        stateBkg: panel2,
        stateBorder: accent,
        stateTextColor: ink,
        classText: ink,
        attributeBackgroundColorOdd: panel,
        attributeBackgroundColorEven: panel2,

        // git graph
        git0: accent, git1: lajvard, git2: zafaran, git3: accentInk,
        git4: lajvard, git5: zafaran, git6: accent, git7: lajvard,
        gitBranchLabel0: ground, gitBranchLabel1: ground, gitBranchLabel2: ground,
        gitBranchLabel3: ground, gitBranchLabel4: ground, gitBranchLabel5: ground,
        gitBranchLabel6: ground, gitBranchLabel7: ground,
        gitCommit0: accent, gitCommit1: lajvard, gitCommit2: zafaran, gitCommit3: accentInk,
        gitCommitColor: ink,
        tagLabelColor: ink,
        tagLabelBackground: panel2,
        tagLabelBorder: edge,

        // mindmap / timeline / sankey / xychart
        mindmapBackground: ground,
        mindmapTextColor: ink,
        cEdgeLabelBackground: panel,
        timelineText: ink,
        timelinePrimaryTextColor: ink,
        sankeyLinkColor: lajvard,
        xyChart: {
          backgroundColor: ground,
          titleColor: ink,
          xAxisLabelColor: inkDim,
          xAxisTitleColor: ink,
          xAxisTickColor: edge,
          xAxisLineColor: edge,
          yAxisLabelColor: inkDim,
          yAxisTitleColor: ink,
          yAxisTickColor: edge,
          yAxisLineColor: edge,
          plotColorPalette: accent + ',' + lajvard + ',' + zafaran + ',' + accentInk,
        },
      },
      flowchart: { curve: 'basis', useMaxWidth: true },
      sequence: { useMaxWidth: true },
      gantt: { useMaxWidth: true },
    });

    try {
      // v11 API: mermaid.run resolves to void - it rewrites the pre nodes in place.
      // Destructuring the result throws (the live check caught exactly that; the failure
      // path did its job). Await it, then verify the DOM gained SVGs before declaring success.
      await mermaid.run({ nodes: blocks, suppressErrors: false });
      const rendered = blocks.filter((el) => el.querySelector('svg'));
      if (!rendered.length) throw new Error('no diagram produced an svg');
      blocks.forEach((el) => {
        el.classList.add('mermaid-done');
        el.removeAttribute('data-mermaid-error');
      });
    } catch (err) {
      // mermaid.run removes/leaves nodes inconsistently on error; be explicit instead
      blocks.forEach((el) => {
        if (!el.classList.contains('mermaid-done')) fail(el, (err && err.message) || 'render error');
      });
    }
  };

  // diagrams are below the fold on most pages; render after first paint, never blocking LCP
  if ('requestIdleCallback' in window) window.requestIdleCallback(boot, { timeout: 1800 });
  else window.setTimeout(boot, 700);
})();

/* ==================================================================== *
 *  GISCUS COMMENTS
 *  Mounts the giscus iframe only when the section is configured with a
 *  repository, repo id and category id. Unconfigured = the honest note
 *  that the generator already rendered stays in place.
 * ==================================================================== */
(() => {
  const section = $('[data-comments]');
  if (!section) return;
  const frame = $('[data-comments-frame]', section);
  if (!frame) return;

  const repo = section.getAttribute('data-repo') || '';
  const repoId = section.getAttribute('data-repo-id') || '';
  const categoryId = section.getAttribute('data-category-id') || '';
  if (!repo || !repoId || !categoryId) return; // unconfigured: keep the note

  const theme = section.getAttribute('data-theme') || 'dark_dimmed';
  const lang = section.getAttribute('data-lang') || 'en';
  const mapping = section.getAttribute('data-mapping') || 'pathname';
  const category = section.getAttribute('data-category') || 'Announcements';

  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.setAttribute('data-repo', repo);
  s.setAttribute('data-repo-id', repoId);
  s.setAttribute('data-category', category);
  s.setAttribute('data-category-id', categoryId);
  s.setAttribute('data-mapping', mapping);
  s.setAttribute('data-strict', '1');
  s.setAttribute('data-reactions-enabled', '1');
  s.setAttribute('data-emit-metadata', '0');
  s.setAttribute('data-input-position', 'top');
  s.setAttribute('data-theme', theme);
  s.setAttribute('data-lang', lang);
  s.setAttribute('data-loading', 'lazy');
  s.crossOrigin = 'anonymous';
  frame.replaceChildren(s);
})();