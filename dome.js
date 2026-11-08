/* ============================================================
   INSIDE THE MANDALA · the dome (Stage 2)
   You are reclined in a seat in the Zeidler Dome, looking up.
   Jeanine's fulldome renders (dome-master fisheye) are projected
   onto a real 3D hemisphere overhead, the room is full of people
   leaning back in their seats, lit only by the colour above them,
   and gold light drifts down through the air.

   Scroll is the camera: you recline further back as you move
   through the page, and the sky melts from one render to the next
   in the order of the show, ending on the sunflower galaxy.

   Tiers: phones get 512px skies, fewer people and fewer sparks;
   no WebGL means the still seat-view poster carries the page.
   sky.js (the previous shader sky) is untouched for rollback.
   ============================================================ */
import * as THREE from './vendor/three.module.min.js';

(function () {
  const canvas = document.getElementById('sky');
  const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
  if (!canvas) return;

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(pointer: coarse) and (hover: none)').matches;
  const debug = /[?&]dome=debug/.test(location.search);
  const capture = /[?&]capture=1/.test(location.search);

  // ---------- capability + tier ----------
  const probe = document.createElement('canvas');
  const pgl = probe.getContext('webgl2') || probe.getContext('webgl');
  if (!pgl) return; // poster carries the page
  const dbg = pgl.getExtension('WEBGL_debug_renderer_info');
  const gpu = dbg ? String(pgl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  const weak = /SwiftShader|llvmpipe|Mali-4|Adreno \(TM\) 3/i.test(gpu);
  const lite = coarse || weak;
  const TIER = {
    dpr: Math.min(devicePixelRatio || 1, lite ? 1.5 : 2),
    tex: lite ? '-m' : '',
    sparks: lite ? 450 : 1400,
    rows: lite ? 6 : 9,
  };
  if (debug) document.title = 'dome: ' + (lite ? 'lite' : 'full') + ' ' + gpu;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
  renderer.setPixelRatio(TIER.dpr);
  renderer.setClearColor(0x05060a, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 200);

  const R = 26;               // dome radius
  const N_SKY = 9;            // renders in show order

  // ---------- skies ----------
  const loader = new THREE.TextureLoader();
  const skies = new Array(N_SKY).fill(null);
  const tints = new Array(N_SKY).fill(null).map(() => new THREE.Color(0.25, 0.2, 0.3));
  const blank = new THREE.DataTexture(new Uint8Array([10, 10, 16, 255]), 1, 1);
  blank.needsUpdate = true;

  function averageColour(img, i) {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 24;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0, 24, 24);
      const d = x.getImageData(0, 0, 24, 24).data; let r = 0, g = 0, b = 0, n = 0;
      for (let k = 0; k < d.length; k += 4) {
        const px = (k / 4) % 24, py = Math.floor(k / 4 / 24), dx = px - 11.5, dy = py - 11.5;
        if (dx * dx + dy * dy > 100) continue; // inside the dome circle only
        r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
      }
      const col = new THREE.Color(r / n / 255, g / n / 255, b / n / 255).convertSRGBToLinear();
      const hsl = {}; col.getHSL(hsl); col.setHSL(hsl.h, Math.min(1, hsl.s * 1.35), Math.max(0.22, hsl.l));
      tints[i] = col;
    } catch (e) { /* tint stays default */ }
  }
  function loadSky(i) {
    return new Promise((res) => {
      loader.load('dome/sky' + i + TIER.tex + '.webp', (t) => {
        t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        skies[i] = t; averageColour(t.image, i); res(t);
      }, undefined, () => res(null));
    });
  }

  // ---------- the dome ----------
  const domeMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      uA: { value: blank }, uB: { value: blank }, uMix: { value: 0 },
      uTime: { value: 0 }, uSpin: { value: 0 }, uGlow: { value: lite ? 0.35 : 0.55 },
      uTint: { value: new THREE.Color() },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir; varying vec3 vWorld;
      void main(){ vDir = normalize(position); vWorld = normalize(mat3(modelMatrix) * position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform sampler2D uA, uB; uniform float uMix, uTime, uSpin, uGlow; uniform vec3 uTint;
      varying vec3 vDir; varying vec3 vWorld;
      #define HALF_PI 1.5707963
      float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float v=0.0,a=0.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
      // dome-master fisheye: zenith at the centre, horizon at the rim, the front of the room at the bottom
      vec2 domeUV(vec3 d, float twist){
        float theta = acos(clamp(d.y, -1.0, 1.0));            // 0 overhead, pi/2 at the horizon
        float r = min(theta / HALF_PI * 0.445, 0.445);        // trims the baked lens rim
        float phi = atan(d.z, d.x) + uSpin + twist * (1.0 - theta / HALF_PI);
        return vec2(0.5) + r * vec2(cos(phi), sin(phi));
      }
      void main(){
        vec3 d = normalize(vDir);
        float up = d.y;
        // the slow liquid swirl of the Act 2 reel: the centre turns a little faster than the rim
        float twist = 0.10 * sin(uTime * 0.11) + 0.05 * sin(uTime * 0.043 + 1.7);
        vec2 uv = domeUV(d, twist);
        vec3 a = texture2D(uA, uv).rgb, b = texture2D(uB, uv).rgb;
        // melt, not a fade: a drifting noise field decides which part of the sky changes first
        float n = fbm(uv * 3.2 + vec2(uTime * 0.02, -uTime * 0.015));
        float m = smoothstep(n - 0.18, n + 0.18, uMix * 1.36 - 0.18);
        vec3 col = mix(a, b, m);
        // light that seems to come off the sky: lift the brights, gently breathe
        float breathe = 0.94 + 0.06 * sin(uTime * 0.35);
        col = col * breathe + pow(col, vec3(2.4)) * uGlow;
        // the horizon band and the room below it
        // the sky stops at the dome's lower edge, just under the seat line; below is the dark room
        float horizon = smoothstep(-0.30, -0.03, up) * smoothstep(-0.40, -0.22, vWorld.y);
        vec3 room = uTint * 0.025 * smoothstep(-0.8, -0.1, vWorld.y);
        col = mix(room, col, horizon);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, lite ? 48 : 96, lite ? 32 : 64), domeMat);
  dome.rotation.x = -0.45;   // the Zeidler is a tilted dome: the sky comes down in front of the seats
  scene.add(dome);

  // ---------- the room: rows of people reclined, lit by the sky ----------
  const personMat = new THREE.ShaderMaterial({
    uniforms: { uTint: { value: new THREE.Color() }, uTime: { value: 0 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){
        mat4 m = modelMatrix * instanceMatrix;
        vec4 wp = m * vec4(position, 1.0);
        vN = normalize(mat3(m) * normal);
        vV = normalize(cameraPosition - wp.xyz);
        vH = wp.y;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */`
      precision highp float;
      uniform vec3 uTint; varying vec3 vN; varying vec3 vV; varying float vH;
      void main(){
        vec3 n = normalize(vN);
        float rim = pow(1.0 - max(dot(n, normalize(vV)), 0.0), 5.0);
        float top = max(n.y, 0.0);
        vec3 col = vec3(0.006, 0.006, 0.010);
        col += uTint * (rim * 0.16 + pow(top, 8.0) * 0.02);
        col *= smoothstep(-5.0, 0.5, vH) * 0.8 + 0.2;   // lower rows sit deeper in the dark
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });

  const rand = (() => { let a = 2027; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();

  // seats in curved rows facing the front of the dome (-z), stepping down toward the front
  const seats = [];
  for (let row = 0; row < TIER.rows; row++) {
    const z = 1.4 - row * 1.2;
    const y = -0.35 - row * 0.42;
    const halfWidth = 4.8 + row * 0.85;
    const count = Math.floor(halfWidth * 2 / 0.72);
    for (let s = 0; s <= count; s++) {
      const x = -halfWidth + s * (halfWidth * 2 / count);
      if (row === 0 && Math.abs(x) < 0.9) continue;           // your own seat's neighbours give you room
      const zc = z + (x * x) * 0.018;                           // gentle curve of the row
      seats.push({ x, y, z: zc, filled: rand() > 0.14, lean: 0.62 + rand() * 0.16, turn: (rand() - 0.5) * 0.25 - x * 0.012, scale: 0.9 + rand() * 0.18 });
    }
  }
  const nSeats = seats.length;
  const nPeople = seats.filter((s) => s.filled).length;

  const backGeo = new THREE.CapsuleGeometry(0.24, 0.36, 4, 12); backGeo.scale(1.1, 1, 0.28); backGeo.translate(0, 0.42, 0);
  const headGeo = new THREE.SphereGeometry(0.13, 18, 14);
  const torsoGeo = new THREE.CapsuleGeometry(0.2, 0.18, 4, 10);
  const backs = new THREE.InstancedMesh(backGeo, personMat, nSeats);
  const heads = new THREE.InstancedMesh(headGeo, personMat, nPeople);
  const torsos = new THREE.InstancedMesh(torsoGeo, personMat, nPeople);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
  const up = new THREE.Vector3();
  let hi = 0;
  seats.forEach((s, i) => {
    // seat back, reclined toward the back of the room
    E.set(s.lean, s.turn, 0); Q.setFromEuler(E); P.set(s.x, s.y, s.z); S.set(1, 1, 1);
    M.compose(P, Q, S); backs.setMatrixAt(i, M);
    if (!s.filled) return;
    up.set(0, 1, 0).applyQuaternion(Q);
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(Q);
    // torso lies along the seat back, head rests near the top
    P.set(s.x, s.y, s.z).addScaledVector(up, 0.86).addScaledVector(fwd, 0.10);
    S.setScalar(s.scale); M.compose(P, Q, S); torsos.setMatrixAt(hi, M);
    P.set(s.x, s.y, s.z).addScaledVector(up, 1.13 * s.scale).addScaledVector(fwd, 0.05);
    E.set(s.lean + (rand() - 0.5) * 0.3, s.turn + (rand() - 0.5) * 0.5, (rand() - 0.5) * 0.3); Q.setFromEuler(E);
    S.set(s.scale, s.scale * 1.12, s.scale); M.compose(P, Q, S); heads.setMatrixAt(hi, M);
    hi++;
  });
  scene.add(backs, heads, torsos);


  // ---------- gold light pouring down ----------
  const sparkGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(TIER.sparks * 3), seed = new Float32Array(TIER.sparks);
  for (let i = 0; i < TIER.sparks; i++) {
    const r = Math.sqrt(rand()) * (R * 0.8), a = rand() * Math.PI * 2;
    sp[i * 3] = Math.cos(a) * r; sp[i * 3 + 1] = rand() * R * 0.85 - 2; sp[i * 3 + 2] = Math.sin(a) * r - 4;
    seed[i] = rand();
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sparkGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const sparkMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPR: { value: TIER.dpr }, uTint: { value: new THREE.Color() }, uH: { value: R * 0.85 } },
    vertexShader: /* glsl */`
      uniform float uTime, uPR, uH; attribute float aSeed; varying float vA; varying float vS;
      void main(){
        vec3 p = position;
        p.y = mod(p.y - uTime * (0.18 + aSeed * 0.35) + 2.0, uH) - 2.0;      // drifting down
        p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.6;                       // sway
        p.z += cos(uTime * 0.17 + aSeed * 31.0) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float tw = 0.55 + 0.45 * sin(uTime * (1.2 + aSeed * 2.5) + aSeed * 60.0);
        vA = tw * smoothstep(-2.0, 2.5, p.y);
        vS = aSeed;
        gl_PointSize = (2.0 + aSeed * 5.0) * uPR * (14.0 / max(-mv.z, 1.0));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      precision highp float; uniform vec3 uTint; varying float vA; varying float vS;
      void main(){
        vec2 c = gl_PointCoord - 0.5; float d = length(c);
        float core = smoothstep(0.5, 0.0, d); core *= core;
        vec3 gold = vec3(1.0, 0.80, 0.45);
        vec3 col = mix(gold, mix(gold, uTint * 1.6 + 0.25, 0.4), step(0.7, vS));
        gl_FragColor = vec4(col * core * vA, 1.0);
      }`,
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  scene.add(sparks);

  // ---------- the camera: you, reclining as you scroll ----------
  // position barely moves (a seat reclining); the gaze travels from the room up to the zenith
  const seatPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 1.35, 5.4), new THREE.Vector3(0, 1.2, 5.55), new THREE.Vector3(0, 1.0, 5.7),
    new THREE.Vector3(0, 0.9, 5.75), new THREE.Vector3(0, 1.15, 5.6),
  ], false, 'catmullrom', 0.5);
  const gazePath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.6, -18),   // arrival: the room in front, the sky opening above
    new THREE.Vector3(-3, 8, -16),   // looking up and to the left
    new THREE.Vector3(4, 15, -12),     // sweeping right, higher
    new THREE.Vector3(-1, 22, -9),    // flat on your back, straight up
    new THREE.Vector3(0, 7, -18),    // the finale, the sunflower and the room together again
  ], false, 'catmullrom', 0.5);
  const camTarget = new THREE.Vector3(), lookTarget = new THREE.Vector3(), lookNow = new THREE.Vector3();
  seatPath.getPointAt(0, camera.position); gazePath.getPointAt(0, lookNow); camera.lookAt(lookNow);

  // ---------- scroll ----------
  let progress = 0, dirty = true;
  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    dirty = true;
  }
  addEventListener('scroll', readScroll, { passive: true });

  // a little parallax from the pointer on desktop, so the room feels like a room
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  if (!coarse && !reduce) addEventListener('pointermove', (e) => { look.tx = (e.clientX / innerWidth - 0.5); look.ty = (e.clientY / innerHeight - 0.5); }, { passive: true });

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 84 : 72;   // portrait phones see more of the dome
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize, { passive: true });

  let hidden = document.hidden;
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; last = performance.now(); });

  // ---------- frame ----------
  let last = performance.now(), t = 0, started = false;
  const tint = new THREE.Color();
  const speed = reduce ? 0.3 : 1;
  window.__dome = { get progress() { return progress; }, setProgress(p) { progress = p; dirty = true; } };

  function frame(now) {
    requestAnimationFrame(frame);
    if (hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    t += dt * speed;

    // which two skies, and how far through the melt (each sky holds, then melts into the next)
    const f = progress * (N_SKY - 1);
    const ia = Math.min(N_SKY - 1, Math.floor(f)), ib = Math.min(N_SKY - 1, ia + 1);
    const frac = f - ia;
    const mix = THREE.MathUtils.smoothstep(frac, 0.28, 0.78);
    domeMat.uniforms.uA.value = skies[ia] || skies[0] || blank;
    domeMat.uniforms.uB.value = skies[ib] || domeMat.uniforms.uA.value;
    domeMat.uniforms.uMix.value = skies[ib] ? mix : 0;
    domeMat.uniforms.uTime.value = t;
    domeMat.uniforms.uSpin.value = t * 0.012 + progress * 0.9;
    tint.copy(tints[ia]).lerp(tints[ib], mix);
    domeMat.uniforms.uTint.value.copy(tint);
    personMat.uniforms.uTint.value.copy(tint);
    sparkMat.uniforms.uTime.value = t;
    sparkMat.uniforms.uTint.value.copy(tint);

    // camera: arc-length points, weighted damping that runs the same at 60 and 120 Hz
    seatPath.getPointAt(progress, camTarget);
    gazePath.getPointAt(progress, lookTarget);
    look.x += (look.tx - look.x) * 0.04; look.y += (look.ty - look.y) * 0.04;
    lookTarget.x += look.x * 3.0; lookTarget.y -= look.y * 2.0;
    lookTarget.x += Math.sin(t * 0.07) * 0.8; lookTarget.y += Math.sin(t * 0.05) * 0.5; // breathing gaze
    const alpha = capture ? 1 : 1 - Math.pow(0.12, dt);
    camera.position.lerp(camTarget, alpha);
    lookNow.lerp(lookTarget, alpha);
    camera.lookAt(lookNow);

    renderer.render(scene, camera);
    if (!started) { started = true; canvas.classList.add('on'); document.documentElement.classList.add('sky-on'); }
    dirty = false;
  }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.classList.remove('on'); document.documentElement.classList.remove('sky-on'); }, false);

  resize(); readScroll();
  document.documentElement.classList.add('sky-live');
  // first sky first, then the rest in show order
  loadSky(0).then(() => {
    requestAnimationFrame(frame);
    (async () => { for (let i = 1; i < N_SKY; i++) await loadSky(i); })();
  });
})();
