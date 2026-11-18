import * as THREE from 'three';

/**
 * Blocky particle bursts (one InstancedMesh of tiny cubes) plus weather (rain, snow-like dust,
 * floating motes). Cheap enough to leave running everywhere.
 */
const MAX = 1200;
export class Particles {
  constructor(scene) {
    this.scene = scene;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mat = new THREE.MeshBasicMaterial({ vertexColors: false, transparent: true, opacity: 1, fog: true });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, MAX);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
    this.mesh.count = 0; this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.parts = [];
    this.tmp = new THREE.Object3D(); this.col = new THREE.Color();

    // Rain
    const rn = 1400; const pos = new Float32Array(rn * 6);
    this.rainGeo = new THREE.BufferGeometry(); this.rainGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(this.rainGeo, new THREE.LineBasicMaterial({ color: 0xaab8cc, transparent: true, opacity: 0.45 }));
    this.rain.frustumCulled = false; this.rain.visible = false; scene.add(this.rain);
    this.rainDrops = []; for (let i = 0; i < rn; i++) this.rainDrops.push({ x: (Math.random() - 0.5) * 60, y: Math.random() * 30, z: (Math.random() - 0.5) * 60, s: 28 + Math.random() * 10 });
    this.rainAmount = 0;

    // Motes (floating dust / fireflies / ash)
    const mn = 300; const mp = new Float32Array(mn * 3);
    this.moteGeo = new THREE.BufferGeometry(); this.moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    this.moteMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.0, depthWrite: false });
    this.motes = new THREE.Points(this.moteGeo, this.moteMat); this.motes.frustumCulled = false; scene.add(this.motes);
    this.moteData = []; for (let i = 0; i < mn; i++) this.moteData.push({ x: (Math.random() - 0.5) * 50, y: Math.random() * 12, z: (Math.random() - 0.5) * 50, p: Math.random() * 10 });
    this.moteFall = 0;
  }

  /** Burst of blocky bits. */
  burst(pos, { count = 20, color = 0xffffff, colors = null, speed = 4, up = 4, life = 1.2, size = 0.12, gravity = 12, spread = 0.3 } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.parts.length >= MAX) this.parts.shift();
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      this.parts.push({
        x: pos.x + (Math.random() - 0.5) * spread, y: pos.y + (Math.random() - 0.5) * spread, z: pos.z + (Math.random() - 0.5) * spread,
        vx: Math.cos(a) * s, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * s,
        rx: Math.random() * 6, ry: Math.random() * 6, life, max: life, size: size * (0.6 + Math.random() * 0.8), gravity,
        color: colors ? colors[i % colors.length] : color,
      });
    }
  }
  confetti(pos, n = 60) { this.burst(pos, { count: n, colors: [0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff, 0xffffff], speed: 6, up: 9, life: 2.2, size: 0.13, gravity: 9 }); }
  sparkle(pos, color = 0xfff1a8) { this.burst(pos, { count: 18, color, speed: 2.5, up: 3, life: 0.9, size: 0.09, gravity: 2 }); }
  dust(pos, color = 0xd8d2c0) { this.burst(pos, { count: 8, color, speed: 1.6, up: 1.2, life: 0.5, size: 0.1, gravity: 4 }); }

  setRain(a) { this.rainAmount = a; this.rain.visible = a > 0.01; this.rain.material.opacity = 0.45 * Math.min(1, a); }
  setMotes(opacity, color = 0xffffff, fall = 0, size = 0.12) { this.moteMat.opacity = opacity; this.moteMat.color.set(color); this.moteFall = fall; this.moteMat.size = size; }

  update(dt, center) {
    let n = 0; const t = this.tmp;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.vy -= p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.vx *= 0.985; p.vz *= 0.985; p.rx += dt * 5; p.ry += dt * 4;
      const s = p.size * Math.min(1, p.life / (p.max * 0.4));
      t.position.set(p.x, p.y, p.z); t.rotation.set(p.rx, p.ry, 0); t.scale.setScalar(Math.max(0.001, s)); t.updateMatrix();
      this.mesh.setMatrixAt(n, t.matrix); this.col.set(p.color); this.mesh.setColorAt(n, this.col); n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true; if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    if (this.rain.visible && center) {
      const arr = this.rainGeo.attributes.position.array; const cnt = Math.floor(this.rainDrops.length * Math.min(1, this.rainAmount));
      for (let i = 0; i < this.rainDrops.length; i++) {
        const d = this.rainDrops[i];
        d.y -= d.s * dt; if (d.y < -2) { d.y = 26 + Math.random() * 4; d.x = (Math.random() - 0.5) * 60; d.z = (Math.random() - 0.5) * 60; }
        const j = i * 6;
        if (i < cnt) { arr[j] = center.x + d.x; arr[j + 1] = center.y + d.y - 4; arr[j + 2] = center.z + d.z; arr[j + 3] = arr[j] + 0.08; arr[j + 4] = arr[j + 1] + 0.7; arr[j + 5] = arr[j + 2]; }
        else { arr[j] = arr[j + 1] = arr[j + 2] = arr[j + 3] = arr[j + 4] = arr[j + 5] = 0; arr[j + 1] = -999; arr[j + 4] = -999; }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }
    if (this.moteMat.opacity > 0.001 && center) {
      const arr = this.moteGeo.attributes.position.array;
      for (let i = 0; i < this.moteData.length; i++) {
        const m = this.moteData[i]; m.p += dt;
        m.y -= this.moteFall * dt; if (m.y < -1) m.y = 12; if (m.y > 13) m.y = -1;
        // wrap around the player
        let x = m.x, z = m.z;
        arr[i * 3] = center.x + ((x - center.x * 0) % 50) + Math.sin(m.p * 0.7) * 0.4;
        arr[i * 3 + 1] = center.y - 2 + m.y + Math.sin(m.p) * 0.2;
        arr[i * 3 + 2] = center.z + z + Math.cos(m.p * 0.6) * 0.4;
      }
      this.moteGeo.attributes.position.needsUpdate = true;
    }
  }

  clear() { this.parts.length = 0; this.mesh.count = 0; }
}
