/* ============================================================
   INSIDE THE MANDALA — the sky
   One persistent WebGL world behind the whole page. Scroll is the
   camera. Six chapters:
     0 Arrival      low inside the cloud deck, light coming down
     1 Invitation   rising, clouds falling away beneath
     2 Expect       break into stars, the mandala assembles
     3 Guides       mandala fully formed, turning
     4 Details      mandala recedes to a small compass, galaxy behind
     5 Reserve      mandala returns, warm and close
   Poster-first (CSS sky is the first paint), tiered for phones,
   and a full fallback when WebGL isn't there.
   ============================================================ */
import * as THREE from './vendor/three.module.min.js';

(function () {
  const canvas = document.getElementById('sky');
  const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
  if (!canvas || !chapters.length) return;

  /* ---------- gates ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const force = /[?&]sky=force/.test(location.search); // QA override only
  const coarse = matchMedia('(pointer: coarse)').matches;
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: !force });
  if (!gl) return;
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const lite = coarse || /SwiftShader|llvmpipe|Mali-4|Adreno \(TM\) 3/i.test(gpu);
  const TIER = {
    dpr: Math.min(devicePixelRatio || 1, lite ? 1.5 : 2),
    clouds: lite ? 54 : 96,
    particles: lite ? 4500 : 9000,
    galaxy: lite ? 7000 : 16000,
    stars: lite ? 900 : 1800,
    shafts: !lite,
  };

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(TIER.dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200);

  const C = {
    rose: new THREE.Color('#9a5a74'), plum: new THREE.Color('#5a4468'), teal: new THREE.Color('#3f7e88'),
    champagne: new THREE.Color('#c4a884'), slate: new THREE.Color('#4a5060'),
    gold: new THREE.Color('#d9b25e'), goldLight: new THREE.Color('#ecd49a'), roseLight: new THREE.Color('#e0b3cf'),
    starWhite: new THREE.Color('#e9e6ee'), starBlue: new THREE.Color('#9fb6ff'),
  };
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rand = mulberry32(2027);
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- shared soft-sprite texture ---------- */
  function softSprite(size, hard) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(hard, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  /* ---------- cloud texture ---------- */
  function cloudTexture(size) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d'); const r = mulberry32(42);
    for (let i = 0; i < 46; i++) {
      const ang = r() * Math.PI * 2, dist = Math.pow(r(), 0.7) * size * 0.28;
      const x = size / 2 + Math.cos(ang) * dist, y = size / 2 + Math.sin(ang) * dist * 0.7;
      const rad = size * (0.10 + r() * 0.17);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad); const a = 0.10 + r() * 0.12;
      g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    }
    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.5);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }

  /* ---------- clouds ---------- */
  const CLOUD_Y0 = -26, CLOUD_Y1 = 2;
  const cloudGeo = new THREE.PlaneGeometry(1, 1);
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uTex: { value: cloudTexture(256) }, uTime: { value: 0 }, uDim: { value: 1 } },
    vertexShader: `
      attribute vec3 aTint; attribute float aSeed; attribute float aScale;
      varying vec2 vUv; varying vec3 vTint; varying float vFade; varying float vRot;
      uniform float uTime;
      void main(){
        vUv = uv; vTint = aTint;
        vRot = aSeed * 6.2831 + uTime * (0.02 + fract(aSeed*7.0)*0.03) * (fract(aSeed*3.0) > 0.5 ? 1.0 : -1.0);
        vec3 center = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
        center.x += sin(uTime * 0.05 + aSeed * 9.0) * 0.6;
        center.y += cos(uTime * 0.04 + aSeed * 5.0) * 0.25;
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 pos = center + (camRight * position.x + camUp * position.y) * aScale;
        vec4 mv = viewMatrix * vec4(pos, 1.0);
        float d = length(mv.xyz);
        vFade = smoothstep(1.5, 7.0, d) * (1.0 - smoothstep(60.0, 95.0, d));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uTex; uniform float uDim;
      varying vec2 vUv; varying vec3 vTint; varying float vFade; varying float vRot;
      void main(){
        vec2 p = vUv - 0.5; float c = cos(vRot), s = sin(vRot);
        p = mat2(c,-s,s,c) * p + 0.5;
        float a = texture2D(uTex, p).a;
        float lit = 0.9 + 0.45 * smoothstep(0.35, 0.9, vUv.y);
        gl_FragColor = vec4(vTint * lit * uDim, a * vFade * 0.95);
      }`,
  });
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, TIER.clouds);
  {
    const tints = new Float32Array(TIER.clouds * 3), seeds = new Float32Array(TIER.clouds), scales = new Float32Array(TIER.clouds);
    const pool = [C.rose, C.plum, C.teal, C.champagne, C.slate, C.plum, C.rose]; const m = new THREE.Matrix4();
    for (let i = 0; i < TIER.clouds; i++) {
      const y = CLOUD_Y0 + Math.pow(rand(), 0.8) * (CLOUD_Y1 - CLOUD_Y0);
      const z = -3 - rand() * 36, x = (rand() - 0.5) * (18 + Math.abs(z) * 1.1);
      m.makeTranslation(x, y, z); clouds.setMatrixAt(i, m);
      const col = pool[Math.floor(rand() * pool.length)].clone();
      const h = (y - CLOUD_Y0) / (CLOUD_Y1 - CLOUD_Y0);
      col.lerp(C.champagne, h * 0.35); col.lerp(C.teal, (1 - h) * 0.25);
      tints.set([col.r, col.g, col.b], i * 3); seeds[i] = rand(); scales[i] = 7 + rand() * 11 + Math.abs(z) * 0.18;
    }
    cloudGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
    cloudGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
    cloudGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
    clouds.instanceMatrix.needsUpdate = true; clouds.frustumCulled = false; clouds.renderOrder = 3;
    scene.add(clouds);
  }

  /* ---------- light shafts ---------- */
  let shaftMat = null;
  if (TIER.shafts) {
    shaftMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        precision highp float; varying vec2 vUv; uniform float uTime; uniform float uOpacity;
        void main(){
          float x = smoothstep(0.0,0.5,vUv.x) * smoothstep(1.0,0.5,vUv.x);
          float y = smoothstep(0.0,0.35,vUv.y) * smoothstep(1.0,0.55,vUv.y);
          float flicker = 0.85 + 0.15 * sin(uTime * 0.6 + vUv.y * 3.0);
          vec3 col = mix(vec3(0.60,0.52,0.40), vec3(0.88,0.72,0.55), vUv.y);
          gl_FragColor = vec4(col, x * y * 0.16 * flicker * uOpacity);
        }`,
    });
    const sg = new THREE.PlaneGeometry(1, 1), grp = new THREE.Group();
    [[-9, 0.22, 7], [-2, -0.08, 5], [6, 0.18, 8], [12, 0.3, 6]].forEach(([x, rot, w]) => {
      const mesh = new THREE.Mesh(sg, shaftMat); mesh.position.set(x, 4, -22); mesh.scale.set(w, 52, 1); mesh.rotation.z = rot; grp.add(mesh);
    });
    grp.renderOrder = 2; scene.add(grp);
  }

  /* ---------- 3D starfield: a shell of stars around the whole journey ---------- */
  const starTex = softSprite(64, 0.3);
  {
    const N = TIER.stars, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), sd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const th = rand() * 6.2831, ph = Math.acos(2 * rand() - 1), r = 70 + rand() * 60;
      pos.set([Math.sin(ph) * Math.cos(th) * r, Math.abs(Math.cos(ph)) * r * 0.9 - 10, -Math.abs(Math.sin(ph) * Math.sin(th)) * r - 10], i * 3);
      const c = rand() > 0.82 ? C.goldLight : (rand() > 0.6 ? C.starBlue : C.starWhite);
      col.set([c.r, c.g, c.b], i * 3); sz[i] = 0.6 + Math.pow(rand(), 3) * 2.4; sd[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uTex: { value: starTex }, uTime: { value: 0 }, uPx: { value: TIER.dpr }, uOpacity: { value: 0 } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uPx; uniform float uTime;
        varying vec3 vC; varying float vTw;
        void main(){ vC = aColor; vTw = 0.6 + 0.4 * sin(uTime * (0.8 + aSeed*1.5) + aSeed * 50.0);
          vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uPx * (120.0 / -mv.z) * 1.6; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `precision highp float; uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC; varying float vTw;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a; gl_FragColor = vec4(vC, a * vTw * uOpacity); }`,
    });
    const stars = new THREE.Points(g, m); stars.frustumCulled = false; stars.renderOrder = 0; scene.add(stars);
    window.__stars = m;
  }
  const starsMat = window.__stars; delete window.__stars;

  /* ---------- the galaxy: a face-on spiral seen from below, built from stars ---------- */
  const galaxy = new THREE.Group();
  let galaxyMat = null;
  {
    const N = TIER.galaxy, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N), sd = new Float32Array(N);
    const ARMS = 3, R = 30;
    for (let i = 0; i < N; i++) {
      const arm = i % ARMS;
      const t = Math.pow(rand(), 0.55);                 // radius fraction, denser toward the core
      const r = t * R;
      const spin = t * 5.2;                             // how far the arm has wound
      const spread = (rand() - 0.5) * (0.22 + t * 0.55); // arm thickness grows outward
      const ang = (arm / ARMS) * 6.2831 + spin + spread + (rand() - 0.5) * 0.08;
      const core = rand() < 0.12;                       // a bulge of stars at the centre
      const rr = core ? Math.pow(rand(), 2) * R * 0.18 : r;
      const aa = core ? rand() * 6.2831 : ang;
      const z = (rand() - 0.5) * (core ? 2.5 : 0.8) * (1 - t * 0.5);
      pos.set([Math.cos(aa) * rr, Math.sin(aa) * rr, z], i * 3);
      // colour: gold core, cream mid, blue-white tips, with rose nebula knots on the arms
      const c = new THREE.Color();
      if (core || t < 0.22) c.copy(C.goldLight).lerp(C.gold, rand() * 0.6);
      else if (t < 0.55) c.copy(C.champagne).lerp(C.starWhite, rand());
      else c.copy(C.starWhite).lerp(C.starBlue, rand() * 0.8);
      if (!core && rand() < 0.07) c.copy(C.roseLight);
      col.set([c.r, c.g, c.b], i * 3);
      sz[i] = (core ? 1.6 : 0.5) + Math.pow(rand(), 4) * 2.6; sd[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); g.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));
    galaxyMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: { uTex: { value: starTex }, uTime: { value: 0 }, uPx: { value: TIER.dpr }, uOpacity: { value: 0 } },
      vertexShader: `attribute vec3 aColor; attribute float aSize; attribute float aSeed; uniform float uPx; uniform float uTime;
        varying vec3 vC; varying float vTw;
        void main(){ vC = aColor; vTw = 0.7 + 0.3 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0);
          vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = aSize * uPx * (110.0 / -mv.z) * 1.6; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `precision highp float; uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC; varying float vTw;
        void main(){ float a = texture2D(uTex, gl_PointCoord).a; gl_FragColor = vec4(vC, a * vTw * uOpacity); }`,
    });
    const pts = new THREE.Points(g, galaxyMat); pts.frustumCulled = false;
    // a soft core glow under the stars
    const coreMat = new THREE.MeshBasicMaterial({ map: softSprite(128, 0.15), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: C.gold });
    const core = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), coreMat);
    galaxy.add(core); galaxy.add(pts);
    galaxy.position.set(0, 16, -70);
    galaxy.rotation.x = -0.3; // tilted, as if you are looking up into it
    galaxy.renderOrder = 1; galaxy.userData.core = coreMat;
    scene.add(galaxy);
  }

  /* ---------- the mandala: particles that assemble, and the render beneath them ---------- */
  const MANDALA = new THREE.Vector3(0, 11, -14);
  const MANDALA_SIZE = 11;
  let mandala = null, mandalaMat = null, glowMat = null, glowMax = 0.82;
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
      uniforms: { uForm: { value: 0 }, uTime: { value: 0 }, uPx: { value: TIER.dpr }, uGold: { value: C.gold }, uGoldLight: { value: C.goldLight }, uRose: { value: C.roseLight } },
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
        uniform float uTime; uniform vec3 uGold; uniform vec3 uGoldLight; uniform vec3 uRose;
        varying float vA; varying float vSeed; varying float vBright;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c); if (d > 0.5) discard;
          float glow = pow(smoothstep(0.5, 0.0, d), 2.2);
          float tw = 0.75 + 0.25 * sin(uTime * (1.5 + vSeed * 2.0) + vSeed * 40.0);
          vec3 col = mix(uGold, uGoldLight, vBright); col = mix(col, uRose, step(0.93, vSeed) * 0.5);
          float a = glow * (0.25 + vBright * 0.75) * tw * (0.15 + vA * 0.85);
          gl_FragColor = vec4(col * (0.6 + vBright * 0.8), a);
        }`,
    });
    const points = new THREE.Points(g, mandalaMat); points.frustumCulled = false;
    glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(MANDALA_SIZE * 1.02, MANDALA_SIZE * 1.02), glowMat);
    mandala = new THREE.Group(); mandala.add(glow); mandala.add(points);
    mandala.position.copy(MANDALA); mandala.renderOrder = 4; scene.add(mandala);
    fit();
  }
  const img = new Image(); img.onload = () => buildMandala(img); img.src = 'mandala-particles.webp';

  /* ---------- scroll -> chapter progress ---------- */
  // P runs 0..6: integer part is the chapter, fraction is how far through it
  let P = 0;
  function readScroll() {
    const vh = innerHeight; let p = 0;
    for (let i = 0; i < chapters.length; i++) {
      const r = chapters[i].getBoundingClientRect();
      const len = Math.max(1, r.height - vh);
      const local = Math.min(1, Math.max(0, -r.top / len));
      if (r.top > 0 && i === 0) { p = 0; break; }
      if (r.top <= 0) p = i + local; else break;
    }
    P = p;
  }
  addEventListener('scroll', readScroll, { passive: true });

  let narrow = false, mandalaScale = 1;
  function fit() {
    narrow = camera.aspect < 0.8;
    const dist = 16, vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
    mandalaScale = Math.min(1.15, (Math.min(vw, vh) * (narrow ? 0.98 : 0.88)) / MANDALA_SIZE);
    glowMax = narrow ? 0.66 : 0.82;
  }
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); fit(); readScroll();
  }
  addEventListener('resize', resize, { passive: true });

  /* ---------- the flight ---------- */
  const look = new THREE.Vector3();
  let last = performance.now(), t = 0, hidden = false;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; last = performance.now(); });

  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    const p = P, ch = Math.floor(p), f = p - ch;

    // camera height across the journey
    let camY, camZ = 4, lookUp = 0;
    if (p < 1)       { camY = lerp(-16, -6, smooth(0, 1, p)); lookUp = 7 * (1 - p * 0.3); }
    else if (p < 2)  { camY = lerp(-6, 8, smooth(1, 2, p)); lookUp = lerp(5, 1, smooth(1, 2, p)); }
    else if (p < 3)  { camY = lerp(8, 12, smooth(2, 3, p)); lookUp = lerp(1, 0, smooth(2, 2.6, p)); }
    else if (p < 4)  { camY = 12; }
    else if (p < 5)  { camY = lerp(12, 13.5, smooth(4, 5, p)); }
    else             { camY = lerp(13.5, 12, smooth(5, 6, p)); camZ = lerp(4, 2.5, smooth(5, 6, p)); }
    camera.position.set(Math.sin(t * 0.08) * 0.35, camY, camZ);
    look.set(0, camY + lookUp, -14); camera.lookAt(look);
    camera.rotation.z = Math.sin(t * 0.05) * 0.012;

    // clouds dim as we leave them so the stars can own the frame
    cloudMat.uniforms.uTime.value = t;
    cloudMat.uniforms.uDim.value = lerp(1, 0.55, smooth(2.2, 3.2, p));
    if (shaftMat) { shaftMat.uniforms.uTime.value = t; shaftMat.uniforms.uOpacity.value = smooth(0.2, 1, p) * (1 - smooth(1.6, 2.4, p)); }

    // stars arrive as we clear the deck
    starsMat.uniforms.uTime.value = t;
    starsMat.uniforms.uOpacity.value = smooth(1.3, 2.3, p);

    // galaxy: a whisper in chapter 2, the backdrop of chapter 4, dims for the reserve
    galaxy.rotation.z = t * 0.012;
    galaxyMat.uniforms.uTime.value = t;
    const gal = smooth(2.3, 3.2, p) * 0.45 + smooth(4.0, 4.6, p) * 0.55 - smooth(5.2, 5.9, p) * 0.5;
    galaxyMat.uniforms.uOpacity.value = Math.max(0, gal);
    galaxy.userData.core.opacity = Math.max(0, gal) * 0.7;
    galaxy.position.y = lerp(14, 20, smooth(4, 5, p));

    if (mandala) {
      // assemble in chapter 2, hold in 3, recede in 4, return in 5
      const form = smooth(2.15, 2.85, p);
      mandalaMat.uniforms.uForm.value = form; mandalaMat.uniforms.uTime.value = t;
      const recede = smooth(4.0, 4.6, p), ret = smooth(5.0, 5.6, p);
      const s = mandalaScale * lerp(lerp(1, 0.34, recede), narrow ? 1.25 : 1.3, ret);
      mandala.scale.setScalar(s);
      mandala.position.set(0, MANDALA.y + (narrow ? 3.2 : 0) + lerp(0, narrow ? 9 : 7, recede) * (1 - ret) + lerp(0, narrow ? 0.5 : 1.5, ret), lerp(MANDALA.z, MANDALA.z + 2, ret));
      mandala.rotation.z = t * 0.03;
      mandala.rotation.x = (1 - smooth(1.5, 2.6, p)) * -0.6;
      if (glowMat) glowMat.opacity = smooth(0.55, 1, form) * (glowMax + 0.08 * Math.sin(t * 0.8)) * lerp(1, 0.75, recede) * lerp(1, 1.15, ret);
    }
    renderer.render(scene, camera);
    if (!canvas.classList.contains('on')) { canvas.classList.add('on'); document.documentElement.classList.add('sky-on'); }
  }

  resize(); readScroll();
  document.documentElement.classList.add('sky-live');
  requestAnimationFrame(frame);

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.classList.remove('on'); }, false);
})();
