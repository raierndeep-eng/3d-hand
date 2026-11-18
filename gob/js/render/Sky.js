import * as THREE from 'three';
import { lerp, mulberry32 } from '../core/utils.js';
import { drawGrain } from './Textures.js';

/**
 * Sky dome + atmosphere. A "mood" bundles sky colors, fog, sun, ambient light, exposure and
 * screen-space grading (saturation/contrast/vignette/grain). Moods blend smoothly so the
 * world can slowly lose its colour as the story goes on.
 */
export const MOODS = {
  morning: { top: '#5fb4ff', bottom: '#d9f1ff', fog: '#cfeaff', fogNear: 60, fogFar: 260, sun: '#fff1d0', sunI: 2.3, hemiSky: '#d6ecff', hemiGround: '#6f9a46', hemiI: 1.0, exposure: 1.05, sat: 1.12, con: 1.02, vig: 0.25, grain: 0, tint: 'rgba(255,220,150,1)', tintA: 0.04, stars: 0, sunDir: [0.6, 0.8, 0.3], clouds: 1, sunDisc: 1 },
  noon: { top: '#3f9cf5', bottom: '#bfe6ff', fog: '#c4e4ff', fogNear: 70, fogFar: 300, sun: '#ffffff', sunI: 2.5, hemiSky: '#d0e8ff', hemiGround: '#6f9a46', hemiI: 1.0, exposure: 1.05, sat: 1.15, con: 1.03, vig: 0.22, grain: 0, tint: 'rgba(255,255,255,1)', tintA: 0, stars: 0, sunDir: [0.3, 1, 0.2], clouds: 1, sunDisc: 1 },
  sunset: { top: '#4a5fb8', bottom: '#ffb36b', fog: '#f4a77a', fogNear: 50, fogFar: 230, sun: '#ffb070', sunI: 2.0, hemiSky: '#ffc9a0', hemiGround: '#5b5a3a', hemiI: 0.85, exposure: 1.05, sat: 1.15, con: 1.05, vig: 0.35, grain: 0, tint: 'rgba(255,140,80,1)', tintA: 0.07, stars: 0.15, sunDir: [-0.9, 0.18, 0.2], clouds: 1, sunDisc: 1 },
  night: { top: '#0b1030', bottom: '#2a2f5c', fog: '#1d2244', fogNear: 30, fogFar: 160, sun: '#8fa6ff', sunI: 0.55, hemiSky: '#55609a', hemiGround: '#1c2030', hemiI: 0.55, exposure: 1.0, sat: 1.0, con: 1.0, vig: 0.45, grain: 0.02, tint: 'rgba(60,80,200,1)', tintA: 0.05, stars: 1, sunDir: [0.4, 0.7, -0.4], clouds: 0.4, sunDisc: 0 },
  overcast: { top: '#8592a3', bottom: '#c3c9cf', fog: '#b2b8bf', fogNear: 25, fogFar: 150, sun: '#e8ecf0', sunI: 0.9, hemiSky: '#c6ccd4', hemiGround: '#5c6156', hemiI: 0.95, exposure: 0.95, sat: 0.72, con: 1.0, vig: 0.4, grain: 0.03, tint: 'rgba(120,130,150,1)', tintA: 0.05, stars: 0, sunDir: [0.3, 0.9, 0.2], clouds: 0.6, sunDisc: 0 },
  storm: { top: '#2e343f', bottom: '#59606b', fog: '#4b525c', fogNear: 10, fogFar: 85, sun: '#a9b4c4', sunI: 0.5, hemiSky: '#7d8796', hemiGround: '#2a2d2c', hemiI: 0.8, exposure: 0.9, sat: 0.5, con: 1.08, vig: 0.6, grain: 0.06, tint: 'rgba(40,60,90,1)', tintA: 0.1, stars: 0, sunDir: [0.2, 0.9, 0.2], clouds: 0.3, sunDisc: 0 },
  grief: { top: '#868a92', bottom: '#b9bbbe', fog: '#a7a9ad', fogNear: 18, fogFar: 120, sun: '#e0e0e0', sunI: 0.75, hemiSky: '#bcbec3', hemiGround: '#545650', hemiI: 0.9, exposure: 0.92, sat: 0.3, con: 0.98, vig: 0.5, grain: 0.05, tint: 'rgba(90,95,110,1)', tintA: 0.06, stars: 0, sunDir: [0.4, 0.8, 0.1], clouds: 0.4, sunDisc: 0 },
  griefNight: { top: '#06070c', bottom: '#191b24', fog: '#121419', fogNear: 10, fogFar: 90, sun: '#7b86a3', sunI: 0.35, hemiSky: '#3a3f55', hemiGround: '#111216', hemiI: 0.5, exposure: 0.95, sat: 0.3, con: 1.0, vig: 0.65, grain: 0.06, tint: 'rgba(30,30,60,1)', tintA: 0.06, stars: 0.7, sunDir: [0.4, 0.7, -0.4], clouds: 0, sunDisc: 0 },
  liminal: { top: '#e9df9f', bottom: '#f2ecc5', fog: '#e8dfae', fogNear: 6, fogFar: 60, sun: '#fff7d6', sunI: 0.6, hemiSky: '#fff6d0', hemiGround: '#9b9067', hemiI: 1.5, exposure: 1.0, sat: 0.85, con: 0.95, vig: 0.55, grain: 0.09, tint: 'rgba(230,220,120,1)', tintA: 0.06, stars: 0, sunDir: [0.1, 1, 0.1], clouds: 0, sunDisc: 0 },
  liminalDark: { top: '#3e3a26', bottom: '#5e5838', fog: '#57502f', fogNear: 4, fogFar: 40, sun: '#e4d79a', sunI: 0.35, hemiSky: '#b5a96e', hemiGround: '#3b3520', hemiI: 0.9, exposure: 0.95, sat: 0.6, con: 1.05, vig: 0.75, grain: 0.13, tint: 'rgba(120,100,40,1)', tintA: 0.1, stars: 0, sunDir: [0.1, 1, 0.1], clouds: 0, sunDisc: 0 },
  under: { top: '#000000', bottom: '#0d0f16', fog: '#07080c', fogNear: 6, fogFar: 55, sun: '#9aa6c8', sunI: 0.45, hemiSky: '#4a5168', hemiGround: '#0d0e12', hemiI: 0.6, exposure: 1.0, sat: 0.55, con: 1.05, vig: 0.7, grain: 0.08, tint: 'rgba(40,40,80,1)', tintA: 0.05, stars: 0.35, sunDir: [0.1, 1, 0.2], clouds: 0, sunDisc: 0 },
  dawn: { top: '#6d86c9', bottom: '#ffd9b0', fog: '#e6d2c4', fogNear: 40, fogFar: 220, sun: '#ffd8a8', sunI: 1.7, hemiSky: '#e6dcf0', hemiGround: '#5f7448', hemiI: 0.95, exposure: 1.02, sat: 0.8, con: 1.0, vig: 0.35, grain: 0.02, tint: 'rgba(255,190,140,1)', tintA: 0.05, stars: 0.05, sunDir: [0.9, 0.25, 0.3], clouds: 0.8, sunDisc: 1 },
};

const NUM_KEYS = ['fogNear', 'fogFar', 'sunI', 'hemiI', 'exposure', 'sat', 'con', 'vig', 'grain', 'tintA', 'stars', 'clouds', 'sunDisc'];
const COL_KEYS = ['top', 'bottom', 'fog', 'sun', 'hemiSky', 'hemiGround'];

export class Sky {
  constructor(engine) {
    this.engine = engine;
    const scene = engine.scene;
    this.uniforms = {
      top: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(0.6, 0.8, 0.3).normalize() }, sunCol: { value: new THREE.Color() }, sunDisc: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; gl_Position.z = gl_Position.w; }`,
      fragmentShader: `uniform vec3 top; uniform vec3 bottom; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunDisc; varying vec3 vDir;
        void main(){ float h = clamp(vDir.y*0.5+0.5,0.0,1.0); vec3 c = mix(bottom, top, smoothstep(0.42,1.0,h));
          float s = max(dot(normalize(vDir), normalize(sunDir)),0.0);
          c += sunCol * (pow(s, 900.0)*2.0 + pow(s, 12.0)*0.25) * sunDisc;
          gl_FragColor = vec4(c,1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), mat);
    this.dome.renderOrder = -10; this.dome.frustumCulled = false;
    scene.add(this.dome);

    // Stars
    const r = mulberry32(42); const pts = [];
    for (let i = 0; i < 900; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2; const y = Math.abs(u); const rr = Math.sqrt(1 - y * y); pts.push(Math.cos(a) * rr * 450, y * 450 + 10, Math.sin(a) * rr * 450); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
    this.stars = new THREE.Points(g, this.starMat); this.stars.frustumCulled = false;
    scene.add(this.stars);

    this.fog = new THREE.Fog(0xffffff, 50, 250);
    scene.fog = this.fog;
    this.cur = this.parse(MOODS.morning);
    this.from = null; this.to = null; this.t = 1; this.dur = 1;
    this.apply();
    this.grainCanvas = document.getElementById('fx-grain');
    this.grainTimer = 0;
    this.extraSat = 1; // settings / story multiplier
  }

  parse(m) {
    const o = {};
    for (const k of NUM_KEYS) o[k] = m[k] ?? 0;
    for (const k of COL_KEYS) o[k] = new THREE.Color(m[k]);
    o.tint = m.tint || 'rgba(0,0,0,1)';
    o.sunDir = new THREE.Vector3(...(m.sunDir || [0.5, 0.8, 0.3])).normalize();
    return o;
  }

  setMood(mood, dur = 0, overrides = null) {
    const m = typeof mood === 'string' ? MOODS[mood] : mood;
    const target = this.parse(overrides ? { ...m, ...overrides } : m);
    if (dur <= 0) { this.cur = target; this.t = 1; this.to = null; this.apply(); return; }
    this.from = this.clone(this.cur); this.to = target; this.t = 0; this.dur = dur;
  }

  clone(o) { const c = { ...o }; for (const k of COL_KEYS) c[k] = o[k].clone(); c.sunDir = o.sunDir.clone(); return c; }

  update(dt, center) {
    if (this.to) {
      this.t = Math.min(1, this.t + dt / this.dur);
      const k = this.t * this.t * (3 - 2 * this.t);
      for (const key of NUM_KEYS) this.cur[key] = lerp(this.from[key], this.to[key], k);
      for (const key of COL_KEYS) this.cur[key].copy(this.from[key]).lerp(this.to[key], k);
      this.cur.sunDir.copy(this.from.sunDir).lerp(this.to.sunDir, k).normalize();
      this.cur.tint = this.to.tint;
      if (this.t >= 1) this.to = null;
      this.apply();
    }
    if (center) { this.dome.position.copy(center); this.stars.position.copy(center); }
    // grain
    if (this.cur.grain > 0.001) {
      this.grainTimer -= dt;
      if (this.grainTimer <= 0) { this.grainTimer = 0.07; drawGrain(this.grainCanvas); }
    }
  }

  apply() {
    const c = this.cur, e = this.engine;
    this.uniforms.top.value.copy(c.top); this.uniforms.bottom.value.copy(c.bottom);
    this.uniforms.sunDir.value.copy(c.sunDir); this.uniforms.sunCol.value.copy(c.sun); this.uniforms.sunDisc.value = c.sunDisc;
    this.fog.color.copy(c.fog); this.fog.near = c.fogNear; this.fog.far = c.fogFar;
    e.sun.color.copy(c.sun); e.sun.intensity = c.sunI;
    e.hemi.color.copy(c.hemiSky); e.hemi.groundColor.copy(c.hemiGround); e.hemi.intensity = c.hemiI;
    e.renderer.toneMappingExposure = c.exposure;
    e.sunOffset.copy(c.sunDir).multiplyScalar(60);
    if (e.sunOffset.y < 12) e.sunOffset.y = 12;
    this.starMat.opacity = c.stars;
    this.stars.visible = c.stars > 0.01;
    const sat = c.sat * this.extraSat;
    e.canvas.style.filter = `saturate(${sat.toFixed(3)}) contrast(${c.con.toFixed(3)})`;
    document.getElementById('fx-vignette').style.opacity = c.vig;
    document.getElementById('fx-grain').style.opacity = c.grain;
    const tint = document.getElementById('fx-tint');
    tint.style.background = c.tint; tint.style.opacity = c.tintA;
  }
}
