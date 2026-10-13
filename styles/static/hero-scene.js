// Overdrive hero field - a hero-scoped plasma behind the landing headline.
//
// Loaded by dynamic import from motion.js only when [data-hero-canvas] exists
// and motion is allowed. Contract (mirrors scene.js):
//   - colours are read from the CSS tokens at runtime, never hard-coded
//   - capability gates: reduced-motion, save-data, low memory, no WebGL,
//     small viewports -> the canvas stays off and the CSS atmosphere carries
//   - the frame loop runs only while the hero is on screen and the tab visible
//   - opacity is owned HERE (scroll fade + intro fade) so nothing else tweens
//     .hero-fx and nothing fights over the same property.

const HOST_SEL = '[data-hero-fx]';
const HERO_SEL = '.hero-sec';

function off(host) {
  if (host) host.dataset.heroFx = 'off';
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

function tokenVec3(css, name, fallback) {
  const m = /^#([0-9a-f]{6})$/i.exec(css.getPropertyValue(name).trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// domain-warped fbm ribbons: two colours out of the token palette, dithered
const FRAG = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uMouse;
  uniform vec3 uColA;
  uniform vec3 uColB;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.03 + vec2(11.3, 7.9);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * vec2(uRes.x / max(uRes.y, 1.0), 1.0) * 1.7;
    float t = uTime * 0.09;
    vec2 m = uMouse * 0.22;
    vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 2.1 * q + vec2(1.7, 9.2) + m.x),
                  fbm(p + 2.1 * q + vec2(8.3, 2.8) - m.y));
    float f = fbm(p + 2.3 * r);
    // broad luminous ribbons + firouzeh cores; tuned so alpha stays well above
    // the visibility floor on a dark ground (v1 was mathematically invisible)
    float rib = smoothstep(0.34, 0.72, f);
    float core = smoothstep(0.55, 0.85, f) * r.y;
    vec3 col = uColA * rib * 0.85;
    col += uColB * core * 0.75;
    col += uColB * pow(max(r.x - 0.45, 0.0), 2.0) * 0.6;
    // keep the field off the very top so the cockpit nav stays quiet
    col *= smoothstep(0.02, 0.3, uv.y) * 0.85 + 0.15;
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    float a = clamp(lum * 2.2, 0.0, 0.9);
    // dither against banding on wide gradients
    col += (hash(uv * uRes + fract(uTime)) - 0.5) / 160.0;
    gl_FragColor = vec4(col, a);
  }
`;

async function boot() {
  const host = document.querySelector(HOST_SEL);
  const hero = document.querySelector(HERO_SEL);
  const canvas = document.querySelector('[data-hero-canvas]');
  if (!host || !hero || !canvas) return;

  const caps = capabilities();
  if (!caps.ok) { off(host); return; }

  let THREE;
  try {
    THREE = await import('./vendor/three.module.min.js');
  } catch {
    off(host);
    return;
  }

  const css = getComputedStyle(document.documentElement);
  const uniforms = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uColA: { value: new THREE.Vector3(...tokenVec3(css, '--lajvard', [0.29, 0.36, 1])) },
    uColB: { value: new THREE.Vector3(...tokenVec3(css, '--accent', [0.34, 0.77, 0.78])) },
  };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, premultipliedAlpha: false, antialias: false, powerPreference: 'low-power', preserveDrawingBuffer: true });
  } catch {
    off(host);
    return;
  }
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  quad.frustumCulled = false;
  scene.add(quad);

  // render small, upscale in CSS: soft light field, a fraction of the fragments
  const SCALE = 0.55;
  const resize = () => {
    const w = Math.max(1, Math.floor(host.clientWidth * SCALE));
    const h = Math.max(1, Math.floor(host.clientHeight * SCALE));
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w, h);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const target = new THREE.Vector2(0, 0);
  window.addEventListener('pointermove', (e) => {
    target.set((e.clientX / window.innerWidth) * 2 - 1, 1 - (e.clientY / window.innerHeight) * 2);
  }, { passive: true });

  let onScreen = false;
  let raf = 0;
  let t = 0;
  let last = 0;

  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    uniforms.uTime.value = t;
    uniforms.uMouse.value.lerp(target, 0.045);

    // opacity = scroll fade * intro fade, computed here so the field hands
    // back to the plain atmosphere exactly as the hero leaves the viewport
    const rect = hero.getBoundingClientRect();
    const h = rect.height || 1;
    const exit = Math.max(0, Math.min(1, 1 + rect.top / (h * 0.85)));
    const intro = Math.min(1, t / 1.5);
    host.style.opacity = (exit * intro).toFixed(3);

    renderer.render(scene, camera);
    if (onScreen && !document.hidden) raf = requestAnimationFrame(frame);
  }

  const sync = () => {
    const active = onScreen && !document.hidden;
    if (active && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };

  const io = new IntersectionObserver((entries) => {
    onScreen = !!entries[0]?.isIntersecting;
    if (!onScreen) host.style.opacity = '0';
    sync();
  }, { threshold: 0 });
  io.observe(hero);
  document.addEventListener('visibilitychange', sync);

  sync();
}

boot().catch(() => off(document.querySelector(HOST_SEL)));
