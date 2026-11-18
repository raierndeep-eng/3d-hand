import * as THREE from 'three';
import { Body } from '../core/Physics.js';
import { GobModel, GOB_SIZE } from '../characters/GobModel.js';
import { damp, dampAngle } from '../core/utils.js';

/**
 * Third-person controls for GOB. Camera-relative movement, coyote time, jump buffering,
 * variable jump height, safe-ground tracking for falls, and mood-dependent speed.
 */
export class PlayerController {
  constructor(game) {
    this.game = game;
    this.model = new GobModel();
    this.body = new Body(GOB_SIZE * 0.48, GOB_SIZE, GOB_SIZE * 0.48);
    this.yaw = 0;
    this.controllable = false;
    this.speedMul = 1;
    this.maxSpeed = 6.6;
    this.jumpVel = 11.2;
    this.coyote = 0; this.jumpBuffer = 0;
    this.lastSafe = new THREE.Vector3(); this.safeT = 0;
    this.respawnPoint = null;
    this.hopSoundPhase = 0;
    this.carry = null; // object floating next to GOB (Kalo's name tag later)
    this.falling = false;
    this.moveDir = new THREE.Vector2();
  }

  addTo(scene) { scene.add(this.model.root); }

  setPosition(x, y, z, yaw = this.yaw) {
    if (y === null || y === undefined) { const h = this.game.physics.heightAt(x, z, 200); y = isFinite(h) ? h : 0; }
    this.body.pos.set(x, y, z); this.body.vel.set(0, 0, 0); this.yaw = yaw;
    this.lastSafe.copy(this.body.pos);
    this.model.root.position.copy(this.body.pos); this.model.root.rotation.y = yaw;
  }

  faceTowards(p) { this.yaw = Math.atan2(p.x - this.body.pos.x, p.z - this.body.pos.z); this.model.root.rotation.y = this.yaw; }

  update(dt) {
    const game = this.game, input = game.input, b = this.body;
    let mx = 0, mz = 0;
    if (this.controllable) {
      const ax = input.moveAxes();
      // camera-relative
      const cy = game.cameraCtl.yaw;
      const fx = -Math.sin(cy), fz = -Math.cos(cy); // forward (away from camera)
      const rx = Math.cos(cy), rz = -Math.sin(cy);
      mx = fx * -ax.y + rx * ax.x; mz = fz * -ax.y + rz * ax.x;
      const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
    }
    this.moveDir.set(mx, mz);
    const sad = this.model.mood === 'sad' || this.model.mood === 'grief';
    const max = this.maxSpeed * this.speedMul * (sad ? 0.78 : 1);
    const accel = b.onGround ? 14 : 6;
    b.vel.x = damp(b.vel.x, mx * max, accel, dt);
    b.vel.z = damp(b.vel.z, mz * max, accel, dt);
    if (Math.hypot(mx, mz) > 0.1) this.yaw = dampAngle(this.yaw, Math.atan2(mx, mz), 12, dt);

    // Jumping
    this.coyote = b.onGround ? 0.12 : this.coyote - dt;
    this.jumpBuffer -= dt;
    if (this.controllable && input.jumpPressed()) this.jumpBuffer = 0.14;
    if (this.jumpBuffer > 0 && this.coyote > 0) {
      b.vel.y = this.jumpVel * (sad ? 0.92 : 1); this.coyote = 0; this.jumpBuffer = 0; b.onGround = false;
      this.model.impulseSquash(2.2);
      game.sfx.play('jump');
    }
    if (!input.jumpHeld() && b.vel.y > 4 && !b.bounced) b.vel.y -= 40 * dt; // short hop if released

    const prevY = b.pos.y;
    game.physics.step(b, dt);
    if (b.bounced) { game.sfx.play('boing'); this.model.impulseSquash(3); }
    if (b.justLanded && b.landedSpeed > 4) { game.sfx.play('land', { vol: Math.min(1, b.landedSpeed / 18) }); game.fx.dust(b.pos); }

    // Safe ground tracking
    if (b.onGround && b.ground && !b.ground.moving && b.ground.tag !== 'unsafe') {
      this.safeT += dt;
      if (this.safeT > 0.3) { this.lastSafe.copy(b.pos); this.safeT = 0; }
    }
    if (b.pos.y < game.physics.killY && !this.falling) this.fellOff();

    // Hop sounds synced to model hop cycle
    const speed = Math.hypot(b.vel.x, b.vel.z);
    if (b.onGround && speed > 0.6) {
      const ph = Math.floor(this.model.hopPhase / Math.PI);
      if (ph !== this.hopSoundPhase) { this.hopSoundPhase = ph; game.sfx.play('hop', { vol: 0.5 }); }
    }

    this.model.root.position.copy(b.pos);
    this.model.root.rotation.y = this.yaw;
    this.model.update(dt, { speed, grounded: b.onGround, vy: b.vel.y, landed: b.justLanded ? b.landedSpeed : 0 });

    if (this.carry) {
      const t = performance.now() * 0.001;
      const side = this.yaw + Math.PI * 0.75;
      const tx = b.pos.x + Math.sin(side) * 0.9, tz = b.pos.z + Math.cos(side) * 0.9, ty = b.pos.y + 2.0 + Math.sin(t * 1.5) * 0.12;
      this.carry.position.x = damp(this.carry.position.x, tx, 4, dt);
      this.carry.position.y = damp(this.carry.position.y, ty, 4, dt);
      this.carry.position.z = damp(this.carry.position.z, tz, 4, dt);
    }
  }

  async fellOff() {
    this.falling = true;
    const game = this.game;
    game.sfx.play('fall');
    await game.fade(true, 0.35, true);
    const p = this.respawnPoint || this.lastSafe;
    this.setPosition(p.x, p.y + 0.05, p.z, this.yaw);
    game.cameraCtl.snap();
    await game.fade(false, 0.35, true);
    this.falling = false;
  }
}
