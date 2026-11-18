import * as THREE from 'three';
import * as T from '../render/Textures.js';

/**
 * "Press E" interactions + the floating objective marker.
 */
export class Interactions {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.current = null;
    this.promptEl = document.getElementById('prompt');
    this.promptText = document.getElementById('prompt-text');
    this.promptKey = this.promptEl.querySelector('.key');
  }
  clear() { this.list.length = 0; this.current = null; this.promptEl.classList.add('hidden'); }

  /** opts: pos (Vector3 | () => Vector3), radius, label, onUse, once, enabled */
  add(opts) {
    const it = { radius: 2.2, enabled: true, once: false, ...opts };
    this.list.push(it);
    return it;
  }
  remove(it) { const i = this.list.indexOf(it); if (i >= 0) this.list.splice(i, 1); if (this.current === it) this.current = null; }

  /** Promise that resolves when the player uses this spot. */
  waitUse(pos, label, radius = 2.2) {
    return this.game.promise((res) => { this.add({ pos, label, radius, once: true, onUse: () => res() }); });
  }

  update() {
    const g = this.game, p = g.player.body.pos;
    let best = null, bd = Infinity;
    if (g.player.controllable) {
      for (const it of this.list) {
        if (!it.enabled) continue;
        const ip = typeof it.pos === 'function' ? it.pos() : it.pos;
        const dx = ip.x - p.x, dz = ip.z - p.z, dy = ip.y - (p.y + 0.5);
        if (Math.abs(dy) > it.radius + 1.5) continue;
        const d = Math.hypot(dx, dz);
        if (d < it.radius && d < bd) { bd = d; best = it; }
      }
    }
    if (best !== this.current) {
      this.current = best;
      if (best) {
        this.promptText.textContent = best.label;
        this.promptKey.textContent = g.input.isTouch ? 'USE' : 'E';
        this.promptEl.classList.remove('hidden');
      } else this.promptEl.classList.add('hidden');
    }
    if (best && g.input.usePressed()) {
      g.sfx.play('interact');
      if (best.once) this.remove(best);
      this.current = null; this.promptEl.classList.add('hidden');
      best.onUse && best.onUse();
    }
  }
}

/** A bobbing diamond + soft light pillar showing where to go next. */
export class Marker {
  constructor(scene) {
    this.group = new THREE.Group();
    const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, fog: false }));
    this.dia = dia; this.group.add(dia);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 30, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    pillar.position.y = 14; this.group.add(pillar); this.pillar = pillar;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.radialGlow('255,220,120'), transparent: true, depthWrite: false, fog: false }));
    glow.scale.set(2, 2, 1); this.group.add(glow);
    this.group.visible = false;
    scene.add(this.group);
    this.t = 0; this.target = null;
  }
  set(pos, h = 2.2) { this.target = pos; this.h = h; this.group.visible = !!pos; }
  clear() { this.target = null; this.group.visible = false; }
  update(dt, playerPos) {
    if (!this.target) return;
    this.t += dt;
    const p = typeof this.target === 'function' ? this.target() : this.target;
    this.group.position.set(p.x, p.y + this.h + Math.sin(this.t * 2.5) * 0.2, p.z);
    this.dia.rotation.y += dt * 2;
    // hide the pillar when close; it's a navigation aid, not decoration
    const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
    this.pillar.material.opacity = Math.min(0.14, Math.max(0, (d - 6) / 40));
  }
}
