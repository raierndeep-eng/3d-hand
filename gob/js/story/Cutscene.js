import * as THREE from 'three';
import { easeInOut } from '../core/utils.js';

/**
 * Cutscene director: takes the camera, adds letterbox bars, moves the camera along tweens or
 * tracks a moving subject, then hands the camera back to the player smoothly.
 */
export class Cutscene {
  constructor(game) {
    this.game = game;
    this.cam = game.engine.camera;
    this.active = false;
    this.tween = null; this.track = null;
    this.letterbox = document.getElementById('letterbox');
    this.look = new THREE.Vector3();
  }

  begin({ letterbox = true } = {}) {
    if (this.active) return;
    this.active = true;
    this.game.lock('cutscene');
    this.game.cameraCtl.active = false;
    this.letterbox.classList.toggle('on', letterbox);
    const d = new THREE.Vector3(); this.cam.getWorldDirection(d);
    this.look.copy(this.cam.position).addScaledVector(d, 10);
  }

  end() {
    if (!this.active) return;
    this.active = false; this.tween = null; this.track = null;
    this.letterbox.classList.remove('on');
    this.game.cameraCtl.active = true;
    this.game.cameraCtl.resumeFrom();
    this.game.unlock('cutscene');
  }

  /** Instantly place camera. */
  set(pos, look) { this.tween = null; this.track = null; this.cam.position.copy(v(pos)); this.look.copy(v(look)); this.cam.lookAt(this.look); }

  /** Smoothly move camera to pos looking at look. Resolves when done. */
  move(pos, look, dur = 2, ease = easeInOut) {
    this.track = null;
    const t = { fromP: this.cam.position.clone(), fromL: this.look.clone(), toP: v(pos).clone(), toL: v(look).clone(), t: 0, dur, ease };
    this.tween = t;
    return this.game.promise((res) => { t.resolve = res; });
  }

  /** Follow something every frame: posFn/lookFn return Vector3. */
  follow(posFn, lookFn, smooth = 4) { this.tween = null; this.track = { posFn, lookFn, smooth }; }

  /** Orbit slowly around a point (for establishing shots). */
  orbit(center, radius, height, speed = 0.15, startAngle = 0) {
    const c = v(center).clone(); let a = startAngle;
    this.follow(() => { a += speed * this.game.dt; return new THREE.Vector3(c.x + Math.sin(a) * radius, c.y + height, c.z + Math.cos(a) * radius); }, () => c, 50);
  }

  /** Common shot: over-the-shoulder two-shot between two positions. */
  twoShot(a, b, side = 1, dist = 6, height = 2.2) {
    a = v(a); b = v(b);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a); dir.y = 0; dir.normalize();
    const perp = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side);
    const pos = mid.clone().addScaledVector(perp, dist); pos.y += height;
    const look = mid.clone(); look.y += 1.2;
    return { pos, look };
  }

  update(dt) {
    if (!this.active) return;
    if (this.tween) {
      const t = this.tween; t.t = Math.min(1, t.t + dt / t.dur);
      const k = t.ease(t.t);
      this.cam.position.lerpVectors(t.fromP, t.toP, k);
      this.look.lerpVectors(t.fromL, t.toL, k);
      this.cam.lookAt(this.look);
      if (t.t >= 1) { this.tween = null; t.resolve && t.resolve(); }
    } else if (this.track) {
      const p = this.track.posFn(), l = this.track.lookFn();
      const k = 1 - Math.exp(-this.track.smooth * dt);
      this.cam.position.lerp(p, k); this.look.lerp(l, k);
      this.cam.lookAt(this.look);
    }
  }
}

function v(p) { return p instanceof THREE.Vector3 ? p : new THREE.Vector3(p[0], p[1], p[2]); }
