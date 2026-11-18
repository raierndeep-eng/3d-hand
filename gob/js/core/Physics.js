import * as THREE from 'three';

/**
 * Lightweight kinematic physics: axis-aligned boxes for the world, capsule-ish AABB bodies
 * for characters. Supports step-up, moving platforms, bounce pads, triggers and segment casts
 * (used by the camera so it never clips through walls).
 */
export class Collider {
  constructor(min, max, opts = {}) {
    this.min = min; this.max = max;
    this.enabled = true;
    this.tag = opts.tag || null;
    this.bounce = opts.bounce || 0;       // upward launch velocity on landing
    this.moving = !!opts.moving;
    this.delta = new THREE.Vector3();
    this.oneWay = !!opts.oneWay;         // only solid from above
    this.noCamera = !!opts.noCamera;
    this.object = opts.object || null;
  }
  setCenter(x, y, z) {
    const hx = (this.max.x - this.min.x) / 2, hy = (this.max.y - this.min.y) / 2, hz = (this.max.z - this.min.z) / 2;
    const ox = (this.min.x + this.max.x) / 2, oy = (this.min.y + this.max.y) / 2, oz = (this.min.z + this.max.z) / 2;
    this.delta.set(x - ox, y - oy, z - oz);
    this.min.set(x - hx, y - hy, z - hz); this.max.set(x + hx, y + hy, z + hz);
  }
}

export class Body {
  constructor(hw = 0.5, h = 1, hd = hw) {
    this.pos = new THREE.Vector3();   // bottom-center
    this.vel = new THREE.Vector3();
    this.hw = hw; this.hd = hd; this.h = h;
    this.onGround = false; this.ground = null;
    this.gravity = 28;
    this.stepHeight = 0.42;
    this.hitWall = false;
    this.landedSpeed = 0; this.justLanded = false; this.bounced = false;
    this.enabled = true;
  }
}

const EPS = 1e-4;

export class Physics {
  constructor() {
    this.colliders = [];
    this.triggers = [];
    this.killY = -40;
  }
  clear() { this.colliders.length = 0; this.triggers.length = 0; }

  addBox(cx, cy, cz, sx, sy, sz, opts) {
    const c = new Collider(new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2), new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2), opts);
    this.colliders.push(c);
    return c;
  }
  addMinMax(x0, y0, z0, x1, y1, z1, opts) {
    const c = new Collider(new THREE.Vector3(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), new THREE.Vector3(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)), opts);
    this.colliders.push(c);
    return c;
  }
  addFromObject(obj, opts) {
    obj.updateWorldMatrix(true, true);
    const b = new THREE.Box3().setFromObject(obj);
    const c = new Collider(b.min.clone(), b.max.clone(), { ...opts, object: obj });
    this.colliders.push(c);
    return c;
  }
  remove(c) { const i = this.colliders.indexOf(c); if (i >= 0) this.colliders.splice(i, 1); }

  /** Trigger volumes fire enter/exit callbacks for one body (the player). */
  addTrigger(x, y, z, sx, sy, sz, onEnter, onExit) {
    const t = { min: new THREE.Vector3(x - sx / 2, y - sy / 2, z - sz / 2), max: new THREE.Vector3(x + sx / 2, y + sy / 2, z + sz / 2), onEnter, onExit, inside: false, enabled: true };
    this.triggers.push(t);
    return t;
  }

  overlaps(body, c, px, py, pz) {
    return px + body.hw > c.min.x + EPS && px - body.hw < c.max.x - EPS &&
      pz + body.hd > c.min.z + EPS && pz - body.hd < c.max.z - EPS &&
      py + body.h > c.min.y + EPS && py < c.max.y - EPS;
  }

  step(body, dt) {
    if (!body.enabled) return;
    body.justLanded = false; body.bounced = false; body.hitWall = false;
    // Ride moving platforms.
    if (body.onGround && body.ground && body.ground.moving) {
      body.pos.x += body.ground.delta.x; body.pos.z += body.ground.delta.z;
      if (body.ground.delta.y > 0) body.pos.y += body.ground.delta.y;
    }
    body.vel.y -= body.gravity * dt;
    if (body.vel.y < -40) body.vel.y = -40;

    const maxMove = Math.max(Math.abs(body.vel.x), Math.abs(body.vel.y), Math.abs(body.vel.z)) * dt;
    const steps = Math.min(8, Math.max(1, Math.ceil(maxMove / 0.25)));
    const sdt = dt / steps;
    const wasGround = body.onGround;
    const prevVy = body.vel.y;
    body.onGround = false;
    for (let i = 0; i < steps; i++) {
      this.moveAxis(body, 'x', body.vel.x * sdt);
      this.moveAxis(body, 'z', body.vel.z * sdt);
      this.moveAxis(body, 'y', body.vel.y * sdt);
    }
    // Snap down small ledges while walking so we don't "float" off stairs.
    if (!body.onGround && wasGround && body.vel.y <= 0) {
      const gy = this.groundBelow(body, body.pos.y + 0.05, body.stepHeight);
      if (gy !== null) { body.pos.y = gy.y; body.onGround = true; body.ground = gy.c; body.vel.y = 0; }
    }
    if (body.onGround && !wasGround) { body.justLanded = true; body.landedSpeed = -prevVy; }
    if (body.onGround && body.ground && body.ground.bounce > 0) {
      body.vel.y = body.ground.bounce; body.onGround = false; body.bounced = true;
    }
  }

  groundBelow(body, fromY, maxDrop) {
    let best = null;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (body.pos.x + body.hw <= c.min.x || body.pos.x - body.hw >= c.max.x || body.pos.z + body.hd <= c.min.z || body.pos.z - body.hd >= c.max.z) continue;
      const top = c.max.y;
      if (top <= fromY + EPS && top >= fromY - maxDrop) { if (!best || top > best.y) best = { y: top, c }; }
    }
    return best;
  }

  moveAxis(body, axis, amount) {
    if (amount === 0 && axis !== 'y') return;
    const p = body.pos;
    p[axis] += amount;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (!this.overlaps(body, c, p.x, p.y, p.z)) continue;
      if (c.oneWay) {
        // Only collide when coming from above.
        if (axis === 'y' && amount <= 0 && p.y - amount >= c.max.y - 0.05) {
          p.y = c.max.y; body.vel.y = 0; body.onGround = true; body.ground = c;
        }
        continue;
      }
      if (axis === 'y') {
        if (amount <= 0) { p.y = c.max.y; body.vel.y = 0; body.onGround = true; body.ground = c; }
        else { p.y = c.min.y - body.h - EPS; if (body.vel.y > 0) body.vel.y = 0; }
      } else {
        const rise = c.max.y - p.y;
        if (rise > 0 && rise <= body.stepHeight && this.canStandAt(body, p.x, c.max.y, p.z)) {
          p.y = c.max.y; // step up
          continue;
        }
        const half = axis === 'x' ? body.hw : body.hd;
        if (amount > 0) p[axis] = c.min[axis] - half - EPS;
        else if (amount < 0) p[axis] = c.max[axis] + half + EPS;
        else {
          // Pushed by moving collider: resolve along least penetration
          const a = p[axis] + half - c.min[axis], b = c.max[axis] - (p[axis] - half);
          p[axis] += a < b ? -a : b;
        }
        body.hitWall = true;
      }
    }
  }

  canStandAt(body, x, y, z) {
    for (const c of this.colliders) {
      if (!c.enabled || c.oneWay) continue;
      if (this.overlaps(body, c, x, y + EPS * 2, z)) return false;
    }
    return true;
  }

  /** Highest surface below a point (for NPC placement / shadows). */
  heightAt(x, z, fromY = 200) {
    let best = -Infinity;
    for (const c of this.colliders) {
      if (!c.enabled) continue;
      if (x < c.min.x || x > c.max.x || z < c.min.z || z > c.max.z) continue;
      if (c.max.y <= fromY && c.max.y > best) best = c.max.y;
    }
    return best;
  }

  /** Returns fraction [0..1] along segment a->b of first box hit (camera collision). */
  segmentCast(a, b, pad = 0.2) {
    let tMin = 1;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    for (const c of this.colliders) {
      if (!c.enabled || c.noCamera || c.oneWay) continue;
      let t0 = 0, t1 = 1, ok = true;
      for (const [o, d, mn, mx] of [[a.x, dx, c.min.x - pad, c.max.x + pad], [a.y, dy, c.min.y - pad, c.max.y + pad], [a.z, dz, c.min.z - pad, c.max.z + pad]]) {
        if (Math.abs(d) < 1e-8) { if (o < mn || o > mx) { ok = false; break; } }
        else {
          let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) [ta, tb] = [tb, ta];
          if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
        }
      }
      if (ok && t0 > 0 && t0 < tMin) tMin = t0;
    }
    return tMin;
  }

  updateTriggers(body) {
    for (const t of this.triggers) {
      if (!t.enabled) continue;
      const p = body.pos;
      const inside = p.x > t.min.x && p.x < t.max.x && p.z > t.min.z && p.z < t.max.z && p.y + body.h > t.min.y && p.y < t.max.y;
      if (inside && !t.inside) { t.inside = true; t.onEnter && t.onEnter(); }
      else if (!inside && t.inside) { t.inside = false; t.onExit && t.onExit(); }
    }
  }

  /** Call once per frame before stepping bodies; resets platform deltas after use. */
  endFrame() { for (const c of this.colliders) if (c.moving) c.delta.set(0, 0, 0); }
}
