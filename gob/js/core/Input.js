/**
 * Keyboard, mouse (pointer lock or drag), touch (virtual joystick) and gamepad input.
 * Game code asks for abstract actions: move axes, look delta, jump, use, pause, confirm.
 */
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.look = { x: 0, y: 0 };
    this.dragging = false;
    this.pointerLocked = false;
    this.wantLock = false; // only lock during free gameplay
    this.touchMove = { x: 0, y: 0 };
    this.touchJump = false; this.touchJumpPressed = false;
    this.touchUsePressed = false; this.touchPausePressed = false;
    this.clickPressed = false;
    this.wheel = 0;
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.onPointerLockLost = null;
    this.gpPrev = {};

    addEventListener('keydown', (e) => {
      if (e.repeat) { return; }
      this.keys.add(e.code); this.pressedKeys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); });

    canvas.addEventListener('mousedown', (e) => {
      if (this.wantLock && !this.pointerLocked && !this.isTouch) {
        canvas.requestPointerLock?.()?.catch?.(() => {});
      }
      this.dragging = true; this.clickPressed = true;
    });
    addEventListener('mouseup', () => (this.dragging = false));
    addEventListener('mousemove', (e) => {
      if (this.pointerLocked || (this.dragging && !this.isTouch)) {
        this.look.x += e.movementX || 0; this.look.y += e.movementY || 0;
      }
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      const was = this.pointerLocked;
      this.pointerLocked = document.pointerLockElement === canvas;
      if (was && !this.pointerLocked && !this.intentionalExit && this.onPointerLockLost) this.onPointerLockLost();
      this.intentionalExit = false;
    });

    this.setupTouch();
  }

  setupTouch() {
    const joy = document.getElementById('joy'), knob = document.getElementById('joy-knob');
    let joyId = null, cx = 0, cy = 0;
    const R = 50;
    joy.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; joyId = t.identifier;
      const r = joy.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2;
      e.preventDefault();
    }, { passive: false });
    const moveJoy = (e) => {
      for (const t of e.changedTouches) if (t.identifier === joyId) {
        let dx = t.clientX - cx, dy = t.clientY - cy; const l = Math.hypot(dx, dy);
        if (l > R) { dx *= R / l; dy *= R / l; }
        knob.style.transform = `translate(${dx}px,${dy}px)`;
        this.touchMove.x = dx / R; this.touchMove.y = dy / R;
      }
    };
    const endJoy = (e) => {
      for (const t of e.changedTouches) if (t.identifier === joyId) {
        joyId = null; knob.style.transform = ''; this.touchMove.x = 0; this.touchMove.y = 0;
      }
    };
    addEventListener('touchmove', moveJoy, { passive: true });
    addEventListener('touchend', endJoy); addEventListener('touchcancel', endJoy);

    // Camera drag on the canvas.
    let lookId = null, lx = 0, ly = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      const t = e.changedTouches[0]; lookId = t.identifier; lx = t.clientX; ly = t.clientY; this.clickPressed = true;
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) if (t.identifier === lookId) {
        this.look.x += (t.clientX - lx) * 1.6; this.look.y += (t.clientY - ly) * 1.6; lx = t.clientX; ly = t.clientY;
      }
    }, { passive: true });
    this.canvas.addEventListener('touchend', (e) => { for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null; });

    const btn = (id, down, up) => {
      const el = document.getElementById(id);
      el.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); up && up(); }, { passive: false });
      el.addEventListener('mousedown', (e) => { e.preventDefault(); down(); });
      el.addEventListener('mouseup', () => up && up());
    };
    btn('t-jump', () => { this.touchJump = true; this.touchJumpPressed = true; }, () => (this.touchJump = false));
    btn('t-use', () => (this.touchUsePressed = true));
    btn('t-pause', () => (this.touchPausePressed = true));
  }

  setTouchVisible(v) { document.getElementById('touch').classList.toggle('hidden', !(v && this.isTouch)); }

  setGameplayLock(on) {
    this.wantLock = on;
    if (!on && this.pointerLocked) { this.intentionalExit = true; document.exitPointerLock?.(); }
  }

  pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && [...pads].find((p) => p);
    this.gp = null;
    if (!gp) return;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    const b = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const st = { a: b(0), x: b(2), start: b(9), b: b(1) };
    this.gp = {
      mx: dz(gp.axes[0] || 0), my: dz(gp.axes[1] || 0),
      lx: dz(gp.axes[2] || 0), ly: dz(gp.axes[3] || 0),
      a: st.a, aP: st.a && !this.gpPrev.a, xP: st.x && !this.gpPrev.x, startP: st.start && !this.gpPrev.start, bP: st.b && !this.gpPrev.b,
    };
    this.gpPrev = st;
  }

  down(code) { return this.keys.has(code); }
  pressed(code) { return this.pressedKeys.has(code); }

  moveAxes() {
    let x = 0, y = 0;
    if (this.down('KeyW') || this.down('ArrowUp') || this.down('KeyZ')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (this.down('KeyA') || this.down('ArrowLeft') || this.down('KeyQ')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    x += this.touchMove.x; y += this.touchMove.y;
    if (this.gp) { x += this.gp.mx; y += this.gp.my; }
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    return { x, y };
  }

  lookDelta() {
    const d = { x: this.look.x, y: this.look.y };
    if (this.gp) { d.x += this.gp.lx * 14; d.y += this.gp.ly * 10; }
    return d;
  }

  jumpHeld() { return this.down('Space') || this.touchJump || (this.gp && this.gp.a); }
  jumpPressed() { return this.pressed('Space') || this.touchJumpPressed || (this.gp && this.gp.aP); }
  usePressed() { return this.pressed('KeyE') || this.pressed('KeyF') || this.touchUsePressed || (this.gp && this.gp.xP); }
  confirmPressed() {
    return this.pressed('Space') || this.pressed('Enter') || this.pressed('KeyE') || this.clickPressed || this.touchJumpPressed || this.touchUsePressed || (this.gp && (this.gp.aP || this.gp.xP));
  }
  pausePressed() { return this.pressed('Escape') || this.pressed('KeyP') || this.touchPausePressed || (this.gp && this.gp.startP); }

  /** Call at the very end of each frame. */
  endFrame() {
    this.pressedKeys.clear();
    this.look.x = 0; this.look.y = 0; this.wheel = 0;
    this.touchJumpPressed = false; this.touchUsePressed = false; this.touchPausePressed = false;
    this.clickPressed = false;
  }
}
