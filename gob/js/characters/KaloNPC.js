import * as THREE from 'three';
import { Body } from '../core/Physics.js';
import { KaloModel } from './KaloModel.js';
import { damp, dampAngle, dist2 } from '../core/utils.js';

/**
 * Kalo's brain: follow GOB, walk to points, flee during tag, play scripted poses.
 * All movement goes through the same physics as the player so he jumps over things.
 */
export class KaloNPC {
  constructor(game, opts = {}) {
    this.game = game;
    this.model = new KaloModel(opts);
    this.body = new Body(0.42, 3.0, 0.32);
    this.body.stepHeight = 0.62;
    this.yaw = 0; this.targetYaw = 0;
    this.mode = 'idle';
    this.speed = 0;
    this.target = new THREE.Vector3();
    this.goal = null; this.goalResolve = null; this.stuckT = 0;
    this.followDist = 2.6;
    this.lookTarget = null;
    this.active = true;
    this.runSpeed = 7.2; this.walkSpeed = 4.2;
    this.fleeFrom = null; this.fleeSpeed = 6.2;
    this.jumpCooldown = 0;
    this.footT = 0;
    this.physics = true;
    this.chatter = null; this.chatT = 18; this.lastChat = -1;
  }

  get pos() { return this.body.pos; }
  get object() { return this.model.root; }

  addTo(scene) { scene.add(this.model.root); }
  removeFrom() { this.model.root.parent && this.model.root.parent.remove(this.model.root); this.model.disposePieces(); }

  teleport(x, y, z, yaw = this.yaw) {
    if (y === null || y === undefined) { const h = this.game.physics.heightAt(x, z, 200); y = isFinite(h) ? h : 0; }
    this.body.pos.set(x, y, z); this.body.vel.set(0, 0, 0); this.yaw = this.targetYaw = yaw;
    this.model.root.position.copy(this.body.pos); this.model.root.rotation.y = yaw;
  }

  follow() { this.mode = 'follow'; this.model.setPose(null); }
  idle() { this.mode = 'idle'; }
  flee() { this.mode = 'flee'; this.model.setPose(null); }
  pose(p) { this.model.setPose(p); }
  face(pos) { this.targetYaw = Math.atan2(pos.x - this.body.pos.x, pos.z - this.body.pos.z); }
  faceGob() { this.face(this.game.player.body.pos); }
  lookAt(v) { this.lookTarget = v; }

  /** Walk to (x,z). Resolves on arrival; teleports if hopelessly stuck. */
  goto(x, z, { run = false, tolerance = 0.6 } = {}) {
    if (this.goalResolve) this.goalResolve();
    this.mode = 'goto'; this.goal = new THREE.Vector3(x, 0, z); this.goalRun = run; this.goalTol = tolerance; this.stuckT = 0;
    this.model.setPose(null);
    return new Promise((res) => (this.goalResolve = res));
  }

  update(dt) {
    if (!this.active) return;
    const b = this.body, game = this.game;
    const gob = game.player.body.pos;
    let want = new THREE.Vector2(0, 0); let spd = 0;
    this.jumpCooldown -= dt;

    if (this.mode === 'follow') {
      const d = dist2(b.pos.x, b.pos.z, gob.x, gob.z);
      if (d > 30 || (b.pos.y < gob.y - 8)) {
        // Lost: hop in behind GOB, out of view
        const back = game.player.yaw + Math.PI;
        this.teleport(gob.x + Math.sin(back) * 3, gob.y + 0.2, gob.z + Math.cos(back) * 3);
      } else if (d > this.followDist) {
        want.set(gob.x - b.pos.x, gob.z - b.pos.z).normalize();
        spd = d > 7 ? this.runSpeed : this.walkSpeed * Math.min(1, (d - this.followDist) / 1.5 + 0.4);
      } else {
        this.face(gob);
      }
    } else if (this.mode === 'goto' && this.goal) {
      const d = dist2(b.pos.x, b.pos.z, this.goal.x, this.goal.z);
      if (d < this.goalTol) {
        this.mode = 'idle'; const r = this.goalResolve; this.goalResolve = null; this.goal = null; r && r();
      } else {
        want.set(this.goal.x - b.pos.x, this.goal.z - b.pos.z).normalize();
        spd = (this.goalRun ? this.runSpeed : this.walkSpeed) * Math.min(1, d / 1.2 + 0.3);
        this.stuckT += dt;
        if (this.stuckT > Math.max(5, d / 2 + 4)) { // give up gracefully
          this.teleport(this.goal.x, null, this.goal.z);
        }
      }
    } else if (this.mode === 'flee') {
      const d = dist2(b.pos.x, b.pos.z, gob.x, gob.z);
      const away = new THREE.Vector2(b.pos.x - gob.x, b.pos.z - gob.z).normalize();
      // steer toward the middle when near the edge of the play area
      const c = this.fleeCenter || { x: 0, z: 0, r: 30 };
      const fromC = new THREE.Vector2(b.pos.x - c.x, b.pos.z - c.z);
      const edge = fromC.length() / c.r;
      if (edge > 0.7) { away.addScaledVector(fromC.normalize().multiplyScalar(-1), (edge - 0.7) * 6).normalize(); }
      // gentle sideways weave so he's catchable
      const t = performance.now() * 0.001;
      away.rotateAround(new THREE.Vector2(), Math.sin(t * 1.3) * 0.6);
      if (d < 12) { want.copy(away); spd = this.fleeSpeed * (d < 5 ? 1 : 0.7); }
      else this.face(gob);
    }

    if (spd > 0) {
      this.targetYaw = Math.atan2(want.x, want.y);
      b.vel.x = damp(b.vel.x, want.x * spd, 10, dt); b.vel.z = damp(b.vel.z, want.y * spd, 10, dt);
    } else {
      b.vel.x = damp(b.vel.x, 0, 12, dt); b.vel.z = damp(b.vel.z, 0, 12, dt);
    }
    if (this.physics) {
      const before = b.pos.clone();
      game.physics.step(b, dt);
      // auto-jump when blocked
      if (spd > 0 && b.hitWall && b.onGround && this.jumpCooldown <= 0) { b.vel.y = 11.5; this.jumpCooldown = 0.6; }
      if (b.pos.y < game.physics.killY) this.teleport(gob.x, gob.y + 1, gob.z - 2);
      this.speed = Math.hypot(b.pos.x - before.x, b.pos.z - before.z) / Math.max(dt, 1e-4);
    } else this.speed = 0;
    if (b.onGround && this.speed > 1) {
      this.footT -= dt * this.speed;
      if (this.footT <= 0) { this.footT = 2.2; game.sfx.play('kaloStep', { pos: b.pos, vol: 0.35 }); }
    }

    // Idle chatter in the Roblox chat while following GOB around.
    if (this.chatter && this.mode === 'follow' && game.player.controllable && this.model.root.visible) {
      this.chatT -= dt;
      if (this.chatT <= 0) {
        let i = Math.floor(Math.random() * this.chatter.length);
        if (i === this.lastChat) i = (i + 1) % this.chatter.length;
        this.lastChat = i; this.chatT = 22 + Math.random() * 20;
        game.hud.chatMsg('Kalo: ' + this.chatter[i], 'kalo-chat');
      }
    }
    this.yaw = dampAngle(this.yaw, this.targetYaw, 10, dt);
    const m = this.model;
    m.root.position.copy(b.pos); m.root.rotation.y = this.yaw;
    // head turns toward point of interest
    const lt = this.lookTarget || (this.mode !== 'flee' && dist2(b.pos.x, b.pos.z, gob.x, gob.z) < 8 ? gob : null);
    if (lt) {
      const a = Math.atan2(lt.x - b.pos.x, lt.z - b.pos.z);
      let rel = a - this.yaw; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      m.targetHeadYaw = Math.max(-1, Math.min(1, rel));
    } else m.targetHeadYaw = 0;
    m.update(dt, { speed: this.speed, grounded: b.onGround, vy: b.vel.y });
  }

  /** Death. Pieces settle on the ground where he stood. */
  die(impulse) {
    this.active = true; this.mode = 'dead';
    this.physics = false;
    this.model.breakApart(this.game.world, this.body.pos.y, impulse);
    this.model.tag.position.set(0, 3.65, 0);
  }
}
