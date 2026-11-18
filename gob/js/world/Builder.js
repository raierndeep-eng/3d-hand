import * as THREE from 'three';
import * as T from '../render/Textures.js';
import { mulberry32, rand, pick } from '../core/utils.js';

/**
 * Level-building kit. Every piece of scenery is made from primitives here, and anything solid
 * registers a collider automatically. Levels compose these into places.
 */
export class Builder {
  constructor(game, group, seed = 1) {
    this.game = game; this.group = group; this.physics = game.physics;
    this.mats = new Map();
    this.updaters = [];
    this.r = mulberry32(seed);
    this.lights = 0;
  }

  mat(color, opts = {}) {
    const key = JSON.stringify([color, opts.map ? opts.map.uuid : 0, opts.emissive || 0, opts.rough ?? 0.8, opts.transparent || 0, opts.opacity ?? 1, opts.metal || 0, opts.side || 0, opts.ei || 0]);
    if (!this.mats.has(key)) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.8, metalness: opts.metal || 0, map: opts.map || null,
        emissive: opts.emissive || 0x000000, emissiveIntensity: opts.ei ?? 1, transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side || THREE.FrontSide });
      this.mats.set(key, m);
    }
    return this.mats.get(key);
  }

  add(o) { this.group.add(o); return o; }
  onUpdate(fn) { this.updaters.push(fn); return fn; }
  update(dt, t) { for (const f of this.updaters) f(dt, t); }

  /** Box with bottom at y. Solid by default. */
  box({ x = 0, y = 0, z = 0, w = 1, h = 1, d = 1, color = 0xcccccc, mat = null, map = null, rep = null, collide = true, shadow = true, ry = 0, rx = 0, rz = 0, emissive = 0, ei = 1, rough, bounce = 0, oneWay = false, tag = null, noCamera = false, opacity = 1 }) {
    let m = mat;
    if (!m) {
      let tx = map;
      if (map && rep) { tx = map.clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(rep[0], rep[1]); }
      m = this.mat(color, { map: tx, emissive, ei, rough, transparent: opacity < 1, opacity });
    }
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y + h / 2, z); mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = shadow; mesh.receiveShadow = true;
    this.add(mesh);
    if (collide) {
      if (!rx && !rz && Math.abs(Math.sin(ry * 2)) < 1e-3) {
        const sw = Math.abs(Math.cos(ry)) > 0.5 ? w : d, sd = Math.abs(Math.cos(ry)) > 0.5 ? d : w;
        mesh.userData.collider = this.physics.addBox(x, y + h / 2, z, sw, h, sd, { bounce, oneWay, tag, noCamera, object: mesh });
      } else mesh.userData.collider = this.physics.addFromObject(mesh, { bounce, oneWay, tag, noCamera });
    }
    return mesh;
  }

  cyl({ x = 0, y = 0, z = 0, r = 0.5, rt = null, h = 1, color = 0xcccccc, seg = 16, collide = true, shadow = true, mat = null, emissive = 0, rough }) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt ?? r, r, h, seg), mat || this.mat(color, { emissive, rough }));
    mesh.position.set(x, y + h / 2, z); mesh.castShadow = shadow; mesh.receiveShadow = true;
    this.add(mesh);
    if (collide) mesh.userData.collider = this.physics.addBox(x, y + h / 2, z, r * 1.6, h, r * 1.6, { object: mesh });
    return mesh;
  }

  sphere({ x = 0, y = 0, z = 0, r = 0.5, color = 0xffffff, collide = false, seg = 16, emissive = 0, sy = 1, mat = null, opacity = 1 }) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, seg / 2)), mat || this.mat(color, { emissive, transparent: opacity < 1, opacity }));
    mesh.position.set(x, y, z); mesh.scale.y = sy; mesh.castShadow = true; mesh.receiveShadow = true;
    this.add(mesh);
    if (collide) this.physics.addBox(x, y, z, r * 1.6, r * 2 * sy, r * 1.6);
    return mesh;
  }

  /** Big ground slab whose top is at y. */
  ground({ x = 0, z = 0, w = 200, d = 200, y = 0, color = 0x5aa845, tex = null, rep = null, thick = 2, tag = null }) {
    return this.box({ x, y: y - thick, z, w, h: thick, d, color, map: tex, rep: rep || (tex ? [w / 4, d / 4] : null), shadow: false, tag });
  }

  tree(x, z, { s = 1, kind = 'round', leaf = null, trunk = 0x8a5a33, collide = true, y = null } = {}) {
    const r = this.r;
    const gy = y ?? 0;
    const g = new THREE.Group(); g.position.set(x, gy, z);
    const leafCol = leaf ?? pick(r, [0x4caf50, 0x5cbf4f, 0x3d9a46, 0x72c95a]);
    const tr = new THREE.Mesh(new THREE.BoxGeometry(0.6 * s, 2.4 * s, 0.6 * s), this.mat(trunk));
    tr.position.y = 1.2 * s; tr.castShadow = true; g.add(tr);
    if (kind === 'round') {
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry((2.6 - i * 0.6) * s, 1.2 * s, (2.6 - i * 0.6) * s), this.mat(i % 2 ? leafCol : new THREE.Color(leafCol).offsetHSL(0, 0, 0.05).getHex()));
        c.position.y = (2.4 + i * 1.0) * s; c.rotation.y = i * 0.4; c.castShadow = true; c.receiveShadow = true; g.add(c);
      }
    } else if (kind === 'pine') {
      for (let i = 0; i < 4; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry((1.8 - i * 0.38) * s, 1.5 * s, 4), this.mat(leafCol));
        c.position.y = (2.2 + i * 0.95) * s; c.rotation.y = Math.PI / 4; c.castShadow = true; g.add(c);
      }
    } else if (kind === 'blob') {
      const c = new THREE.Mesh(new THREE.SphereGeometry(1.6 * s, 10, 8), this.mat(leafCol)); c.position.y = 3.2 * s; c.castShadow = true; g.add(c);
    } else if (kind === 'dead') {
      for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 1.4 * s, 0.2 * s), this.mat(trunk)); b.position.set((i - 1) * 0.4 * s, 2.6 * s, 0); b.rotation.z = (i - 1) * 0.6; b.castShadow = true; g.add(b); }
    }
    g.rotation.y = r() * Math.PI;
    this.add(g);
    if (collide) this.physics.addBox(x, gy + 1.5 * s, z, 0.7 * s, 3 * s, 0.7 * s);
    return g;
  }

  /** Lots of small flowers/grass via instancing. */
  scatter(n, area, { colors = [0xff6b8a, 0xffd23f, 0xffffff, 0xc77dff, 0x6bc5ff], kind = 'flower', y = 0, avoid = null, scale = 1 } = {}) {
    const r = this.r;
    const geo = kind === 'grass' ? new THREE.BoxGeometry(0.08, 0.45, 0.08) : new THREE.BoxGeometry(0.22, 0.22, 0.22);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const mesh = new THREE.InstancedMesh(geo, mat, n);
    const stemGeo = new THREE.BoxGeometry(0.05, 0.35, 0.05);
    const stems = kind === 'flower' ? new THREE.InstancedMesh(stemGeo, this.mat(0x3d8a3a), n) : null;
    const o = new THREE.Object3D(); const col = new THREE.Color();
    let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      const x = rand(r, area[0], area[2]), z = rand(r, area[1], area[3]);
      if (avoid && avoid(x, z)) continue;
      if (kind === 'grass') { o.position.set(x, y + 0.2 * scale, z); o.rotation.set((r() - 0.5) * 0.4, r() * 3, (r() - 0.5) * 0.4); o.scale.set(scale, scale * (0.6 + r() * 0.8), scale); col.set(pick(r, colors)); }
      else { o.position.set(x, y + 0.42 * scale, z); o.rotation.set(0, r() * 3, 0.785); o.scale.setScalar(scale); col.set(pick(r, colors)); }
      o.updateMatrix(); mesh.setMatrixAt(k, o.matrix); mesh.setColorAt(k, col);
      if (stems) { o.position.y = y + 0.17 * scale; o.rotation.set(0, 0, 0); o.updateMatrix(); stems.setMatrixAt(k, o.matrix); }
      k++;
    }
    mesh.count = k; mesh.receiveShadow = true; this.add(mesh);
    if (stems) { stems.count = k; this.add(stems); }
    return mesh;
  }

  fence(x1, z1, x2, z2, { color = 0xffffff, h = 1.2, collide = true, post = 3, y = 0 } = {}) {
    const len = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
    const n = Math.max(1, Math.round(len / post));
    const g = new THREE.Group(); const m = this.mat(color);
    for (let i = 0; i <= n; i++) {
      const t = i / n; const p = new THREE.Mesh(new THREE.BoxGeometry(0.22, h, 0.22), m);
      p.position.set(x1 + (x2 - x1) * t, y + h / 2, z1 + (z2 - z1) * t); p.castShadow = true; g.add(p);
    }
    for (const yy of [0.35, 0.85]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, len), m);
      rail.position.set((x1 + x2) / 2, y + yy * h, (z1 + z2) / 2); rail.rotation.y = ang; rail.castShadow = true; g.add(rail);
    }
    this.add(g);
    if (collide) {
      const minx = Math.min(x1, x2) - 0.15, maxx = Math.max(x1, x2) + 0.15, minz = Math.min(z1, z2) - 0.15, maxz = Math.max(z1, z2) + 0.15;
      this.physics.addMinMax(minx, y, minz, maxx, y + h + 3, maxz, { noCamera: true });
    }
    return g;
  }

  bench(x, z, ry = 0, color = 0xb07a48, y = 0) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    const m = this.mat(color, { map: T.planks('#b07a48') });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.7), m); seat.position.y = 0.6; g.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.12), m); back.position.set(0, 1.0, -0.3); g.add(back);
    for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.6), this.mat(0x444444)); l.position.set(sx * 1.05, 0.3, 0); g.add(l); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.add(g);
    const c = Math.abs(Math.cos(ry)) > 0.5;
    this.physics.addBox(x, y + 0.34, z, c ? 2.4 : 0.7, 0.68, c ? 0.7 : 2.4);
    return g;
  }

  lamp(x, z, { on = true, color = 0xffe6a8, h = 3.6, light = false, y = 0 } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.18, h, 0.18), this.mat(0x2d3038)); pole.position.y = h / 2; pole.castShadow = true; g.add(pole);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: color, emissiveIntensity: on ? 1.6 : 0 });
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), bulbMat); bulb.position.y = h + 0.2; g.add(bulb);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.radialGlow('255,230,170'), transparent: true, depthWrite: false, opacity: on ? 0.7 : 0 }));
    glow.scale.set(3, 3, 1); glow.position.y = h + 0.2; g.add(glow);
    let pl = null;
    if (light && this.lights < 6) { pl = new THREE.PointLight(color, on ? 8 : 0, 14, 1.6); pl.position.y = h; g.add(pl); this.lights++; }
    this.add(g);
    this.physics.addBox(x, y + h / 2, z, 0.3, h, 0.3, { noCamera: true });
    const api = { group: g, set: (v) => { bulbMat.emissiveIntensity = v ? 1.6 : 0; glow.material.opacity = v ? 0.7 : 0; if (pl) pl.intensity = v ? 8 : 0; } };
    return api;
  }

  /** Wooden or plain sign with text. */
  sign(x, z, text, { ry = 0, w = 2.6, h = 1.3, post = 1.2, color = 0x7a5a33, bg = '#f4ecd2', fg = '#3a2a18', font = '700 54px Fredoka, Trebuchet MS, sans-serif', y = 0, collide = true, border = '#7a5a33' } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    if (post > 0) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, post + h * 0.5, 0.18), this.mat(color)); p.position.y = (post + h * 0.5) / 2; p.castShadow = true; g.add(p); }
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), this.mat(color)); board.position.y = post + h / 2; board.castShadow = true; g.add(board);
    const tx = T.textTexture(text, { bg, color: fg, border, font, w: 512, h: Math.round(512 * h / w) });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.92), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 }));
    face.position.set(0, post + h / 2, 0.065); g.add(face);
    const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.065; g.add(back);
    this.add(g);
    if (collide) this.physics.addBox(x, y + (post + h) / 2, z, 0.4, post + h, 0.4, { noCamera: true });
    return g;
  }

  /** Flat text panel (posters, writing on walls). */
  panel(x, y, z, text, { ry = 0, w = 2, h = 1, bg = '#f4ecd2', fg = '#222', font = '700 50px Fredoka, sans-serif', border = null, emissive = false } = {}) {
    const tx = T.textTexture(text, { bg, color: fg, border, font, w: 512, h: Math.max(64, Math.round(512 * h / w)) });
    const m = emissive ? new THREE.MeshBasicMaterial({ map: tx, transparent: !bg }) : new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9, transparent: !bg });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    p.position.set(x, y, z); p.rotation.y = ry; this.add(p);
    return p;
  }

  house(x, z, { w = 6, d = 6, h = 4, wall = 0xf2e6c9, roof = 0xd35050, door = 0x7a4b2a, ry = 0, windows = true, y = 0 } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.mat(wall)); body.position.y = h / 2; g.add(body);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.8, h * 0.7, 4), this.mat(roof)); rf.position.y = h + h * 0.35; rf.rotation.y = Math.PI / 4; rf.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d)); g.add(rf);
    const dr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2, 0.1), this.mat(door)); dr.position.set(0, 1, d / 2 + 0.02); g.add(dr);
    if (windows) for (const sx of [-1, 1]) { const wn = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 0.1), this.mat(0x9ad4ff, { emissive: 0x223344 })); wn.position.set(sx * w * 0.3, h * 0.6, d / 2 + 0.02); g.add(wn); }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.add(g);
    const c = Math.abs(Math.cos(ry)) > 0.5;
    this.physics.addBox(x, y + h / 2, z, c ? w : d, h, c ? d : w);
    return g;
  }

  rock(x, z, s = 1, color = 0x8a8f99, y = 0, collide = true) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.7 * s, 0), this.mat(color));
    m.position.set(x, y + 0.35 * s, z); m.rotation.set(this.r() * 3, this.r() * 3, 0); m.scale.y = 0.7; m.castShadow = true; m.receiveShadow = true;
    this.add(m);
    if (collide) this.physics.addBox(x, y + 0.3 * s, z, 1.0 * s, 0.6 * s, 1.0 * s);
    return m;
  }

  /** Water surface with gentle animation. */
  water(x, z, w, d, { y = 0.05, color = 0x4fb4e6, opacity = 0.8 } = {}) {
    const geo = new THREE.PlaneGeometry(w, d, Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(d / 2)));
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, metalness: 0.1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; this.add(m);
    const pos = geo.attributes.position; const base = Float32Array.from(pos.array);
    this.onUpdate((dt, t) => {
      for (let i = 0; i < pos.count; i++) pos.array[i * 3 + 2] = Math.sin(t * 1.5 + base[i * 3] * 0.6 + base[i * 3 + 1] * 0.4) * 0.05;
      pos.needsUpdate = true;
    });
    return m;
  }

  cloud(x, y, z, s = 1, drift = 0.6, color = 0xffffff) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const m = this.mat(color, { rough: 1, emissive: 0x888888, ei: 0.4 });
    const r = this.r;
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry((2 + r() * 3) * s, (1 + r()) * s, (2 + r() * 2) * s), m); b.position.set((i - 2) * 1.6 * s, r() * 0.8 * s, (r() - 0.5) * 2 * s); g.add(b); }
    this.add(g);
    this.onUpdate((dt) => { g.position.x += drift * dt; if (g.position.x > 220) g.position.x = -220; });
    return g;
  }

  /** Roblox-style spawn location pad. */
  spawnPad(x, z, { y = 0, color = 0x9aa0aa } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 4), this.mat(color, { rough: 0.5 })); base.position.y = 0.15; base.receiveShadow = true; base.castShadow = true; g.add(base);
    const top = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 3.4), this.mat(0xb8bec8, { rough: 0.4 })); top.position.y = 0.32; top.receiveShadow = true; g.add(top);
    // little cross-ish emblem
    const em = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 1.4), this.mat(0x6d737d)); em.position.y = 0.34; em.rotation.y = Math.PI / 4; g.add(em);
    const em2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.6), this.mat(0xb8bec8)); em2.position.y = 0.35; em2.rotation.y = Math.PI / 4; g.add(em2);
    this.add(g);
    this.physics.addBox(x, y + 0.17, z, 4, 0.34, 4);
    return g;
  }

  balloon(x, y, z, color, { string = true } = {}) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), this.mat(color, { rough: 0.3 })); b.scale.y = 1.2; b.castShadow = true; g.add(b);
    if (string) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.4, 0.02), this.mat(0xeeeeee)); s.position.y = -1.2; g.add(s); }
    this.add(g);
    const ph = this.r() * 6;
    this.onUpdate((dt, t) => { g.position.y = y + Math.sin(t * 1.4 + ph) * 0.15; g.rotation.z = Math.sin(t + ph) * 0.08; });
    return g;
  }

  /** Text sprite floating in space. */
  label(text, x, y, z, { color = '#ffffff', scale = 2 } = {}) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.overheadName(text, color), transparent: true, depthWrite: false }));
    s.scale.set(scale * 4, scale, 1); s.position.set(x, y, z); this.add(s);
    return s;
  }

  stairs(x, z, { dir = [0, 1], steps = 6, w = 3, rise = 0.4, run = 0.8, color = 0xbbbbbb, y = 0, map = null } = {}) {
    for (let i = 0; i < steps; i++) {
      this.box({ x: x + dir[0] * run * i, z: z + dir[1] * run * i, y, w: dir[0] ? run : w, d: dir[1] ? run : w, h: rise * (i + 1), color, map, rep: map ? [1, 1] : null });
    }
  }

  pointLight(x, y, z, color = 0xffffff, intensity = 6, dist = 16) {
    if (this.lights >= 8) return null;
    const l = new THREE.PointLight(color, intensity, dist, 1.5); l.position.set(x, y, z); this.add(l); this.lights++;
    return l;
  }
}
