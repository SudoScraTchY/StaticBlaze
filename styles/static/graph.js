// StaticBlaze related-posts graph.
//
// Replaces the old per-article "signal" canvas with an interactive graph of the posts that the
// article actually links to: the current post is the central node, each linked post is a node the
// reader can click to navigate. It is drawn as SVG (crisp at any DPI, real <a href> nodes so
// middle-click / cmd-click / keyboard all work), laid out on a ring around the centre, with a
// gentle staggered entrance.
//
// Contract:
//   - reads { self, links } from #post-graph-data (written by the generator)
//   - upgrades [data-graph-stage]; the static <ul> fallback already has the real links for no-JS
//   - reduced motion => everything appears at once, no animation
//   - a post with no links shows the empty note the generator already rendered

(() => {
  const root = document.querySelector('[data-post-graph]');
  if (!root) return;
  const stage = root.querySelector('[data-graph-stage]');
  if (!stage) return;

  const payloadEl = document.getElementById('post-graph-data');
  let payload = null;
  try { payload = JSON.parse(payloadEl?.textContent || '{}'); } catch { payload = null; }
  const self = payload?.self;
  const links = Array.isArray(payload?.links) ? payload.links : [];
  if (!self) return;

  // No linked posts: the generator already rendered the empty note; do not draw a lone self node.
  if (!links.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
  const ACCENT = token('--accent', '#57c5c6');
  const INK = token('--ink', '#e9ecf5');
  const INK_DIM = token('--ink-dim', '#98a0bd');
  const INK_FAINT = token('--ink-faint', '#7d86a7');
  const LAJVARD = token('--lajvard', '#4a5cff');
  const MONO = token('--family-mono', 'ui-monospace, monospace');

  // hide the static fallback list once the graph takes over
  const fallback = stage.querySelector('[data-graph-fallback]');
  if (fallback) fallback.hidden = true;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 600');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Graph of posts linked from ${self.title}`);
  svg.style.cssText = 'width:100%;height:100%;display:block';
  stage.appendChild(svg);

  const defs = document.createElementNS(NS, 'defs');
  const glow = document.createElementNS(NS, 'radialGradient');
  glow.id = 'node-glow';
  const g0 = document.createElementNS(NS, 'stop'); g0.setAttribute('offset', '0'); g0.setAttribute('stop-color', ACCENT); g0.setAttribute('stop-opacity', '0.32');
  const g1 = document.createElementNS(NS, 'stop'); g1.setAttribute('offset', '1'); g1.setAttribute('stop-color', ACCENT); g1.setAttribute('stop-opacity', '0');
  glow.appendChild(g0); glow.appendChild(g1);
  defs.appendChild(glow);
  svg.appendChild(defs);

  // --- layout ---------------------------------------------------------
  const CX = 400, CY = 300, R = 190;
  const n = links.length;
  const pos = (i) => {
    if (n === 0) return null;
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  };

  // --- edges + nodes ---------------------------------------------------
  const edgeLayer = document.createElementNS(NS, 'g');
  const nodeLayer = document.createElementNS(NS, 'g');
  svg.appendChild(edgeLayer);
  svg.appendChild(nodeLayer);

  const makeLabel = (text, max = 30) => {
    const t = text.length > max ? text.slice(0, max - 1) + '…' : text;
    const el = document.createElementNS(NS, 'text');
    el.textContent = t;
    el.setAttribute('font-family', MONO);
    el.setAttribute('font-size', '13');
    el.setAttribute('fill', INK_DIM);
    el.setAttribute('text-anchor', 'middle');
    return el;
  };

  const nodes = [];
  links.forEach((link, i) => {
    const p = pos(i);
    if (!p) return;
    const a = document.createElementNS(NS, 'a');
    a.setAttribute('href', link.url);
    a.setAttribute('data-node', '');
    const g = document.createElementNS(NS, 'g');
    g.classList.add('gnode');

    // transparent hit target so the whole node area is reliably clickable
    const hit = document.createElementNS(NS, "circle");
    hit.setAttribute("r", "36");
    hit.setAttribute("fill", "transparent");
    hit.setAttribute("pointer-events", "all");
    g.appendChild(hit);

    // soft halo behind each node
    const halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('r', '30'); halo.setAttribute('fill', 'url(#node-glow)');
    g.appendChild(halo);

    // edge from centre to node
    const edge = document.createElementNS(NS, 'line');
    edge.setAttribute('x1', CX); edge.setAttribute('y1', CY);
    edge.setAttribute('x2', p.x); edge.setAttribute('y2', p.y);
    edge.setAttribute('class', 'gedge');
    edgeLayer.appendChild(edge);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
    dot.setAttribute('r', '13');
    dot.setAttribute('class', 'gdot');
    g.appendChild(dot);

    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('cx', p.x); ring.setAttribute('cy', p.y);
    ring.setAttribute('r', '19');
    ring.setAttribute('class', 'gring');
    g.appendChild(ring);

    const label = makeLabel(link.title);
    label.setAttribute('x', p.x); label.setAttribute('y', p.y + 40);
    label.setAttribute('class', 'glabel');
    g.appendChild(label);

    // store geometry for hover spotlight
    g.dataset.x = p.x; g.dataset.y = p.y;
    a.appendChild(g);
    nodeLayer.appendChild(a);
    nodes.push({ a, g, x: p.x, y: p.y });
  });

  // --- centre node -----------------------------------------------------
  const cg = document.createElementNS(NS, 'g');
  cg.classList.add('gnode', 'gnode-self');
  const cHalo = document.createElementNS(NS, 'circle');
  cHalo.setAttribute('r', '54'); cHalo.setAttribute('fill', 'url(#node-glow)');
  cg.appendChild(cHalo);
  const cDot = document.createElementNS(NS, 'circle');
  cDot.setAttribute('cx', CX); cDot.setAttribute('cy', CY); cDot.setAttribute('r', '22');
  cDot.setAttribute('class', 'gdot gdot-self');
  cg.appendChild(cDot);
  const cRing = document.createElementNS(NS, 'circle');
  cRing.setAttribute('cx', CX); cRing.setAttribute('cy', CY); cRing.setAttribute('r', '30');
  cRing.setAttribute('class', 'gring gring-self');
  cg.appendChild(cRing);
  const cLabel = makeLabel(self.title, 34);
  cLabel.setAttribute('x', CX); cLabel.setAttribute('y', CY + 56);
  cLabel.setAttribute('fill', INK);
  cLabel.setAttribute('font-size', '14');
  cg.appendChild(cLabel);
  const cTag = document.createElementNS(NS, 'text');
  cTag.textContent = 'this post';
  cTag.setAttribute('x', CX); cTag.setAttribute('y', CY - 40);
  cTag.setAttribute('font-family', MONO); cTag.setAttribute('font-size', '11');
  cTag.setAttribute('fill', ACCENT); cTag.setAttribute('text-anchor', 'middle');
  cTag.setAttribute('letter-spacing', '0.14em'); cTag.setAttribute('text-transform', 'uppercase');
  cg.appendChild(cTag);
  nodeLayer.appendChild(cg);

  // --- hover spotlight: dim everything but the hovered node's neighbourhood ----
  if (nodes.length) {
    root.addEventListener('mouseover', (e) => {
      const a = e.target.closest('[data-node]');
      if (!a) return;
      const keep = a;
      nodes.forEach((n) => {
        const other = n.a !== keep;
        n.g.style.opacity = other ? '0.28' : '1';
        n.g.style.transform = other ? 'scale(0.9)' : 'scale(1.08)';
      });
    });
    root.addEventListener('mouseout', (e) => {
      const a = e.target.closest('[data-node]');
      if (!a) return;
      nodes.forEach((n) => { n.g.style.opacity = ''; n.g.style.transform = ''; });
    });
  }

  // --- entrance ---------------------------------------------------------
  if (!reduced && window.gsap) {
    const els = [cg, ...nodeLayer.querySelectorAll('a[data-node]')];
    els.forEach((el) => gsap.set(el, { opacity: 0, scale: 0.6 }));
    gsap.to(els, { opacity: 1, scale: 1, duration: 0.55, ease: 'expo.out', stagger: 0.07 });
    gsap.fromTo(edgeLayer.querySelectorAll('.gedge'), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.15, stagger: 0.05 });
  }
})();
