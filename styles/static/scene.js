// Obsidian-style graph rewrite for the StaticBlaze field. Replaces the old
// tag-ring + random spread layout with a deterministic, force-relaxed graph:
//   nodes = posts, edges = shared tags, laid out by a tiny verlet integrator.
// Design goals (from the user's ask: "obsidian style graph or better"):
//   - a flat-ish graph that reads like a knowledge map, not a starfield
//   - node size encodes degree (how connected a post is)
//   - tag hubs get their own colour + a subtle halo
//   - labels on hover, like Obsidian's graph view
//   - everything stays deterministic per-build (hash-seeded), so the graph is
//     identical on every visitor's machine and reproducible in CI.
// The scene contract is unchanged: data from #scene-data, palette from CSS
// tokens, `data-scene` state machine, reduced-motion/static fallbacks, and the
// frame loop that pauses on hidden tabs.

const DATA_ID = 'scene-data';

function readData() {
  const el = document.getElementById(DATA_ID);
  try { return JSON.parse(el?.textContent || '{}'); } catch { return {}; }
}

function capabilities() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4;
  const narrow = window.matchMedia('(max-width: 640px)').matches;
  if (reduced) return { ok: false, reason: 'reduced-motion' };
  if (saveData) return { ok: false, reason: 'save-data' };
  const c = document.createElement('canvas');
  const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return { ok: false, reason: 'no-webgl' };
  if (lowMem || narrow) return { ok: false, reason: 'small-viewport' };
  return { ok: true };
}

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const unit = (n) => (n % 1000) / 1000;

/* ====================================================================== *
 *  Deterministic PRNG (mulberry32) - same seed, same graph, every build
 * ====================================================================== */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ====================================================================== *
 *  GRAPH LAYOUT - force-relaxed, deterministic
 *  Posts repel each other, edges pull shared-tag pairs together, and tag
 *  hubs act as soft attractors. ~120 iterations is plenty for <50 posts and
 *  costs nothing because it runs once at boot, not per frame.
 * ====================================================================== */
let tagGroups;
function buildGraph(posts, rand) {
  tagGroups = new Map();
  const nodes = posts.map((p) => ({
    slug: p.slug,
    title: p.title,
    tags: p.tags || [],
    category: p.category,
    featured: !!p.featured,
    x: (rand() - 0.5) * 44,
    y: (rand() - 0.5) * 22,
    z: (rand() - 0.5) * 30,
    vx: 0, vy: 0, vz: 0,
    degree: 0,
    degreeIn: 0,
    hub: null,
  }));

  const index = new Map(nodes.map((n) => [n.slug, n]));
  for (const n of nodes) {
    for (const t of n.tags.length ? n.tags : [n.category || 'misc']) {
      if (!tagGroups.has(t)) tagGroups.set(t, []);
      tagGroups.get(t).push(n);
    }
  }

  const edges = [];
  const seen = new Set();
  for (const [, group] of tagGroups) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i], b = group[j];
        const key = a.slug < b.slug ? `${a.slug}|${b.slug}` : `${b.slug}|${a.slug}`;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([a, b]);
        a.degree++; b.degree++;
      }
    }
  }

  // hubs = tags that bind more than two posts; they get their own colour + halo
  const hubs = [...tagGroups.entries()].filter(([, g]) => g.length > 2).map(([tag]) => tag);
  for (const n of nodes) n.hub = n.tags.find((t) => hubs.includes(t)) || null;

  // relaxation: repulsion (all pairs), spring (edges), mild centre gravity
  const REP = 190, SPRING = 0.028, REST = 13, GRAV = 0.012, DAMP = 0.86, ITER = 120;
  for (let iter = 0; iter < ITER; iter++) {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < 1e-4) { dx = rand() - 0.5; dy = rand() - 0.5; dz = rand() - 0.5; d2 = dx*dx+dy*dy+dz*dz; }
        const f = REP / Math.max(1, d2);
        const d = Math.sqrt(d2) || 1;
        const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
        a.vx -= fx; a.vy -= fy; a.vz -= fz;
        b.vx += fx; b.vy += fy; b.vz += fz;
      }
    }
    for (const [a, b] of edges) {
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const f = (d - REST) * SPRING;
      const fx = (dx / d) * f, fy = (dy / d) * f, fz = (dz / d) * f;
      a.vx += fx; a.vy += fy; a.vz += fz;
      b.vx -= fx; b.vy -= fy; b.vz -= fz;
    }
    for (const n of nodes) {
      n.vx -= n.x * GRAV; n.vy -= n.y * GRAV; n.vz -= n.z * GRAV * 0.6;
      n.vx *= DAMP; n.vy *= DAMP; n.vz *= DAMP;
      n.x += n.vx; n.y += n.vy; n.z += n.vz;
    }
  }

  // normalise: centre the graph and scale it into the stage's frame
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cy = nodes.reduce((s, n) => s + n.y, 0) / nodes.length;
  const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length;
  let maxR = 1;
  for (const n of nodes) {
    n.x -= cx; n.y -= cy; n.z -= cz;
    maxR = Math.max(maxR, Math.hypot(n.x, n.y * 1.6, n.z));
  }
  const scale = 21 / maxR;
  for (const n of nodes) { n.x *= scale; n.y *= scale * 0.62; n.z *= scale; }
  return { nodes, edges, hubs };
}

(async () => {
  const root = document.documentElement;
  const stage = document.querySelector('.stage');
  const cap = capabilities();
  if (!stage || !cap.ok) {
    root.dataset.scene = cap.reason;
    return;
  }

  let THREE;
  try {
    THREE = await import('./vendor/three.module.min.js');
  } catch {
    root.dataset.scene = 'module-failed';
    return;
  }
  root.dataset.scene = 'live';

  const data = readData();
  const posts = data?.posts ?? [];
  const current = data?.post?.slug || null;

  const css = getComputedStyle(root);
  const hex = (name, fallback) => {
    const v = css.getPropertyValue(name).trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v) ? v : fallback;
  };
  const C_ACCENT  = new THREE.Color(hex('--accent', '#57c5c6'));
  const C_LAJVARD = new THREE.Color(hex('--lajvard', '#4a5cff'));
  const C_ZAFARAN = new THREE.Color(hex('--zafaran', '#f5a524'));
  const C_GROUND  = new THREE.Color(hex('--ground', '#06070d'));
  const C_INK     = new THREE.Color(hex('--ink', '#e9ecf5'));

  const canvas = stage.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(C_GROUND, 0);
  const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 400);
  camera.position.set(0, 6, 46);
  camera.lookAt(0, 0, 0);

  const field = new THREE.Group();
  scene.add(field);

  const rand = mulberry32(hash(JSON.stringify(posts.map((p) => p.slug))));
  const { nodes, edges, hubs } = buildGraph(posts, rand);

  const maxDegree = Math.max(1, ...nodes.map((n) => n.degree));

  /* nodes: round sprites, size = f(degree), obsidian-ish palette */
  const nodePos = [], nodeCol = [], nodeSize = [];
  for (const n of nodes) {
    nodePos.push(n.x, n.y, n.z);
    const base = n.hub ? C_ZAFARAN : new THREE.Color().lerpColors(C_LAJVARD, C_ACCENT, unit(hash(n.slug) >> 9));
    if (n.featured) base.lerp(C_ZAFARAN, 0.35);
    const c = base.clone().multiplyScalar(0.75 + 0.25 * (n.degree / maxDegree));
    nodeCol.push(c.r, c.g, c.b);
    nodeSize.push(2.1 + 2.6 * (n.degree / maxDegree) + (n.featured ? 0.7 : 0));
    n.color = c;
  }

  const sprite = (() => {
    const s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.32, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.28)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();

  const bg = new THREE.BufferGeometry();
  bg.setAttribute('position', new THREE.Float32BufferAttribute(nodePos, 3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(nodeCol, 3));
  bg.setAttribute('size', new THREE.Float32BufferAttribute(nodeSize, 1));

  // per-node size needs a tiny shader; PointsMaterial alone cannot do it
  const nodeMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMap: { value: sprite }, uScale: { value: window.innerHeight * 0.5 } },
    vertexShader: `
      attribute float size;
      varying vec3 vColor;
      uniform float uScale;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (uScale / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uMap;
      varying vec3 vColor;
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        gl_FragColor = vec4(vColor, 1.0) * tex;
      }`,
    vertexColors: true,
  });
  const points = new THREE.Points(bg, nodeMat);
  field.add(points);

  /* edges: hairline curves, brighter between strongly connected posts */
  const edgePos = [];
  for (const [a, b] of edges) {
    edgePos.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  const edgeMat = new THREE.LineBasicMaterial({
    color: C_ACCENT, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  field.add(new THREE.LineSegments(eg, edgeMat));

  /* tag hub labels: always-on, tiny, like Obsidian's graph labels */
  const labelCanvas = document.createElement('canvas');
  const makeLabel = (text) => {
    const pad = 10;
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    g.font = '500 26px ' + (css.getPropertyValue('--family-sans') || 'system-ui');
    const w = Math.ceil(g.measureText(text).width) + pad * 2;
    c.width = w; c.height = 44;
    const g2 = c.getContext('2d');
    g2.font = '500 26px ' + (css.getPropertyValue('--family-sans') || 'system-ui');
    g2.fillStyle = 'rgba(233,236,245,0.92)';
    g2.textBaseline = 'middle';
    g2.fillText(text, pad, c.height / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { tex, aspect: c.width / c.height };
  };
  const labelGroup = new THREE.Group();
  for (const tag of hubs.slice(0, 12)) {
    const { tex, aspect } = makeLabel(tag);
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.85, depthWrite: false });
    const sp = new THREE.Sprite(m);
    const members = nodes.filter((n) => n.tags.includes(tag));
    const cx = members.reduce((s, n) => s + n.x, 0) / members.length;
    const cy = members.reduce((s, n) => s + n.y, 0) / members.length;
    const cz = members.reduce((s, n) => s + n.z, 0) / members.length;
    const h = 1.5;
    sp.scale.set(h * aspect, h, 1);
    sp.position.set(cx, cy + 2.6, cz);
    sp.userData.tag = tag;
    labelGroup.add(sp);
  }
  field.add(labelGroup);

  /* pointer: parallax + hover pick */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: 2.2 };
  const ndc = new THREE.Vector2(-2, -2);
  let hovered = null;

  const showTitle = (text) => {
    let tip = document.querySelector('[data-graph-tip]');
    if (!text) { if (tip) tip.remove(); return; }
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'graph-tip';
      tip.setAttribute('data-graph-tip', '');
      tip.setAttribute('aria-hidden', 'true');
      stage.appendChild(tip);
    }
    tip.textContent = text;
  };

  const pick = () => {
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(points)[0];
    const idx = hit ? hit.index : -1;
    const node = idx >= 0 ? nodes[idx] : null;
    if (node !== hovered) {
      hovered = node;
      showTitle(node ? `${node.title}` : '');
      document.documentElement.dataset.graphHover = node ? 'on' : 'off';
      // dim everything except the hovered node's neighbourhood
      const keep = node ? new Set([node.slug, ...node.tags]) : null;
      const col = bg.getAttribute('color');
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dim = node && !keep.has(n.slug) && !(n.tags.some((t) => keep.has(t)));
        const c = dim ? n.color.clone().multiplyScalar(0.22) : n.color;
        col.setXYZ(i, c.r, c.g, c.b);
      }
      col.needsUpdate = true;
    }
  };

  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }, { passive: true });

  /* resize */
  const resize = () => {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    renderer.setPixelRatio(dpr());
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    nodeMat.uniforms.uScale.value = h * 0.5;
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* scroll progress: camera dollies in as the page scrolls (ScrollTrigger-set, not scroll events) */
  let progress = 0;
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { progress = self.progress; },
    });
  }

  /* ================================================================== *
   *  FRAME LOOP - stops when the tab is hidden
   * ================================================================== */
  let running = true;
  let t = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = () => {
    if (!running) return;
    t += reduced ? 0.0009 : 0.0028;
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    // slow drift + parallax; the graph slowly rotates like Obsidian's idle view
    field.rotation.y = t * 0.6 + pointer.x * 0.28;
    field.rotation.x = -0.12 - pointer.y * 0.16;
    field.position.y = Math.sin(t * 0.9) * 0.5;
    camera.position.z = 46 - progress * 16;
    camera.position.y = 6 - progress * 4 - pointer.y * 1.7;
    camera.position.x = pointer.x * 2.4;
    camera.lookAt(0, 0, 0);
    pick();
    renderer.render(scene, camera);

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; requestAnimationFrame(loop); }
  });

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    root.dataset.scene = 'context-lost';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    root.dataset.scene = 'live';
    running = true;
    requestAnimationFrame(loop);
  }, { once: true });
})();
