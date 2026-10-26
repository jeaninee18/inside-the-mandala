/* ============================================================
   INSIDE THE MANDALA — hero sky journey
   One self-contained WebGL layer behind the existing hero.
   Rise through tinted clouds into a dark sky where the mandala
   assembles from particles, then dissolves as you scroll on.

   Doctrine (from the design pack):
   - poster first: the CSS sky is the LCP, the canvas fades in after
   - demand rendering: only draws while the hero is on screen
   - tiered: phones get fewer particles, capped DPR, no light shafts
   - fallback: no WebGL2 / reduced motion / weak GPU -> page stays as is
   ============================================================ */
import * as THREE from './vendor/three.module.min.js';

(function () {
  const hero = document.getElementById('top');
  const canvas = document.getElementById('journey');
  if (!hero || !canvas) return;

  /* ---------- gates ---------- */
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const coarse = matchMedia('(pointer: coarse)').matches;
  const force = /[?&]sky=force/.test(location.search); // QA override only
  const probe = document.createElement('canvas');
  const gl = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: !force });
  if (!gl) return; // weak GPU or no WebGL2: the CSS poster stays
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const gpu = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
  const lite = coarse || /SwiftShader|llvmpipe|Mali-4|Adreno \(TM\) 3/i.test(gpu);

  const TIER = {
    dpr: Math.min(devicePixelRatio || 1, lite ? 1.5 : 2),
    clouds: lite ? 48 : 90,
    particles: lite ? 4200 : 9000,
    shafts: !lite,
  };

  /* ---------- renderer ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(TIER.dpr);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 120);

  /* ---------- palette (from the dome clip + site tokens) ---------- */
  const C = {
    rose: new THREE.Color('#8a4f66'),
    plum: new THREE.Color('#4a3250'),
    teal: new THREE.Color('#2f5a60'),
    champagne: new THREE.Color('#9a8468'),
    slate: new THREE.Color('#3a3f48'),
    gold: new THREE.Color('#d9b25e'),
    goldLight: new THREE.Color('#ecd49a'),
    roseLight: new THREE.Color('#e0b3cf'),
  };

  /* ---------- seeded random (mulberry32, pack canonical) ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const rand = mulberry32(1117);

  /* ---------- cloud sprite texture (procedural, no download) ---------- */
  function cloudTexture(size) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    // layered soft puffs
    const r = mulberry32(42);
    for (let i = 0; i < 42; i++) {
      const ang = r() * Math.PI * 2, dist = Math.pow(r(), 0.7) * size * 0.28;
      const x = size / 2 + Math.cos(ang) * dist, y = size / 2 + Math.sin(ang) * dist * 0.7;
      const rad = size * (0.10 + r() * 0.17);
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const a = 0.10 + r() * 0.12;
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    }
    // soften the silhouette into a vignette so edges never show
    const vg = ctx.createRadialGradient(size / 2, size / 2, size * 0.18, size / 2, size / 2, size * 0.5);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = vg; ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }
  const cloudTex = cloudTexture(256);

  /* ---------- clouds: instanced billboards, tinted, slow drift ---------- */
  const CLOUD_Y0 = -24, CLOUD_Y1 = 2; // cloud deck
  const cloudGeo = new THREE.PlaneGeometry(1, 1);
  const cloudMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uTex: { value: cloudTex }, uTime: { value: 0 }, uLightY: { value: 10 }, uCamY: { value: 0 } },
    vertexShader: `
      attribute vec3 aTint; attribute float aSeed; attribute float aScale;
      varying vec2 vUv; varying vec3 vTint; varying float vFade; varying float vRot;
      uniform float uTime; uniform float uCamY;
      void main(){
        vUv = uv; vTint = aTint;
        vRot = aSeed * 6.2831 + uTime * (0.02 + fract(aSeed*7.0)*0.03) * (fract(aSeed*3.0) > 0.5 ? 1.0 : -1.0);
        vec3 center = (instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
        center.x += sin(uTime * 0.05 + aSeed * 9.0) * 0.6;
        center.y += cos(uTime * 0.04 + aSeed * 5.0) * 0.25;
        // billboard
        vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 camUp    = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        vec3 pos = center + (camRight * position.x + camUp * position.y) * aScale;
        vec4 mv = viewMatrix * vec4(pos, 1.0);
        // fade when the camera is inside the puff so nothing pops
        float d = length(mv.xyz);
        vFade = smoothstep(1.5, 7.0, d) * (1.0 - smoothstep(60.0, 95.0, d));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      precision highp float;
      uniform sampler2D uTex; varying vec2 vUv; varying vec3 vTint; varying float vFade; varying float vRot;
      void main(){
        vec2 p = vUv - 0.5; float c = cos(vRot), s = sin(vRot);
        p = mat2(c,-s,s,c) * p + 0.5;
        float a = texture2D(uTex, p).a;
        // top-lit: brighten the upper half a touch
        float lit = 0.85 + 0.35 * smoothstep(0.35, 0.9, vUv.y);
        gl_FragColor = vec4(vTint * lit, a * vFade * 0.9);
      }`,
  });
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMat, TIER.clouds);
  const tints = new Float32Array(TIER.clouds * 3), seeds = new Float32Array(TIER.clouds), scales = new Float32Array(TIER.clouds);
  const tintPool = [C.rose, C.plum, C.teal, C.champagne, C.slate, C.plum, C.rose];
  const m = new THREE.Matrix4();
  for (let i = 0; i < TIER.clouds; i++) {
    const t = i / TIER.clouds;
    const y = CLOUD_Y0 + Math.pow(rand(), 0.8) * (CLOUD_Y1 - CLOUD_Y0);
    const z = -3 - rand() * 34;
    const x = (rand() - 0.5) * (18 + Math.abs(z) * 1.1);
    m.makeTranslation(x, y, z); clouds.setMatrixAt(i, m);
    const col = tintPool[Math.floor(rand() * tintPool.length)].clone();
    // higher puffs catch more champagne light, lower ones go teal/plum
    const h = (y - CLOUD_Y0) / (CLOUD_Y1 - CLOUD_Y0);
    col.lerp(C.champagne, h * 0.35); col.lerp(C.teal, (1 - h) * 0.25);
    tints.set([col.r, col.g, col.b], i * 3);
    seeds[i] = rand(); scales[i] = 7 + rand() * 11 + Math.abs(z) * 0.18;
  }
  cloudGeo.setAttribute('aTint', new THREE.InstancedBufferAttribute(tints, 3));
  cloudGeo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  cloudGeo.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 1));
  clouds.instanceMatrix.needsUpdate = true;
  clouds.frustumCulled = false;
  clouds.renderOrder = 1;
  scene.add(clouds);

  /* ---------- light shafts (desktop only): tall soft planes above the deck ---------- */
  let shafts = null;
  if (TIER.shafts) {
    const sg = new THREE.PlaneGeometry(1, 1);
    const sm = new THREE.ShaderMaterial({
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
          gl_FragColor = vec4(col, x * y * 0.14 * flicker * uOpacity);
        }`,
    });
    shafts = new THREE.Group();
    const defs = [[-9, 0.22, 7], [-2, -0.08, 5], [6, 0.18, 8], [12, 0.3, 6]];
    defs.forEach(([x, rot, w]) => {
      const mesh = new THREE.Mesh(sg, sm);
      mesh.position.set(x, 10, -22); mesh.scale.set(w, 46, 1); mesh.rotation.z = rot;
      shafts.add(mesh);
    });
    shafts.renderOrder = 0;
    scene.add(shafts);
  }

  /* ---------- mandala particles: sample the PNG, assemble on scroll ---------- */
  const MANDALA = new THREE.Vector3(0, 11, -14);
  const MANDALA_SIZE = 11;
  let mandala = null, mandalaMat = null;

  function buildMandala(img) {
    const S = 512;
    const cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, S, S);
    const px = ctx.getImageData(0, 0, S, S).data;
    const cand = [];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4, a = px[i + 3] / 255;
      if (a < 0.05) continue;
      const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
      // favour the petal lines over the dense core so the SHAPE reads, not just a glow
      const r = Math.hypot(x / S - 0.5, y / S - 0.5) * 2;
      cand.push({ x, y, w: Math.min(1, a * (0.5 + lum)) * (0.55 + r * 0.9) });
    }
    // weighted reservoir: likelier pixels are likelier to become particles
    cand.sort((p, q) => q.w - p.w);
    const N = Math.min(TIER.particles, cand.length);
    const pick = [];
    const step = cand.length / N;
    for (let i = 0; i < N; i++) {
      const j = Math.min(cand.length - 1, Math.floor(i * step + rand() * step));
      pick.push(cand[j]);
    }
    const target = new Float32Array(N * 3), start = new Float32Array(N * 3), seed = new Float32Array(N), bright = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const p = pick[i];
      const tx = (p.x / S - 0.5) * MANDALA_SIZE, ty = (0.5 - p.y / S) * MANDALA_SIZE;
      const dist = Math.hypot(tx, ty) / (MANDALA_SIZE / 2);
      target.set([tx, ty, (rand() - 0.5) * 0.4], i * 3);
      // scattered start: a loose sphere, with the center rushing in last
      const th = rand() * 6.2831, ph = Math.acos(2 * rand() - 1), rr = 9 + rand() * 14;
      start.set([Math.sin(ph) * Math.cos(th) * rr, Math.sin(ph) * Math.sin(th) * rr * 0.6, Math.cos(ph) * rr], i * 3);
      seed[i] = rand(); bright[i] = 0.45 + 0.55 * Math.min(1, p.w) * (1 - dist * 0.15);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aTarget', new THREE.BufferAttribute(target, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aBright', new THREE.BufferAttribute(bright, 1));
    mandalaMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      uniforms: {
        uForm: { value: 0 }, uTime: { value: 0 }, uPx: { value: TIER.dpr },
        uGold: { value: C.gold }, uGoldLight: { value: C.goldLight }, uRose: { value: C.roseLight },
      },
      vertexShader: `
        attribute vec3 aTarget; attribute float aSeed; attribute float aBright;
        uniform float uForm; uniform float uTime; uniform float uPx;
        varying float vA; varying float vSeed; varying float vBright;
        float ease(float t){ return 1.0 - pow(1.0 - t, 3.0); }
        void main(){
          // each particle arrives on its own schedule
          float t = clamp((uForm - aSeed * 0.35) / 0.65, 0.0, 1.0);
          float e = ease(t);
          vec3 p = mix(position, aTarget, e);
          // settled breathing: tiny orbit so it never looks frozen
          float k = (1.0 - e) * 1.0 + 0.06;
          p += vec3(sin(uTime*0.7 + aSeed*31.0), cos(uTime*0.6 + aSeed*17.0), sin(uTime*0.5 + aSeed*7.0)) * k;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float size = (1.6 + aBright * 3.0) * uPx;
          gl_PointSize = size * (26.0 / -mv.z);
          vA = e; vSeed = aSeed; vBright = aBright;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        precision highp float;
        uniform float uTime; uniform vec3 uGold; uniform vec3 uGoldLight; uniform vec3 uRose;
        varying float vA; varying float vSeed; varying float vBright;
        void main(){
          vec2 c = gl_PointCoord - 0.5; float d = length(c);
          if (d > 0.5) discard;
          float core = smoothstep(0.5, 0.0, d);
          float glow = pow(core, 2.2);
          float tw = 0.75 + 0.25 * sin(uTime * (1.5 + vSeed * 2.0) + vSeed * 40.0);
          vec3 col = mix(uGold, uGoldLight, vBright);
          col = mix(col, uRose, step(0.93, vSeed) * 0.5);
          float a = glow * (0.25 + vBright * 0.75) * tw * (0.15 + vA * 0.85);
          gl_FragColor = vec4(col * (0.6 + vBright * 0.8), a);
        }`,
    });
    const points = new THREE.Points(g, mandalaMat);
    points.frustumCulled = false;
    // the rendered mandala itself, fading in beneath the particles once they settle
    glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, color: 0xffffff });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(MANDALA_SIZE * 1.02, MANDALA_SIZE * 1.02), glowMat);
    mandala = new THREE.Group();
    mandala.add(glow); mandala.add(points);
    mandala.position.copy(MANDALA);
    mandala.renderOrder = 2;
    scene.add(mandala);
  }
  let glowMat = null, glowMax = 0.82;
  const glowTex = new THREE.TextureLoader().load('mandala-glow.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; needs = true; });
  const img = new Image();
  img.onload = () => { buildMandala(img); fitMandala(); needs = true; };
  img.src = 'mandala-particles.webp';

  /* ---------- scroll -> journey progress ---------- */
  let progress = 0, needs = true, visible = true;
  function readScroll() {
    const h = hero.offsetHeight - innerHeight;
    const p = h > 0 ? Math.min(1, Math.max(0, scrollY / h)) : 0;
    if (Math.abs(p - progress) > 0.0005) { progress = p; needs = true; }
  }
  addEventListener('scroll', readScroll, { passive: true });

  function fitMandala() {
    if (!mandala) return;
    // fit the mandala to 88% of the narrower screen axis at its resting distance
    const dist = 16, vh = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vw = vh * camera.aspect;
    const narrow = camera.aspect < 0.8;
    const s = Math.min(1.15, (Math.min(vw, vh) * (narrow ? 0.98 : 0.88)) / MANDALA_SIZE);
    mandala.scale.setScalar(s);
    // on phones, sit behind the headline rather than the paragraph
    mandala.position.y = MANDALA.y + (narrow ? 3.2 : 0);
    glowMax = narrow ? 0.62 : 0.82;
  }
  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    fitMandala();
    needs = true;
  }
  addEventListener('resize', resize, { passive: true });

  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) needs = true; }, { threshold: 0 });
  io.observe(hero);

  /* ---------- the flight ---------- */
  const lookAt = new THREE.Vector3();
  function smooth(a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  let last = performance.now(), t = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!visible) return;
    t += dt;
    const p = progress;
    // camera: low in the deck, then up through it, then rest just above
    const rise = smooth(0, 0.72, p);
    camera.position.set(Math.sin(t * 0.08) * 0.4, -16 + rise * 27, 4 - rise * 2);
    const up = (1 - rise) * 7;
    lookAt.set(0, camera.position.y + up + (MANDALA.y - camera.position.y) * rise, -14);
    camera.lookAt(lookAt);
    camera.rotation.z = Math.sin(t * 0.05) * 0.012;

    cloudMat.uniforms.uTime.value = t;
    cloudMat.uniforms.uCamY.value = camera.position.y;
    if (shafts) { shafts.children[0].material.uniforms.uTime.value = t; shafts.children[0].material.uniforms.uOpacity.value = smooth(0.25, 0.7, p) * (1 - smoothLeave(p)); }

    if (mandala) {
      // assemble once we clear the deck, dissolve as the hero scrolls away
      const form = smooth(0.38, 0.8, p) * (1 - smoothLeave(p));
      mandalaMat.uniforms.uForm.value = form;
      mandalaMat.uniforms.uTime.value = t;
      if (glowMat) glowMat.opacity = smooth(0.55, 1.0, form) * (glowMax + 0.08 * Math.sin(t * 0.8));
      mandala.rotation.z = t * 0.03;
      mandala.rotation.x = (1 - rise) * -0.6;
    }
    renderer.render(scene, camera);
    if (!canvas.classList.contains('on')) canvas.classList.add('on');
    needs = false;
  }
  function smoothLeave(p) { return smooth(0.9, 1.0, p) * 0.0; } // reserved: keep the mandala formed into the next section

  resize(); readScroll();
  hero.classList.add('journey');
  requestAnimationFrame(frame);

  /* ---------- context loss: recover, or fall back to the poster ---------- */
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.classList.remove('on'); }, false);
  canvas.addEventListener('webglcontextrestored', () => { needs = true; }, false);
})();
