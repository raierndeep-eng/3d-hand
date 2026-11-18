import * as THREE from 'three';
import * as T from '../render/Textures.js';
import { damp } from '../core/utils.js';

/**
 * Kalo: a completely yellow, classic blocky (R6-style) character with an overhead name tag.
 * Variants: 'normal', 'ghost' (memory echo), 'copy' (the version GOB builds later).
 */
const YELLOW = 0xf5cd30;
export const KALO_HEIGHT = 3.06;

export class KaloModel {
  constructor({ variant = 'normal', name = 'Kalo' } = {}) {
    this.variant = variant;
    this.root = new THREE.Group();
    const isGhost = variant === 'ghost', isCopy = variant === 'copy';
    const color = isCopy ? 0xe0bd3a : YELLOW;
    this.mat = new THREE.MeshStandardMaterial({
      color, roughness: isCopy ? 0.95 : 0.55, metalness: 0,
      transparent: isGhost, opacity: isGhost ? 0.38 : 1, emissive: isGhost ? 0x6b5410 : 0x000000, depthWrite: !isGhost,
    });
    const box = (w, h, d, mat = this.mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = !isGhost; m.receiveShadow = !isGhost; return m; };

    this.parts = {};
    // Legs (pivot at hip)
    const legL = new THREE.Group(); legL.position.set(-0.3, 1.2, 0);
    const legR = new THREE.Group(); legR.position.set(0.3, 1.2, 0);
    const lm = box(0.59, 1.2, 0.59); lm.position.y = -0.6; legL.add(lm);
    const rm = box(0.59, isCopy ? 1.14 : 1.2, 0.59); rm.position.y = isCopy ? -0.57 : -0.6; legR.add(rm);
    // Torso
    const torso = box(1.2, 1.2, 0.6); torso.position.y = 1.8;
    // Arms (pivot at shoulder)
    const armL = new THREE.Group(); armL.position.set(-0.9, 2.3, 0);
    const armR = new THREE.Group(); armR.position.set(0.9, 2.3, 0);
    const am = box(0.59, isCopy ? 1.3 : 1.2, 0.59); am.position.y = isCopy ? -0.55 : -0.5; armL.add(am);
    const bm = box(0.59, 1.2, 0.59); bm.position.y = -0.5; armR.add(bm);
    // Head
    const head = new THREE.Group(); head.position.y = 2.42;
    let hm;
    if (isCopy) { hm = box(0.74, 0.66, 0.74); hm.rotation.z = 0.05; }
    else {
      hm = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.62, 24), this.mat); hm.castShadow = !isGhost;
      const capG = new THREE.SphereGeometry(0.37, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      const capT = new THREE.Mesh(capG, this.mat); capT.scale.y = 0.18; capT.position.y = 0.31; hm.add(capT);
      const capB = new THREE.Mesh(capG, this.mat); capB.scale.y = -0.18; capB.position.y = -0.31; hm.add(capB);
    }
    hm.position.y = 0.36; head.add(hm);
    const faceMat = new THREE.MeshBasicMaterial({ map: isCopy ? T.copyFace() : T.smileFace(), transparent: true, depthWrite: false, opacity: isGhost ? 0.5 : 1 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), faceMat);
    face.position.set(0, 0.36, isCopy ? 0.375 : 0.372); head.add(face);
    // neck stub so the head doesn't float
    const neck = box(0.4, 0.06, 0.4); neck.position.y = 0.02; head.add(neck);

    this.root.add(legL, legR, torso, armL, armR, head);
    this.parts = { legL, legR, torso, armL, armR, head };
    this.faceMat = faceMat;

    // Overhead Roblox-style name
    this.tagMat = new THREE.SpriteMaterial({ map: T.overheadName(name), transparent: true, depthWrite: false, opacity: isGhost ? 0.6 : 1 });
    this.tag = new THREE.Sprite(this.tagMat);
    this.tag.scale.set(2.2, 0.55, 1); this.tag.position.y = 3.65; this.tag.renderOrder = 5;
    this.root.add(this.tag);

    this.time = Math.random() * 10;
    this.walkPhase = 0; this.walkAmt = 0;
    this.pose = null; this.poseT = 0;
    this.headYaw = 0; this.targetHeadYaw = 0;
    this.sitAmt = 0;
    this.broken = false; this.pieces = [];
  }

  setName(name, color) { this.tagMat.map = T.overheadName(name, color); this.tagMat.needsUpdate = true; }
  setPose(p) { if (p !== this.pose) { this.pose = p; this.poseT = 0; } }

  update(dt, { speed = 0, grounded = true, vy = 0 } = {}) {
    this.time += dt; this.poseT += dt;
    if (this.broken) { this.updatePieces(dt); return; }
    const { legL, legR, armL, armR, head, torso } = this.parts;
    const moving = grounded && speed > 0.3;
    this.walkAmt = damp(this.walkAmt, moving ? Math.min(1, speed / 5) : 0, 10, dt);
    this.walkPhase += dt * (5 + speed * 1.4) * (moving ? 1 : 0.3);
    const sw = Math.sin(this.walkPhase) * 0.9 * this.walkAmt;
    let la = sw, ra = -sw, ll = -sw, rl = sw, laz = 0, raz = 0;
    let sit = 0;
    const idle = Math.sin(this.time * 1.8) * 0.04;
    la += idle; ra -= idle;
    if (!grounded) { la = -Math.PI * 0.95; ra = -Math.PI * 0.95; ll = 0.25; rl = -0.25; }
    const t = this.poseT;
    switch (this.pose) {
      case 'wave': ra = -Math.PI * 0.85; raz = Math.sin(t * 9) * 0.45 + 0.2; break;
      case 'cheer': la = ra = -Math.PI * 0.9 + Math.sin(t * 10) * 0.2; laz = -0.3; raz = 0.3; break;
      case 'point': ra = -Math.PI / 2; break;
      case 'shrug': la = ra = -0.4; laz = -0.6; raz = 0.6; break;
      case 'hug': la = ra = -Math.PI / 2.2; laz = 0.25; raz = -0.25; break;
      case 'sit': sit = 1; la = ra = -0.5; ll = rl = -Math.PI / 2; break;
      case 'sitHug': sit = 1; la = ra = -1.0; laz = 0.4; raz = -0.4; ll = rl = -Math.PI / 2 + 0.6; break;
      case 'sad': la = ra = 0.05; break;
      case 'think': ra = -2.2; raz = 0.6; break;
      case 'reach': ra = -Math.PI / 2 - 0.2; la = -Math.PI / 2 - 0.4; break;
      case 'push': la = ra = -Math.PI / 2; laz = 0.1; raz = -0.1; break;
      case 'stiff': la = ra = ll = rl = 0; break;
      case 'tpose': laz = -Math.PI / 2; raz = Math.PI / 2; la = ra = 0; break;
      case 'lie': break;
    }
    const k = 18;
    legL.rotation.x = damp(legL.rotation.x, ll, k, dt); legR.rotation.x = damp(legR.rotation.x, rl, k, dt);
    armL.rotation.x = damp(armL.rotation.x, la, k, dt); armR.rotation.x = damp(armR.rotation.x, ra, k, dt);
    armL.rotation.z = damp(armL.rotation.z, laz, k, dt); armR.rotation.z = damp(armR.rotation.z, raz, k, dt);
    this.sitAmt = damp(this.sitAmt, sit, 10, dt);
    const lowY = -0.6 * this.sitAmt;
    for (const p of [legL, legR]) p.position.y = 1.2 + lowY;
    torso.position.y = 1.8 + lowY; armL.position.y = armR.position.y = 2.3 + lowY; head.position.y = 2.42 + lowY;
    this.tag.position.y = 3.65 + lowY;
    this.headYaw = damp(this.headYaw, this.targetHeadYaw, 6, dt);
    head.rotation.y = this.headYaw;
    head.rotation.x = this.pose === 'sad' ? 0.35 : this.pose === 'lookUp' ? -0.4 : 0;
    if (this.pose === 'lie') { this.root.rotation.x = damp(this.root.rotation.x, -Math.PI / 2, 6, dt); }
  }

  /** Classic blocky break-apart. Pieces fly and settle on floorY. */
  breakApart(scene, floorY, impulse = new THREE.Vector3()) {
    if (this.broken) return;
    this.broken = true;
    this.root.updateWorldMatrix(true, true);
    for (const key of ['head', 'torso', 'armL', 'armR', 'legL', 'legR']) {
      const obj = this.parts[key];
      scene.attach(obj);
      const r = () => (Math.random() - 0.5);
      this.pieces.push({
        key, obj, vel: new THREE.Vector3(r() * 5 + impulse.x, 3 + Math.random() * 3 + impulse.y, r() * 5 + impulse.z),
        ang: new THREE.Vector3(r() * 9, r() * 9, r() * 9), floorY, rest: false,
      });
    }
    this.root.visible = true;
  }

  updatePieces(dt) {
    for (const p of this.pieces) {
      if (p.rest) continue;
      p.vel.y -= 22 * dt;
      p.obj.position.addScaledVector(p.vel, dt);
      p.obj.rotation.x += p.ang.x * dt; p.obj.rotation.y += p.ang.y * dt; p.obj.rotation.z += p.ang.z * dt;
      const minY = p.floorY + 0.3;
      if (p.obj.position.y < minY) {
        p.obj.position.y = minY;
        if (Math.abs(p.vel.y) < 1.5) {
          p.rest = true;
          // lie flat: snap rotation to nearest quarter turns, keep yaw
          p.obj.rotation.x = Math.round(p.obj.rotation.x / (Math.PI / 2)) * (Math.PI / 2);
          p.obj.rotation.z = Math.round(p.obj.rotation.z / (Math.PI / 2)) * (Math.PI / 2);
        } else { p.vel.y *= -0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; p.ang.multiplyScalar(0.5); }
      }
    }
  }

  /** Put pieces back (used when re-creating Kalo from a save or for the menu). */
  disposePieces() { for (const p of this.pieces) p.obj.parent && p.obj.parent.remove(p.obj); this.pieces = []; }
}
