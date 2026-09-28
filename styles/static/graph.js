// StaticBlaze related-posts graph.
//
// An interactive SVG graph of the posts this article links to: the current post is the central
// node, each linked post is a node the reader can click to navigate. Nodes are draggable, the
// whole graph zooms with +/- buttons, and a hover highlight dims everything outside a node's
// neighbourhood.
//
// Contract:
//   - reads { self, links } from #post-graph-data (written by the generator)
//   - upgrades [data-graph-stage]; the static <ul> fallback already has the real links for no-JS
//   - no links => leave the generator's empty note alone, draw nothing
//   - reduced motion => everything appears at once, no animation
//   - nodes are real <a href> elements: middle-click, cmd-click and keyboard all navigate
//
// Interaction notes:
//   - hover uses pointerenter/pointerleave on each anchor, not mouseover on the root: the root
//     approach re-fired whenever the cursor crossed a child element, which is what made the
//     highlight flicker near node edges.
//   - drag suppresses the click that would otherwise navigate, using a short-lived marker.
//   - zoom is a transform on a viewport group (clamped), so it composes with dragging instead of
//     fighting it.

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

  // No linked posts: the generator already rendered the empty note; draw nothing.
  if (!links.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(document.documentElement);
  const token = (name, fallback) => (css.getPropertyValue(name) || '').trim() || fallback;
  const ACCENT = token('--accent', '#57c5c6');
  const INK = token('--ink', '#e9ecf5');
  const INK_DIM = token('--ink-dim', '#98a0bd');
  const MONO = token('--family-mono', 'ui-monospace, monospace');

  const fallback = stage.querySelector('[data-graph-fallback]');
  if (fallback) fallback.hidden = true;

  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 800 600');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Graph of posts linked from ${self.title}`);
  svg.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
  stage.appendChild(svg);

  // zoom target: everything lives inside this group
  const viewport = document.createElementNS(NS, 'g');
  viewport.setAttribute('id', 'graph-viewport');
  svg.appendChild(viewport);

  const defs = document.createElementNS(NS, 'defs');
  const glow = document.createElementNS(NS, 'radialGradient');
  glow.id = 'node-glow';
  const g0 = document.createElementNS(NS, 'stop'); g0.setAttribute('offset', '0'); g0.setAttribute('stop-color', ACCENT); g0.setAttribute('stop-opacity', '0.32');
  const g1 = document.createElementNS(NS, 'stop'); g1.setAttribute('offset', '1'); g1.setAttribute('stop-color', ACCENT); g1.setAttribute('stop-opacity', '0');
  glow.appendChild(g0); glow.appendChild(g1);
  defs.appendChild(glow);
  svg.appendChild(defs);

  // ---- layout ---------------------------------------------------------
  const CX = 400, CY = 300, R = 190;
  const n = links.length;
  const pos = (i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  };

  const edgeLayer = document.createElementNS(NS, 'g');
  const nodeLayer = document.createElementNS(NS, 'g');
  viewport.appendChild(edgeLayer);
  viewport.appendChild(nodeLayer);

  const makeLabel = (text, max = 30, size = 13) => {
    const t = text.length > max ? text.slice(0, max - 1) + '…' : text;
    const el = document.createElementNS(NS, 'text');
    el.textContent = t;
    el.setAttribute('font-family', MONO);
    el.setAttribute('font-size', String(size));
    el.setAttribute('fill', INK_DIM);
    el.setAttribute('text-anchor', 'middle');
    el.setAttribute('pointer-events', 'none');
    el.setAttribute('class', 'glabel');
    return el;
  };

  const nodes = [];
  links.forEach((link, i) => {
    const p = pos(i);
    const a = document.createElementNS(NS, 'a');
    a.setAttribute('href', link.url);
    a.setAttribute('data-node', '');
    const g = document.createElementNS(NS, 'g');
    g.classList.add('gnode');

    // the edge belongs to the node so dragging only has to update one pair of endpoints
    const edge = document.createElementNS(NS, 'line');
    edge.setAttribute('x1', CX); edge.setAttribute('y1', CY);
    edge.setAttribute('x2', p.x); edge.setAttribute('y2', p.y);
    edge.setAttribute('class', 'gedge');
    edge.setAttribute('pointer-events', 'none');
    edgeLayer.appendChild(edge);

    // a hit target that matches the visible node (a larger invisible disc made hover fire
    // noticeably early, which read as a bug when the cursor was merely near a node)
    const hit = document.createElementNS(NS, 'circle');
    hit.setAttribute('r', '21');
    hit.setAttribute('fill', 'transparent');
    hit.setAttribute('pointer-events', 'all');
    g.appendChild(hit);

    const halo = document.createElementNS(NS, 'circle');
    halo.setAttribute('r', '30'); halo.setAttribute('fill', 'url(#node-glow)');
    halo.setAttribute('pointer-events', 'none');
    g.appendChild(halo);

    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', '13'); dot.setAttribute('class', 'gdot');
    dot.setAttribute('pointer-events', 'none');
    g.appendChild(dot);

    const ring = document.createElementNS(NS, 'circle');
    ring.setAttribute('r', '19'); ring.setAttribute('class', 'gring');
    ring.setAttribute('pointer-events', 'none');
    g.appendChild(ring);

    const label = makeLabel(link.title);
    g.appendChild(label);

    const node = { a, g, hit, halo, dot, ring, label, edge, x: p.x, y: p.y, dragging: false, moved: false, offX: 0, offY: 0 };
    const paint = () => {
      // the hit disc must follow the node: leaving it at the origin is what made the whole
      // node surface unclickable and the cursor feel wrong around the edges
      hit.setAttribute('cx', node.x); hit.setAttribute('cy', node.y);
      dot.setAttribute('cx', node.x); dot.setAttribute('cy', node.y);
      ring.setAttribute('cx', node.x); ring.setAttribute('cy', node.y);
      halo.setAttribute('cx', node.x); halo.setAttribute('cy', node.y);
      label.setAttribute('x', node.x); label.setAttribute('y', node.y + 40);
      edge.setAttribute('x2', node.x); edge.setAttribute('y2', node.y);
    };
    paint();
    node.paint = paint;

    // ---- dragging ------------------------------------------------------
    const toUser = (ev) => {
      const pt = svg.createSVGPoint();
      pt.x = ev.clientX; pt.y = ev.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    const down = (ev) => {
      if (ev.button !== 0) return;
      const pt = toUser(ev);
      node.offX = pt.x - node.x; node.offY = pt.y - node.y;
      node.dragging = true; node.moved = false;
      g.classList.add('is-dragging');
      try { a.setPointerCapture(ev.pointerId); } catch { /* older engines */ }
      ev.preventDefault();
    };
    const move = (ev) => {
      if (!node.dragging) return;
      const pt = toUser(ev);
      const nx = pt.x - node.offX, ny = pt.y - node.offY;
      if (Math.hypot(nx - node.x, ny - node.y) > 3) node.moved = true;
      node.x = nx; node.y = ny;
      node.paint();
      ev.preventDefault();
    };
    const up = (ev) => {
      if (!node.dragging) return;
      node.dragging = false;
      g.classList.remove('is-dragging');
      try { a.releasePointerCapture(ev.pointerId); } catch { /* ignore */ }
      if (node.moved) a.dataset.dragged = '1';
    };
    a.addEventListener('pointerdown', down);
    a.addEventListener('pointermove', move);
    a.addEventListener('pointerup', up);
    a.addEventListener('pointercancel', up);
    // a drag must not navigate
    a.addEventListener('click', (ev) => {
      if (a.dataset.dragged) { ev.preventDefault(); delete a.dataset.dragged; }
    });

    // ---- hover (per-anchor, so crossing children cannot flicker it) ----
    a.addEventListener('pointerenter', () => {
      if (node.dragging) return;
      nodes.forEach((other) => {
        const isSelf = other === node;
        other.g.style.opacity = isSelf ? '1' : '0.3';
        if (isSelf) other.g.style.transform = 'scale(1.06)';
      });
      node.label.classList.add('is-hot');
    });
    a.addEventListener('pointerleave', () => {
      if (node.dragging) return;
      nodes.forEach((other) => { other.g.style.opacity = ''; other.g.style.transform = ''; });
      node.label.classList.remove('is-hot');
    });

    a.appendChild(g);
    nodeLayer.appendChild(a);
    nodes.push(node);
  });

  // ---- centre node ----------------------------------------------------
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
  const cLabel = makeLabel(self.title, 34, 14);
  cLabel.setAttribute('x', CX); cLabel.setAttribute('y', CY + 56);
  cLabel.setAttribute('fill', INK);
  cg.appendChild(cLabel);
  const cTag = document.createElementNS(NS, 'text');
  cTag.textContent = 'this post';
  cTag.setAttribute('x', CX); cTag.setAttribute('y', CY - 40);
  cTag.setAttribute('font-family', MONO); cTag.setAttribute('font-size', '11');
  cTag.setAttribute('fill', ACCENT); cTag.setAttribute('text-anchor', 'middle');
  cTag.setAttribute('letter-spacing', '0.14em');
  cg.appendChild(cTag);
  nodeLayer.appendChild(cg);

  // ---- zoom -----------------------------------------------------------
  // A transform on the viewport group, around the graph centre, so nothing needs pan bookkeeping
  // and dragging keeps working in user units. Clamped; the buttons reflect the clamp.
  const ZOOM_MIN = 0.7, ZOOM_MAX = 1.8, ZOOM_STEP = 0.15;
  let zoom = 1;
  const applyZoom = () => {
    viewport.setAttribute('transform', `translate(${CX} ${CY}) scale(${zoom}) translate(${-CX} ${-CY})`);
    zoomIn.disabled = zoom >= ZOOM_MAX - 1e-6;
    zoomOut.disabled = zoom <= ZOOM_MIN + 1e-6;
  };
  const mkButton = (label, which, title) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'g-zoom';
    b.dataset.zoom = which;
    b.textContent = label;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(zoom + (which === 'in' ? ZOOM_STEP : -ZOOM_STEP)).toFixed(2)));
      applyZoom();
    });
    root.appendChild(b);
    return b;
  };
  const zoomIn = mkButton('+', 'in', 'zoom in');
  const zoomOut = mkButton('−', 'out', 'zoom out');
  applyZoom();

  // ---- entrance -------------------------------------------------------
  if (!reduced && window.gsap) {
    const els = [cg, ...nodeLayer.querySelectorAll('a[data-node]')];
    gsap.set(els, { opacity: 0, scale: 0.6, transformOrigin: '50% 50%' });
    gsap.to(els, { opacity: 1, scale: 1, duration: 0.55, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' });
    gsap.fromTo(edgeLayer.querySelectorAll('.gedge'), { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: 0.15, stagger: 0.05 });
  }
})();
