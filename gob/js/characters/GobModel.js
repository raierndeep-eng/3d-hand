import * as THREE from 'three';
import * as T from '../render/Textures.js';
import { damp, clamp } from '../core/utils.js';

/**
 * GOB, built to match the reference image:
 *  - a plain slate-blue stucco cube (no bevels, no limbs),
 *  - two pixel-art bloodshot eyes on the front face, the viewer-left eye smaller and lower,
 *  - octagonal blue irises (left iris sits down-left in its eye, right iris up-right),
 *  - the red "HI! IM / GOB" name tag in the bottom-right corner.
 * GOB has no mouth or limbs, so all of his acting is done with hops, squash, tilt and eyes.
 */
export const GOB_SIZE = 1.1;

// Face layout measured from the reference image (u: left→right, v: bottom→top, radii in face widths).
const EYES = [
  { u: 0.31, v: 0.44, r: 0.156, ir: 0.058, iu: -0.022, iv: -0.012, seed: 3 },
  { u: 0.72, v: 0.52, r: 0.167, ir: 0.072, iu: 0.022, iv: 0.01, seed: 8 },
];

export class GobModel {
  constructor() {
    const S = GOB_SIZE;
    this.root = new THREE.Group();          // world placement (bottom-center)
    this.body = new THREE.Group();          // squash/tilt pivot at bottom
    this.root.add(this.body);
    const side = (seed) => new THREE.MeshStandardMaterial({ map: T.gobSide(seed), roughness: 0.92, metalness: 0 });
    const front = new THREE.MeshStandardMaterial({ map: T.gobFace(), roughness: 0.92, metalness: 0 });
    const mats = [side(11), side(12), side(13), side(14), front, side(15)];
    this.cube = new THREE.Mesh(new THREE.BoxGeometry(S, S, S), mats);
    this.cube.position.y = S / 2;
    this.cube.castShadow = true; this.cube.receiveShadow = true;
    this.body.add(this.cube);

    // Eyes (flat decals on the front face so they can look around and blink).
    this.eyes = [];
    const shadowTex = T.irisShadow(), irisTex = T.iris();
    for (const e of EYES) {
      const g = new THREE.Group();
      g.position.set((e.u - 0.5) * S, (e.v - 0.5) * S, S / 2 + 0.002);
      const white = new THREE.Mesh(new THREE.PlaneGeometry(e.r * 2 * S, e.r * 2 * S),
        new THREE.MeshStandardMaterial({ map: T.eyeWhite(e.seed), roughness: 0.55, alphaTest: 0.5, transparent: false }));
      g.add(white);
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(e.ir * 3.1 * S, e.ir * 3.1 * S), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 }));
      sh.position.z = 0.001; g.add(sh);
      const ir = new THREE.Mesh(new THREE.PlaneGeometry(e.ir * 2 * S, e.ir * 2 * S), new THREE.MeshStandardMaterial({ map: irisTex, roughness: 0.3, alphaTest: 0.5 }));
      ir.position.z = 0.002; g.add(ir);
      this.cube.add(g);
      g.position.y += 0; // relative to cube center
      this.eyes.push({ g, white, sh, ir, def: e, base: new THREE.Vector2(e.iu * S, e.iv * S), max: (e.r - e.ir - 0.02) * S });
    }

    // State
    this.hopPhase = 0; this.hopHeight = 0;
    this.squash = 0; this.squashVel = 0;
    this.tiltX = 0; this.tiltZ = 0; this.targetTiltX = 0;
    this.blinkT = 2 + Math.random() * 3; this.blinking = 0;
    this.look = new THREE.Vector2(); this.lookTarget = new THREE.Vector2();
    this.lookWorld = null; this.wanderT = 0;
    this.emoteName = null; this.emoteT = 0;
    this.mood = 'normal';
    this.time = 0;
    this.pupilScale = 1;
    this._v = new THREE.Vector3(); this._m = new THREE.Matrix4();
  }

  setMood(m) { this.mood = m; }
  emote(name, dur = 1.2) { this.emoteName = name; this.emoteT = 0; this.emoteDur = dur; }
  lookAtWorld(v) { this.lookWorld = v ? v.clone() : null; }
  impulseSquash(a) { this.squashVel += a; }

  /** speed: horizontal speed, grounded, vy: vertical velocity. */
  update(dt, { speed = 0, grounded = true, vy = 0, landed = 0 } = {}) {
    this.time += dt;
    const S = GOB_SIZE;
    const sad = this.mood === 'sad' || this.mood === 'grief';
    // Hop cycle while moving on ground (GOB has no legs; he scoots in little hops).
    if (grounded && speed > 0.3) {
      const rate = (sad ? 6.5 : 9) + speed * 0.6;
      this.hopPhase += dt * rate;
      const h = Math.abs(Math.sin(this.hopPhase)) * (sad ? 0.12 : 0.22) * Math.min(1, speed / 4);
      this.hopHeight = damp(this.hopHeight, h, 30, dt);
      if (Math.sin(this.hopPhase) * Math.sin(this.hopPhase - dt * rate) < 0) this.squashVel -= 1.2; // contact squash
    } else {
      this.hopHeight = damp(this.hopHeight, 0, 14, dt);
    }
    if (landed > 2) this.squashVel -= Math.min(6, landed * 0.45);

    // Spring for squash & stretch
    let target = 0;
    if (!grounded) target = clamp(vy * 0.02, -0.12, 0.16);
    const idleBreath = Math.sin(this.time * (sad ? 1.4 : 2.2)) * 0.012;
    // semi-implicit spring, sub-stepped so low frame rates stay stable
    for (let rem = dt; rem > 1e-6; rem -= 1 / 120) {
      const h = Math.min(rem, 1 / 120);
      this.squashVel += ((target - this.squash) * 160 - this.squashVel * 14) * h;
      this.squash += this.squashVel * h;
    }
    this.squash = clamp(this.squash, -0.35, 0.35);

    // Posture
    let tx = 0, tz = 0, extraY = 0, extraRot = 0;
    if (speed > 0.3 && grounded) tx = 0.06 + speed * 0.008;
    if (sad) tx += 0.12;
    if (this.emoteName) {
      this.emoteT += dt; const t = this.emoteT; const k = t / this.emoteDur;
      switch (this.emoteName) {
        case 'happy': extraY = Math.abs(Math.sin(t * 9)) * 0.35 * (1 - k); break;
        case 'bounce': extraY = Math.abs(Math.sin(t * 7)) * 0.6 * (1 - k); break;
        case 'nod': tx += Math.sin(t * 12) * 0.18 * (1 - k); break;
        case 'shake': extraRot = Math.sin(t * 16) * 0.22 * (1 - k); break;
        case 'shiver': tz = Math.sin(t * 50) * 0.03; extraRot = Math.sin(t * 37) * 0.02; break;
        case 'surprised': this.squash = 0.15 * (1 - k); extraY = 0.15 * Math.sin(Math.min(1, k * 3) * Math.PI); break;
        case 'droop': tx += 0.3 * Math.min(1, k * 2); break;
        case 'spin': extraRot = k * Math.PI * 2; extraY = Math.sin(k * Math.PI) * 0.6; break;
        case 'tiltHead': tz = 0.22 * Math.sin(Math.min(1, k * 2) * Math.PI * 0.5); break;
        case 'lookUp': tx -= 0.25 * Math.min(1, k * 3); break;
      }
      if (this.emoteT >= this.emoteDur && this.emoteName !== 'droop' && this.emoteName !== 'lookUp' && this.emoteName !== 'shiver' && this.emoteName !== 'tiltHead') this.emoteName = null;
    }
    this.tiltX = damp(this.tiltX, tx, 8, dt); this.tiltZ = damp(this.tiltZ, tz, 8, dt);

    const sq = this.squash + idleBreath;
    this.body.scale.set(1 - sq * 0.6, 1 + sq, 1 - sq * 0.6);
    this.body.position.y = this.hopHeight + extraY;
    this.body.rotation.set(this.tiltX, extraRot, this.tiltZ);

    // Eyes: blink + look
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinking = 0.16; this.blinkT = (sad ? 1.8 : 2.5) + Math.random() * 3.5; }
    let eyeY = 1;
    if (this.blinking > 0) { this.blinking -= dt; eyeY = Math.max(0.08, Math.abs(this.blinking / 0.16 - 0.5) * 2); }
    if (sad) eyeY *= 0.97;

    if (this.lookWorld) {
      // project world target into the cube's local space
      this.cube.updateWorldMatrix(true, false);
      this._m.copy(this.cube.matrixWorld).invert();
      this._v.copy(this.lookWorld).applyMatrix4(this._m);
      const len = Math.hypot(this._v.x, this._v.y, this._v.z) || 1;
      this.lookTarget.set(clamp(this._v.x / len * 1.6, -1, 1), clamp(this._v.y / len * 1.6, -1, 1));
      if (this._v.z < 0) this.lookTarget.multiplyScalar(0.3);
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 1 + Math.random() * 2.5;
        this.lookTarget.set((Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 0.6 + (sad ? -0.6 : 0));
        if (Math.random() < 0.4) this.lookTarget.set(0, sad ? -0.6 : 0);
      }
    }
    this.look.x = damp(this.look.x, this.lookTarget.x, 12, dt);
    this.look.y = damp(this.look.y, this.lookTarget.y, 12, dt);
    for (const e of this.eyes) {
      e.g.scale.y = eyeY;
      e.ir.position.x = e.base.x + this.look.x * e.max;
      e.ir.position.y = e.base.y + this.look.y * e.max;
      e.sh.position.x = e.ir.position.x * 0.9; e.sh.position.y = e.ir.position.y * 0.9;
      e.ir.scale.setScalar(this.pupilScale);
    }
  }

  setVisible(v) { this.root.visible = v; }
}
