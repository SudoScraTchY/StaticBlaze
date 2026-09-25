// StaticBlaze 3D layer - Three.js, dynamically imported so it never delays first paint.
//
// What the scene is, and why it exists:
//   The hero renders THE ARCHIVE ITSELF as a field. One glowing node per published post, placed
//   deterministically from its slug, clustered by its dominant tag, with edges drawn between posts
//   that share a tag. It is not a decorative particle blob: change the content and the shape changes.
//   The article header renders a per-post signal object seeded from the slug, so every article has
//   its own geometry and the same article always looks the same.
//
// Rubric compliance (Leonxlnx/taste-skill section 6):
//   only transform/opacity plus WebGL matrices are animated; frame loop stops when the tab is hidden;
//   device pixel ratio is capped; reduced motion, save-data, low memory and small viewports all skip
//   the layer entirely and keep the CSS atmosphere.

const DATA_ID = 'scene-data';

function readData() {
  const el = document.getElementById(DATA_ID);
  if (!el) return null;
  try { return JSON.parse(el.textContent || 'null'); } catch { return null; }
}

function capabilities() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = navigator.connection?.saveData === true;
  const lowMem = typeof navigator.deviceMemory === 'number' && navigator.deviceMemory < 4;
  const narrow = window.matchMedia('(max-width: 640px)').matches;
  let webgl = false;
  try {
    const c = document.createElement('canvas');
    webgl = !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { webgl = false; }
  return {
    ok: webgl && !reduced && !saveData && !lowMem && !narrow,
    reason: !webgl ? 'no-webgl' : reduced ? 'reduced-motion' : saveData ? 'save-data'
      : lowMem ? 'low-memory' : narrow ? 'small-viewport' : 'ok',
  };
}

// deterministic hash so the same slug always lands in the same place
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const unit = (n) => (n % 1000) / 1000;

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

  /* ================================================================== *
   *  Palette pulled from the same tokens the CSS uses
   * ================================================================== */
  const css = getComputedStyle(root);
  const hex = (name, fallback) => {
    const v = css.getPropertyValue(name).trim();
    return v.startsWith('#') ? v : fallback;
  };
  const C_ACCENT = new THREE.Color(hex('--accent', '#57c5c6'));
  const C_LAJVARD = new THREE.Color(hex('--lajvard', '#4a5cff'));
  const C_ZAFARAN = new THREE.Color(hex('--zafaran', '#f5a524'));
  const C_GROUND = new THREE.Color(hex('--ground', '#06070d'));

  /* ================================================================== *
   *  HERO FIELD
   * ================================================================== */
  const canvas = stage.querySelector('canvas');
  if (!canvas) return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(C_GROUND, 0);
  const dpr = () => Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  camera.position.set(0, 0, 46);

  const field = new THREE.Group();
  scene.add(field);

  // cluster centres, one per distinct tag
  const tags = [...new Set(posts.flatMap((p) => p.tags || []))];
  const centres = new Map();
  tags.forEach((t, i) => {
    const a = (i / Math.max(1, tags.length)) * Math.PI * 2;
    const r = 17;
    centres.set(t, new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.7) * 7, Math.sin(a) * r * 0.55));
  });

  // one node per post
  const nodePos = [];
  const nodeCol = [];
  const byTag = new Map();
  posts.forEach((p) => {
    const h = hash(p.slug || p.title || 'x');
    const primary = (p.tags && p.tags[0]) || p.category || 'misc';
    const c = centres.get(primary) || new THREE.Vector3();
    const spread = 7.5;
    const v = new THREE.Vector3(
      c.x + (unit(h) - 0.5) * spread,
      c.y + (unit(h >> 3) - 0.5) * spread * 0.8,
      c.z + (unit(h >> 7) - 0.5) * spread,
    );
    nodePos.push(v);
    const col = p.featured ? C_ZAFARAN : new THREE.Color().lerpColors(C_LAJVARD, C_ACCENT, unit(h >> 11));
    nodeCol.push(col);
    if (!byTag.has(primary)) byTag.set(primary, []);
    byTag.get(primary).push(v);
  });

  const n = nodePos.length;
  if (n > 0) {
    const bg = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    nodePos.forEach((v, i) => { pos.set([v.x, v.y, v.z], i * 3); col.set([nodeCol[i].r, nodeCol[i].g, nodeCol[i].b], i * 3); });
    bg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    bg.setAttribute('color', new THREE.BufferAttribute(col, 3));

    const sprite = (() => {
      const s = 64;
      const cv = document.createElement('canvas');
      cv.width = cv.height = s;
      const g = cv.getContext('2d');
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      return new THREE.CanvasTexture(cv);
    })();

    const points = new THREE.Points(bg, new THREE.PointsMaterial({
      size: 1.5, map: sprite, vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.95,
    }));
    field.add(points);

    // edges between posts that share a tag: the archive graph, not a random mesh
    const edges = [];
    for (const [, group] of byTag) {
      for (let i = 0; i < group.length - 1; i++) {
        edges.push(group[i], group[i + 1]);
        if (group.length > 3 && i + 2 < group.length) edges.push(group[i], group[i + 2]);
      }
    }
    if (edges.length) {
      const eg = new THREE.BufferGeometry().setFromPoints(edges);
      field.add(new THREE.LineSegments(eg, new THREE.LineBasicMaterial({
        color: C_ACCENT, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false,
      })));
    }

    // a wide, very dim halo pass to give the field depth cheaply
    const halo = new THREE.Points(bg, new THREE.PointsMaterial({
      size: 6, map: sprite, vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.07, sizeAttenuation: true,
    }));
    field.add(halo);

    field.rotation.x = -0.12;
  }

  /* ================================================================== *
   *  ARTICLE SIGNAL - a second surface, seeded per post
   * ================================================================== */
  const sigCanvas = document.querySelector('[data-signal] canvas');
  let sig = null;
  if (sigCanvas && data?.post) {
    const sRenderer = new THREE.WebGLRenderer({ canvas: sigCanvas, antialias: true, alpha: true });
    sRenderer.setClearColor(C_GROUND, 0);
    sRenderer.setPixelRatio(Math.min(dpr(), 1.25));
    const sScene = new THREE.Scene();
    const sCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    sCamera.position.z = 5.4;
    const h = hash(data.post.slug || 'x');
    const geo = new THREE.IcosahedronGeometry(1.7, 1);
    // displace vertices from the slug hash: same post, same shape, every time
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const j = 0.72 + unit(h + i * 97) * 0.55;
      p.setXYZ(i, p.getX(i) * j, p.getY(i) * j, p.getZ(i) * j);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color: C_ACCENT, wireframe: true, transparent: true, opacity: 0.5,
    }));
    const core = new THREE.Points(geo, new THREE.PointsMaterial({
      color: C_ZAFARAN, size: 0.055, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    sScene.add(mesh, core);
    sig = { renderer: sRenderer, scene: sScene, camera: sCamera, mesh, core };
  }

  /* ================================================================== *
   *  SIZE
   * ================================================================== */
  const size = (r, w, h) => {
    r.setSize(w, h, false);
    r.setPixelRatio(dpr());
  };
  const resize = () => {
    const w = stage.clientWidth || window.innerWidth;
    const h = stage.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    size(renderer, w, h);
    if (sig) {
      const box = sigCanvas.parentElement.getBoundingClientRect();
      sig.camera.aspect = Math.max(1, box.width) / Math.max(1, box.height);
      sig.camera.updateProjectionMatrix();
      sig.renderer.setSize(Math.max(1, box.width), Math.max(1, box.height), false);
      sig.renderer.setPixelRatio(Math.min(dpr(), 1.25));
    }
  };
  resize();
  new ResizeObserver(resize).observe(stage);

  /* ================================================================== *
   *  POINTER + SCROLL (scroll arrives as ScrollTrigger progress, never a scroll listener)
   * ================================================================== */
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  if (window.matchMedia('(pointer: fine)').matches) {
    document.addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }
  let progress = 0;
  if (window.ScrollTrigger) {
    window.ScrollTrigger.create({
      trigger: document.body, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { progress = self.progress; },
    });
  }

  /* ================================================================== *
   *  FRAME LOOP - stops when the tab is hidden
   * ================================================================== */
  let running = true;
  let t = 0;
  const loop = () => {
    if (!running) return;
    t += 0.0028;
    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;

    field.rotation.y = t * 0.6 + pointer.x * 0.28;
    field.rotation.x = -0.12 - pointer.y * 0.16;
    field.position.y = Math.sin(t * 0.9) * 0.5;
    camera.position.z = 46 - progress * 22;
    camera.position.x = pointer.x * 2.4;
    camera.position.y = -pointer.y * 1.7;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    if (sig) {
      sig.mesh.rotation.y += 0.0035;
      sig.mesh.rotation.x = Math.sin(t * 1.4) * 0.25 + pointer.y * 0.3;
      sig.core.rotation.copy(sig.mesh.rotation);
      sig.core.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
      sig.renderer.render(sig.scene, sig.camera);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!running) { running = true; requestAnimationFrame(loop); }
  });

  /* ================================================================== *
   *  CONTEXT LOSS - degrade to the CSS atmosphere, never a blank screen
   * ================================================================== */
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
