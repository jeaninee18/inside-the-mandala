/* ============================================================
   INSIDE THE MANDALA — the dome show
   The page is the dome. A full-screen shader paints a fulldome
   show overhead: living sacred geometry, a wormhole, a fractal
   bloom, and the Milky Way, all seen as if lying back in the
   Zeidler Dome. Scroll moves the show through its chapters:
     0 Arrival      the kaleidoscope mandala breathing overhead
     1 Invitation   drawn forward into a wormhole of light
     2 Expect       out into the Milky Way; the gold mandala assembles
     3 Guides       a fractal bloom, slow and deep
     4 Details      a calm starscape, the mandala a small compass
     5 Reserve      the gold mandala returns, warm and close
   Poster-first, tiered for phones, static fallback without WebGL.
   ============================================================ */
import * as THREE from './vendor/three.module.min.js';

(function () {
  const canvas = document.getElementById('sky');
  const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
  if (!canvas || !chapters.length) return;

  // Reduce Motion never switches the show off (the show is the point); it slows it right down.
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const debug = /[?&]sky=debug/.test(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const probe = document.createElement('canvas');
  // a GPU that flags a performance caveat still gets the show, on the light tier
  let caveat = false;
  let gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  if (!gl) { caveat = true; gl = probe.getContext('webgl2'); }
  if (!gl) { if (debug) document.title = 'sky: no WebGL2'; return; }
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const lite = coarse || caveat || reduce || /SwiftShader|llvmpipe|Mali-4|Adreno \(TM\) 3/i.test(gpu);
  const speed = reduce ? 0.35 : 1;
  if (debug) document.title = 'sky: live ' + (lite ? 'lite' : 'full') + (reduce ? ' reduced' : '') + ' ' + gpu;
  const TIER = { dpr: Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.75), particles: lite ? 4500 : 9000, quality: lite ? 0 : 1 };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(TIER.dpr);
  renderer.setClearColor(0x0b0d14, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.autoClear = false;

  const C = { gold: new THREE.Color('#d9b25e'), goldLight: new THREE.Color('#ecd49a'), roseLight: new THREE.Color('#e0b3cf') };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rand = mulberry32(2027);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ============================================================
     THE DOME: one full-screen shader
     ============================================================ */
  const domeScene = new THREE.Scene();
  const domeCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const domeMat = new THREE.ShaderMaterial({
    depthWrite: false, depthTest: false,
    uniforms: {
      uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uP: { value: 0 },
      uQuality: { value: TIER.quality }, uDim: { value: 1 },
    },
    vertexShader: `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      precision highp float;
      uniform float uTime; uniform vec2 uRes; uniform float uP; uniform float uQuality; uniform float uDim;
      #define PI 3.14159265
      #define TAU 6.2831853

      // ---------- palette (the dome renders: night, gold, rose, teal, indigo) ----------
      const vec3 NIGHT = vec3(0.043, 0.051, 0.078);
      const vec3 GOLD  = vec3(0.851, 0.698, 0.369);
      const vec3 GOLDL = vec3(0.925, 0.831, 0.604);
      const vec3 ROSE  = vec3(0.722, 0.420, 0.560);
      const vec3 TEAL  = vec3(0.247, 0.494, 0.533);
      const vec3 INDIGO= vec3(0.290, 0.275, 0.560);
      const vec3 PEARL = vec3(0.913, 0.902, 0.933);

      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      float fbm(vec2 p){ float v = 0.0, a = 0.5; mat2 m = mat2(0.8, 0.6, -0.6, 0.8);
        for (int i = 0; i < 5; i++){ v += a * noise(p); p = m * p * 2.03; a *= 0.5; } return v; }
      float sm(float a, float b, float x){ return smoothstep(a, b, x); }

      // ---------- sacred geometry: a living kaleidoscope mandala ----------
      // folds the plane into N wedges and draws petals, rings and seed-of-life circles that breathe
      vec3 mandala(vec2 p, float t, float seg){
        float r = length(p), a = atan(p.y, p.x);
        float w = TAU / seg;
        a = mod(a, w); a = abs(a - w * 0.5);
        vec2 q = vec2(cos(a), sin(a)) * r;
        float d = 0.0;
        for (int i = 0; i < 3; i++){
          float fi = float(i);
          float rr = 0.22 + fi * 0.26 + 0.03 * sin(t * 0.6 + fi);
          float lobes = 6.0 + fi * 6.0;
          float ang = atan(q.y, q.x) + t * (0.05 - fi * 0.03);
          float petal = abs(r - rr - 0.07 * cos(ang * lobes + t * 0.2));
          d += sm(0.012, 0.0, petal) * (0.9 - fi * 0.2);
          d += sm(0.05, 0.0, petal) * 0.18;
        }
        for (int i = 0; i < 6; i++){
          float fi = float(i);
          vec2 c = vec2(cos(fi * TAU / 6.0), sin(fi * TAU / 6.0)) * (0.32 + 0.02 * sin(t * 0.5));
          float cd = abs(length(q - c) - 0.32);
          d += sm(0.008, 0.0, cd) * 0.55 + sm(0.04, 0.0, cd) * 0.1;
        }
        float fil = abs(sin((atan(q.y, q.x)) * 36.0));
        d += sm(0.97, 1.0, fil) * sm(0.9, 0.2, r) * 0.35;
        d += 0.35 / (1.0 + r * r * 60.0);
        vec3 col = mix(GOLD, GOLDL, sm(0.0, 0.9, r)) * d;
        col += ROSE * sm(0.5, 1.0, fract(a * 3.0 + t * 0.1)) * d * 0.12;
        return col;
      }

      // ---------- wormhole: a tunnel of light rushing toward you ----------
      vec3 wormhole(vec2 p, float t){
        float r = length(p) + 0.001, a = atan(p.y, p.x);
        float z = 1.0 / r;
        float u = a / TAU * 12.0;
        float v = z * 0.9 - t * 1.6;
        float n = fbm(vec2(u * 0.9, v * 0.6));
        float rings = sm(0.35, 0.0, abs(fract(v * 0.5) - 0.5)) * 0.6;
        float veins = sm(0.55, 0.9, n);
        float glow = (veins * 0.9 + rings * 0.5 + n * 0.25);
        glow *= sm(0.0, 0.25, r);
        vec3 col = mix(INDIGO * 0.9, TEAL, n) * glow;
        col += GOLDL * veins * sm(0.35, 0.0, r) * 1.2;
        col += ROSE * rings * 0.35;
        col *= 1.0 / (1.0 + r * 1.2);
        col += GOLD * 0.9 / (1.0 + r * r * 420.0);
        return col;
      }

      // ---------- stars and the Milky Way ----------
      float stars(vec2 p, float dens, float t){
        vec2 g = floor(p * dens), f = fract(p * dens) - 0.5;
        float h = hash(g); if (h < 0.80) return 0.0;
        vec2 o = vec2(hash(g + 1.3), hash(g + 7.1)) - 0.5;
        float d = length(f - o * 0.8);
        float tw = 0.65 + 0.35 * sin(t * (1.0 + h * 3.0) + h * 40.0);
        return sm(0.08 * (0.5 + h), 0.0, d) * tw * (0.5 + h);
      }
      vec3 milkyway(vec2 p, float t){
        vec2 q = p * mat2(0.86, 0.5, -0.5, 0.86);
        float band = exp(-q.y * q.y * 6.0);
        float dust = fbm(q * 2.2 + vec2(t * 0.01, 0.0));
        float dark = fbm(q * 5.0 - vec2(t * 0.013, 0.0));
        float lane = sm(0.62, 0.3, dark);
        vec3 col = mix(INDIGO, GOLDL, sm(0.3, 0.8, dust)) * band * dust * 0.9 * lane;
        col += ROSE * band * sm(0.55, 0.85, fbm(q * 3.0 + 7.0)) * 0.35;
        float s = stars(p, 60.0, t) + stars(p + 3.7, 120.0, t) * 0.6 + stars(p * 1.7 + 9.0, 220.0, t) * 0.35;
        col += PEARL * s * (0.6 + band * 0.6);
        return col;
      }

      // ---------- fractal bloom: a soft Julia-set flower, breathing ----------
      vec3 fractal(vec2 p, float t){
        vec2 z = p * 1.6;
        vec2 c = vec2(-0.74 + 0.05 * sin(t * 0.23), 0.19 + 0.04 * cos(t * 0.17));
        float m = 0.0;
        for (int i = 0; i < 22; i++){
          z = vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y) + c;
          float l = dot(z, z); m += exp(-l * 0.6);
          if (l > 16.0) break;
        }
        float v = m * 0.07;
        float r = length(p);
        vec3 col = mix(TEAL, ROSE, sm(0.1, 0.9, fract(v * 0.6 + t * 0.02)));
        col = mix(col, GOLD, sm(0.55, 1.1, v) * 0.6);
        col *= min(v, 0.95) * 0.55 * sm(1.4, 0.3, r);
        return col;
      }

      void main(){
        vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y);
        float t = uTime;
        float p = uP;
        float r = length(uv);
        vec2 d = uv * (1.0 + r * r * 0.9);
        float ang = 0.03 * sin(t * 0.07);
        d = d * mat2(cos(ang), -sin(ang), sin(ang), cos(ang));

        // every scene melts into the next: wide, overlapping fades (about a whole chapter each)
        float wMand = sm(4.3, 5.5, p) * 0.4;
        float wWorm = sm(0.6, 1.6, p) * (1.0 - sm(1.7, 2.9, p));
        float wMilk = sm(1.7, 2.9, p) * (1.0 - sm(3.0, 3.9, p)) + sm(3.6, 4.7, p) * (1.0 - sm(4.9, 5.8, p)) * 0.9;
        float wFrac = sm(2.8, 3.8, p) * (1.0 - sm(3.8, 4.7, p));
        float wStars = sm(1.5, 2.8, p);

        vec3 col = NIGHT;
        if (wMand > 0.002){
          float seg = 12.0 + 4.0 * sm(4.6, 5.4, p);
          vec2 m = d * (1.0 + 0.08 * sin(t * 0.35)) * 1.15;
          float spin = t * 0.025;
          m = m * mat2(cos(spin), -sin(spin), sin(spin), cos(spin));
          float well = 0.3 + 0.7 * sm(0.06, 0.4, r);
          col += mandala(m, t, seg) * wMand * 0.7 * well;
        }
        if (wWorm > 0.002) col += wormhole(d * 1.1, t) * wWorm;
        if (wMilk > 0.002 || wStars > 0.002){
          vec2 sp = d * 1.4 + vec2(0.0, -p * 0.08);
          vec3 sky = milkyway(sp, t);
          col += sky * max(wMilk, wStars * 0.55);
        }
        if (wFrac > 0.002) col += fractal(d * 1.1, t) * wFrac;

        float haze = fbm(d * 1.3 + vec2(t * 0.008, -t * 0.006));
        col += mix(INDIGO, ROSE, haze) * 0.07 * haze;

        float rim = sm(0.78, 0.46, r);
        col *= 0.25 + 0.75 * rim;
        col = col / (1.0 + col * 0.35);
        col *= uDim;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  domeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), domeMat));

  /* ============================================================
     THE GOLD MANDALA: particles that assemble, and the render beneath
     ============================================================ */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
  camera.position.set(0, 0, 16);
  const MANDALA_SIZE = 11;
  let mandala = null, mandalaMat = null, glowMat = null, glowMax = 0.6;
  const glowTex = new THREE.TextureLoader().load('mandala-glow.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; });
  function buildMandala(img) {
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, S, S);
    const px = ctx.getImageData(0, 0, S, S).data, cand = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, a = px[i + 3] / 255; if (a < 0.05) continue;
      const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
      const r = Math.hypot(x / S - 0.5, y / S - 0.5) * 2;
      cand.push({ x, y, w: Math.min(1, a * (0.5 + lum)) * (0.55 + r * 0.9) });
    }
    cand.sort((p, q) => q.w - p.w);
    const N = Math.min(TIER.particles, cand.length), step = cand.length / N;
    const target = new Float32Array(N * 3), start = new Float32Array(N * 3), seed = new Float32Array(N), bright = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const p = cand[Math.min(cand.length - 1, Math.floor(i * step + rand() * step))];
      const tx = (p.x / S - 0.5) * MANDALA_SIZE, ty = (0.5 - p.y / S) * MANDALA_SIZE, dist = Math.hypot(tx, ty) / (MANDALA_SIZE / 2);
      target.set([tx, ty, (rand() - 0.5) * 0.4], i * 3);
      const th = rand() * 6.2831, ph = Math.acos(2 * rand() - 1), rr = 9 + rand() * 14;
      start.set([Math.sin(ph) * Math.cos(th) * rr, Math.sin(ph) * Math.sin(th) * rr * 0.6, Math.cos(ph) * rr], i * 3);
      seed[i] = rand(); bright[i] = 0.45 + 0.55 * Math.min(1, p.w) * (1 - dist * 0.15);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(start, 3)); g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1)); g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    mandalaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uForm: { value: 0 }, uTime: { value: 0 }, uPx: { value: TIER.dpr }, uGold: { value: C.gold }, uGoldLight: { value: C.goldLight }, uRose: { value: C.roseLight }, uAlpha: { value: 1 } },
      vertexShader: `
        attribute vec3 aTarget; attribute float aSeed; attribute float aBright;
        uniform float uForm; uniform float uTime; uniform float uPx;
        varying float vA; varying float vSeed; varying float vBright;
        float ease(float t){ return 1.0 - pow(1.0 - t, 3.0); }
        void main(){
          float t = clamp((uForm - aSeed * 0.35) / 0.65, 0.0, 1.0); float e = ease(t);
          vec3 p = mix(position, aTarget, e);
          float k = (1.0 - e) * 1.0 + 0.06;
          p += vec3(sin(uTime*0.7 + aSeed*31.0), cos(uTime*0.6 + aSeed*17.0), sin(uTime*0.5 + aSeed*7.0)) * k;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = (1.6 + aBright * 3.0) * uPx;
          gl_PointSize = size * (26.0 / -mv.z);
          vA = e; vSeed = aSeed; vBright = aBright; gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform vec3 uGold; uniform vec3 uGoldLight; uniform vec3 uRose; uniform float uAlpha;
        varying float vA; varying float vSeed; varying float vBright;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
          float glow = pow(smoothstep(0.5, 0.0, d), 2.2);
          float tw = 0.75 + 0.25 * sin(uTime * (1.5 + vSeed * 2.0) + vSeed * 40.0);
          vec3 col = mix(uGold, uGoldLight, vBright); col = mix(col, uRose, step(0.93, vSeed) * 0.5);
          float a = glow * (0.25 + vBright * 0.75) * tw * (0.15 + vA * 0.85) * 0.72 * uAlpha;
          gl_FragColor = vec4(col * (0.6 + vBright * 0.8), a);
        }`,
    });
    const points = new THREE.Points(g, mandalaMat); points.frustumCulled = false;
    glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(MANDALA_SIZE * 1.02, MANDALA_SIZE * 1.02), glowMat);
    mandala = new THREE.Group(); mandala.add(glow); mandala.add(points);
    scene.add(mandala); fit();
  }
  const img = new Image(); img.onload = () => buildMandala(img); img.src = 'mandala-particles.webp';

  /* ---------- scroll -> chapter progress (0..6) ---------- */
  let P = 0, targetP = 0;
  function readScroll() {
    const vh = innerHeight; let p = 0;
    for (let i = 0; i < chapters.length; i++) {
      const r = chapters[i].getBoundingClientRect();
      const len = Math.max(1, r.height - vh);
      const local = Math.min(1, Math.max(0, -r.top / len));
      if (r.top > 0 && i === 0) { p = 0; break; }
      if (r.top <= 0) p = i + local; else break;
    }
    targetP = p;
  }
  addEventListener('scroll', readScroll, { passive: true });

  let narrow = false, mandalaScale = 1;
  function fit() {
    narrow = camera.aspect < 0.8;
    const dist = 16, vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
    mandalaScale = Math.min(1.15, (Math.min(vw, vh) * (narrow ? 0.98 : 0.88)) / MANDALA_SIZE);
    glowMax = narrow ? 0.42 : 0.58;
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    domeMat.uniforms.uRes.value.set(innerWidth * TIER.dpr, innerHeight * TIER.dpr);
    fit(); readScroll();
  }
  addEventListener('resize', resize, { passive: true });

  /* ---------- the show ---------- */
  let last = performance.now(), t = 0, hidden = false;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; last = performance.now(); });
  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt * speed;
    // ease toward the scroll position so nothing snaps
    P += (targetP - P) * Math.min(1, dt * 2.2);
    const p = P;

    domeMat.uniforms.uTime.value = t;
    domeMat.uniforms.uP.value = p;
    renderer.clear();
    renderer.render(domeScene, domeCam);

    if (mandala) {
      // opening: assembles as the page loads, holds behind the title, dissolves into the wormhole;
      // later: re-forms out of the Milky Way in chapter 2
      const formOpen = Math.min(1, t / 3.2) * (1 - smooth(0.55, 1.35, p));
      const formLater = smooth(2.0, 3.0, p) * (1 - smooth(5.75, 6.0, p));
      const form = Math.max(formOpen, formLater);
      mandalaMat.uniforms.uForm.value = form; mandalaMat.uniforms.uTime.value = t;
      const recede = smooth(3.8, 4.7, p), ret = smooth(4.9, 5.7, p);
      const s = mandalaScale * lerp(lerp(1, 0.34, recede), narrow ? 1.25 : 1.3, ret);
      mandala.scale.setScalar(s);
      const leaving = smooth(0.4, 1.3, p);               // 0 at the opening, 1 once we are in the wormhole
      const openY = narrow ? 1.6 : 0.3;                    // centred behind the title at the opening
      const baseY = lerp(openY, narrow ? 3.6 : 0.6, leaving);
      mandala.position.set(0, baseY + lerp(0, narrow ? 7.5 : 6.2, recede) * (1 - ret) + lerp(0, narrow ? 0.4 : 1.0, ret), lerp(0, -6, leaving) * (1 - smooth(1.4, 2.8, p)));
      mandala.rotation.z = t * 0.03;
      mandala.rotation.x = -0.6 * leaving * (1 - smooth(1.4, 2.8, p));
      // while the guides and their quotes are being read, the gold mandala steps back
      const reading = smooth(3.05, 3.4, p) * (1 - smooth(3.9, 4.4, p));
      const quiet = lerp(1, narrow ? 0.3 : 0.5, reading);
      mandalaMat.uniforms.uAlpha.value = quiet;
      if (glowMat) glowMat.opacity = smooth(0.55, 1, form) * (glowMax + 0.08 * Math.sin(t * 0.8)) * lerp(1, 0.75, recede) * lerp(1, 1.15, ret) * quiet;
      camera.position.set(Math.sin(t * 0.08) * 0.3, Math.cos(t * 0.06) * 0.2, 16);
      camera.lookAt(0, mandala.position.y * 0.15, 0);
      renderer.render(scene, camera);
    }
    if (!canvas.classList.contains('on')) { canvas.classList.add('on'); document.documentElement.classList.add('sky-on'); }
  }

  resize(); readScroll();
  document.documentElement.classList.add('sky-live');
  requestAnimationFrame(frame);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.classList.remove('on'); }, false);
})();
