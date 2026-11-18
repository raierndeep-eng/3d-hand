import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/utils.js';

/**
 * Orbit camera that follows GOB. Mouse/touch/gamepad look, scroll zoom, wall collision,
 * gentle auto-recentre while walking. Cutscenes can take over and hand control back smoothly.
 */
export class CameraController {
  constructor(game) {
    this.game = game;
    this.cam = game.engine.camera;
    this.yaw = 0; this.pitch = 0.32;
    this.distance = 7; this.curDist = 7;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.idleLook = 0;
    this.active = true;
    this.blend = 1; // 0..1 returning from cutscene
    this.blendFrom = new THREE.Vector3(); this.blendLook = new THREE.Vector3();
    this.shakeAmt = 0; this.shakeT = 0;
    this.heightOffset = 1.35;
    this.zoomMul = 1;
  }

  snap() {
    const p = this.game.player.body.pos;
    this.smoothTarget.set(p.x, p.y + this.heightOffset, p.z);
    this.curDist = this.distance * this.zoomMul;
    this.blend = 1;
    this.place(1);
  }

  setBehind(yaw, pitch = 0.3) { this.yaw = yaw + Math.PI; this.pitch = pitch; }

  /** Called when a cutscene ends: ease from the current camera to the orbit position. */
  resumeFrom() {
    this.blend = 0;
    this.blendFrom.copy(this.cam.position);
    const dir = new THREE.Vector3(); this.cam.getWorldDirection(dir);
    this.blendLook.copy(this.cam.position).addScaledVector(dir, 8);
    // pick a yaw that keeps the current view direction
    const p = this.game.player.body.pos;
    this.yaw = Math.atan2(this.cam.position.x - p.x, this.cam.position.z - p.z);
  }

  shake(a, t = 0.4) { this.shakeAmt = Math.max(this.shakeAmt, a); this.shakeT = Math.max(this.shakeT, t); }

  update(dt) {
    if (!this.active) return;
    const game = this.game, input = game.input, s = game.settings.data;
    if (game.player.controllable) {
      const d = input.lookDelta();
      const sens = 0.0028 * s.mouseSens;
      this.yaw -= d.x * sens;
      this.pitch += d.y * sens * (s.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, -0.35, 1.25);
      if (input.wheel) this.distance = clamp(this.distance + input.wheel * 0.8, 3.5, 14);
      if (Math.abs(d.x) + Math.abs(d.y) > 0.5) this.idleLook = 0; else this.idleLook += dt;
      // Auto-recentre gently behind GOB while walking and not looking around
      const mv = game.player.moveDir;
      if (this.idleLook > 1.6 && mv.lengthSq() > 0.2 && s.autoCamera) {
        this.yaw = dampAngle(this.yaw, game.player.yaw + Math.PI, 0.9, dt);
      }
    }
    this.place(dt);
  }

  place(dt) {
    const p = this.game.player.body.pos;
    this.target.set(p.x, p.y + this.heightOffset, p.z);
    this.smoothTarget.x = damp(this.smoothTarget.x, this.target.x, 14, dt);
    this.smoothTarget.z = damp(this.smoothTarget.z, this.target.z, 14, dt);
    this.smoothTarget.y = damp(this.smoothTarget.y, this.target.y, 7, dt);
    if (this.smoothTarget.distanceTo(this.target) > 12) this.smoothTarget.copy(this.target);

    const want = this.distance * this.zoomMul;
    const dir = new THREE.Vector3(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    const ideal = this.smoothTarget.clone().addScaledVector(dir, want);
    const frac = this.game.physics.segmentCast(this.smoothTarget, ideal, 0.25);
    const allowed = Math.max(1.2, want * frac - 0.2);
    this.curDist = allowed < this.curDist ? allowed : damp(this.curDist, allowed, 4, dt);
    const pos = this.smoothTarget.clone().addScaledVector(dir, this.curDist);

    if (this.blend < 1) {
      this.blend = Math.min(1, this.blend + dt / 1.1);
      const k = this.blend * this.blend * (3 - 2 * this.blend);
      pos.lerpVectors(this.blendFrom, pos, k);
      const look = this.blendLook.clone().lerp(this.smoothTarget, k);
      this.cam.position.copy(pos); this.cam.lookAt(look);
    } else {
      this.cam.position.copy(pos); this.cam.lookAt(this.smoothTarget);
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmt * (this.game.settings.data.screenShake ? 1 : 0.15);
      this.cam.position.x += (Math.random() - 0.5) * a; this.cam.position.y += (Math.random() - 0.5) * a;
      if (this.shakeT <= 0) this.shakeAmt = 0;
    }
  }
}
