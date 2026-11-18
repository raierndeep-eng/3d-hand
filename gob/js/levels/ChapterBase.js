import * as THREE from 'three';
import { Builder } from '../world/Builder.js';
import { dist2 } from '../core/utils.js';

/**
 * Shared helpers for chapter scripts. A chapter = build() the world + beats() list of async
 * story steps. Beats can declare `at` (spawn positions used when loading a save mid-chapter).
 */
export class ChapterBase {
  constructor(game) {
    this.game = game; this.g = game;
    this.b = new Builder(game, game.world, this.seed || 1);
    this.muffle = 0;
  }
  get gob() { return this.game.player; }
  get kalo() { return this.game.kalo; }
  get flags() { return this.game.flags; }

  // ------------- story shortcuts
  say(lines, opts) { return this.game.dialogue.play(lines, opts); }
  wait(s) { return this.game.wait(s); }
  until(fn) { return this.game.until(fn); }
  objective(t, p = '') { this.game.hud.objective(t, p); }
  progress(p) { this.game.hud.progress(p); }
  chat(t, cls) { this.game.hud.chatMsg(t, cls); }
  mark(pos, h) { this.game.marker.set(v3(pos), h); }
  unmark() { this.game.marker.clear(); }
  sfx(n, o) { this.game.sfx.play(n, o); }
  music(n, f) { this.game.music.play(n, f); }
  mood(m, d = 0, o) { this.game.sky.setMood(m, d, o); }

  /** Wait until GOB is within r of pos. Shows the marker unless hidden. */
  async reach(pos, r = 3, { marker = true, h } = {}) {
    const p = v3(pos);
    if (marker) this.mark(p, h);
    await this.until(() => dist2(this.gob.body.pos.x, this.gob.body.pos.z, p.x, p.z) < r && Math.abs(this.gob.body.pos.y - p.y) < 4);
    if (marker) this.unmark();
  }

  /** Wait for an E-press near pos. */
  async use(pos, label, r = 2.4, { marker = true, h } = {}) {
    const p = v3(pos);
    if (marker) this.mark(p, h);
    await this.game.interactions.waitUse(p, label, r);
    if (marker) this.unmark();
  }

  /**
   * Floating pickups (bricks, tickets, blocks). Resolves when all are collected.
   * items: [{pos:[x,y,z], mesh?}], make: (item) => Object3D
   */
  collectAll(items, make, { label = 'Collected', sound = 'collect', radius = 1.4, onPick = null, total = null, already = 0, onEach = null } = {}) {
    const game = this.game;
    const n = total ?? items.length;
    let got = already;
    this.progress(`${got}/${n}`);
    const live = items.map((it, i) => {
      const o = make(it, i); o.position.set(it.pos[0], it.pos[1], it.pos[2]);
      game.world.add(o);
      return { o, base: it.pos[1], i, it };
    });
    return game.promise((res) => {
      if (got >= n) { res(); return; }
      const upd = this.b.onUpdate((dt, t) => {
        const p = game.player.body.pos;
        for (let k = live.length - 1; k >= 0; k--) {
          const L = live[k];
          L.o.rotation.y += dt * 1.6; L.o.position.y = L.base + 0.5 + Math.sin(t * 2.4 + L.i) * 0.15;
          const dx = L.o.position.x - p.x, dz = L.o.position.z - p.z, dy = L.o.position.y - (p.y + 0.6);
          if (dx * dx + dz * dz < radius * radius && Math.abs(dy) < 1.6) {
            game.sfx.play(sound); game.fx.sparkle(L.o.position);
            game.world.remove(L.o); live.splice(k, 1); got++;
            this.progress(`${got}/${n}`);
            onEach && onEach(L.it, got);
            if (got >= n) { const idx = this.b.updaters.indexOf(upd); if (idx >= 0) this.b.updaters.splice(idx, 1); res(); }
          }
        }
      });
    });
  }

  /** Several E-spots at once; resolves with the index of the one used. */
  useAny(spots) {
    const it = this.game.interactions; const handles = [];
    return this.game.promise((res) => {
      spots.forEach((sp, i) => handles.push(it.add({ pos: v3(sp.pos), label: sp.label, radius: sp.radius || 2.4, onUse: () => { handles.forEach((h) => it.remove(h)); res(i); } })));
    });
  }

  /** Run fn(k) every frame for dur seconds (k: 0..1). */
  anim(dur, fn) {
    let t = 0;
    return this.game.promise((res) => {
      const u = this.b.onUpdate((dt) => {
        t = Math.min(dur, t + dt); fn(t / dur);
        if (t >= dur) { const i = this.b.updaters.indexOf(u); if (i >= 0) this.b.updaters.splice(i, 1); res(); }
      });
    });
  }

  /** A little studded toy brick (pickups). */
  brick(color = 0xff5a5a, s = 0.6) {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(s * 1.4, s * 0.7, s * 0.7), m); body.castShadow = true; g.add(body);
    for (const x of [-0.35, 0.35]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.17, s * 0.17, s * 0.15, 10), m); st.position.set(x * s, s * 0.42, 0); g.add(st); }
    return g;
  }

  // ------------- cutscene helpers
  async cutIn(opts) { this.game.cut.begin(opts); }
  cutOut() { this.game.cut.end(); }
  cam(pos, look, dur) { return this.game.cut.move(v3(pos), v3(look), dur); }
  camSet(pos, look) { this.game.cut.set(v3(pos), v3(look)); }
  /** A two-shot of GOB and Kalo. */
  async twoShot(side = 1, dist = 6, h = 2.4, dur = 1.2) {
    const k = this.kalo.pos.clone(), g = this.gob.body.pos.clone();
    const s = this.game.cut.twoShot(g, k, side, dist, h);
    if (dur <= 0) this.game.cut.set(s.pos, s.look); else await this.game.cut.move(s.pos, s.look, dur);
  }
  /** Close shot on GOB's face. */
  async gobClose(dist = 2.8, h = 0.6, dur = 1.2, side = 0) {
    const p = this.gob.body.pos, y = this.gob.yaw + side;
    const pos = new THREE.Vector3(p.x + Math.sin(y) * dist, p.y + 0.55 + h, p.z + Math.cos(y) * dist);
    const look = new THREE.Vector3(p.x, p.y + 0.6, p.z);
    if (dur <= 0) this.game.cut.set(pos, look); else await this.game.cut.move(pos, look, dur);
  }
  faceEachOther() { if (!this.kalo) return; this.kalo.faceGob(); this.gob.faceTowards(this.kalo.pos); }

  async titleCard(num, title, sub) { await this.game.hud.titleCard(num, title, sub); }

  update(dt, t) { this.b.update(dt, t); }
  dispose() {}
}

export function v3(p) { if (!p) return p; return p.isVector3 ? p : new THREE.Vector3(p[0], p[1], p[2]); }
