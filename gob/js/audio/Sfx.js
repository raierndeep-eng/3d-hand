/**
 * Synthesized sound effects and ambience beds (wind, rain, fluorescent hum, birds, crickets,
 * radio static). Positional sounds pan and fade with distance from the camera.
 */
export class Sfx {
  constructor(audio, game) {
    this.a = audio; this.game = game;
    this.amb = {}; this.ambTarget = { wind: 0, rain: 0, hum: 0, birds: 0, crickets: 0, static: 0, waves: 0 };
    this.birdT = 1; this.cricketT = 0.5;
    this.last = {};
  }

  start() {
    const a = this.a; if (!a.ctx || this.started) return;
    this.started = true;
    const ctx = a.ctx;
    const loopNoise = (type, freq, q) => {
      const s = ctx.createBufferSource(); s.buffer = a.noise; s.loop = true;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(f).connect(g).connect(a.ambBus); s.start();
      return { g, f, s };
    };
    this.amb.wind = loopNoise('bandpass', 420, 0.8);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 220; lfo.connect(lg).connect(this.amb.wind.f.frequency); lfo.start();
    this.amb.rain = loopNoise('highpass', 2500, 0.3);
    this.amb.waves = loopNoise('lowpass', 500, 0.5);
    const wl = ctx.createOscillator(); wl.frequency.value = 0.09; const wg = ctx.createGain(); wg.gain.value = 0; wl.connect(wg); wl.start(); this.wavesLfo = wg;
    this.amb.static = loopNoise('bandpass', 2200, 0.4);
    // fluorescent hum
    const hg = ctx.createGain(); hg.gain.value = 0; hg.connect(a.ambBus);
    for (const [f, v] of [[60, 0.5], [120, 0.35], [180, 0.12], [240, 0.08]]) { const o = ctx.createOscillator(); o.type = f === 120 ? 'sawtooth' : 'sine'; o.frequency.value = f; const og = ctx.createGain(); og.gain.value = v * 0.3; o.connect(og).connect(hg); o.start(); }
    this.amb.hum = { g: hg };
  }

  setAmbience(o) { Object.assign(this.ambTarget, { wind: 0, rain: 0, hum: 0, birds: 0, crickets: 0, static: 0, waves: 0 }, o); }

  update(dt) {
    const a = this.a; if (!a.ctx || !this.started) return;
    const t = a.ctx.currentTime;
    const lvl = { wind: 0.35, rain: 0.22, hum: 0.25, static: 0.06, waves: 0.3 };
    for (const k of Object.keys(lvl)) if (this.amb[k]) this.amb[k].g.gain.setTargetAtTime(this.ambTarget[k] * lvl[k], t, 0.8);
    if (this.ambTarget.birds > 0) { this.birdT -= dt; if (this.birdT <= 0) { this.birdT = 0.6 + Math.random() * 3 / this.ambTarget.birds; this.bird(); } }
    if (this.ambTarget.crickets > 0) { this.cricketT -= dt; if (this.cricketT <= 0) { this.cricketT = 0.4 + Math.random() * 0.9; this.cricket(); } }
  }

  bird() {
    const a = this.a, ctx = a.ctx, t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4), base = 2200 + Math.random() * 1800, pan = Math.random() * 1.6 - 0.8;
    const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(a.ambBus);
    for (let i = 0; i < n; i++) {
      const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain();
      const st = t + i * (0.09 + Math.random() * 0.05);
      o.frequency.setValueAtTime(base, st); o.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.4), st + 0.06);
      g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.03 * this.ambTarget.birds, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, st + 0.08);
      o.connect(g).connect(p); o.start(st); o.stop(st + 0.1);
    }
  }
  cricket() {
    const a = this.a, ctx = a.ctx, t = ctx.currentTime;
    const p = ctx.createStereoPanner(); p.pan.value = Math.random() * 2 - 1; p.connect(a.ambBus);
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 4400; const g = ctx.createGain();
      const st = t + i * 0.05; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.006 * this.ambTarget.crickets, st + 0.005); g.gain.linearRampToValueAtTime(0, st + 0.03);
      o.connect(g).connect(p); o.start(st); o.stop(st + 0.04);
    }
  }

  /** Play a named one-shot. opts: vol, pos (THREE.Vector3), pitch */
  play(name, opts = {}) {
    const a = this.a; if (!a.ctx || a.ctx.state !== 'running') return;
    const ctx = a.ctx, t = ctx.currentTime;
    // rate-limit spammy sounds
    const now = performance.now(); if (this.last[name] && now - this.last[name] < 30) return; this.last[name] = now;
    let vol = opts.vol ?? 1, pan = 0;
    if (opts.pos && this.game.engine) {
      const cam = this.game.engine.camera;
      const dx = opts.pos.x - cam.position.x, dz = opts.pos.z - cam.position.z, dy = opts.pos.y - cam.position.y;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      vol *= Math.max(0, 1 - d / 40);
      if (vol <= 0.01) return;
      const yaw = Math.atan2(-cam.matrixWorld.elements[8], -cam.matrixWorld.elements[10]);
      const ang = Math.atan2(dx, dz) - yaw; pan = Math.max(-0.8, Math.min(0.8, -Math.sin(ang)));
    }
    const out = ctx.createGain(); out.gain.value = vol;
    const pn = ctx.createStereoPanner(); pn.pan.value = pan; out.connect(pn).connect(a.sfxBus);
    const P = opts.pitch || 1;
    const osc = (type, f0, f1, dur, v = 0.3, start = 0) => {
      const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain();
      o.frequency.setValueAtTime(f0 * P, t + start); if (f1) o.frequency.exponentialRampToValueAtTime(f1 * P, t + start + dur);
      g.gain.setValueAtTime(0, t + start); g.gain.linearRampToValueAtTime(v, t + start + 0.008); g.gain.exponentialRampToValueAtTime(0.0008, t + start + dur);
      o.connect(g).connect(out); o.start(t + start); o.stop(t + start + dur + 0.05);
    };
    const noise = (ftype, f, dur, v = 0.3, start = 0, q = 1, f1 = null) => {
      const s = ctx.createBufferSource(); s.buffer = a.noise; const fl = ctx.createBiquadFilter(); fl.type = ftype; fl.frequency.setValueAtTime(f, t + start); fl.Q.value = q;
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + start + dur);
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t + start); g.gain.linearRampToValueAtTime(v, t + start + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + start + dur);
      s.connect(fl).connect(g).connect(out); s.start(t + start, Math.random()); s.stop(t + start + dur + 0.05);
    };
    const send = (amt) => { const s = ctx.createGain(); s.gain.value = amt; pn.connect(s).connect(a.reverb); };
    switch (name) {
      case 'hop': osc('sine', 180, 120, 0.08, 0.12); noise('lowpass', 600, 0.05, 0.05); break;
      case 'jump': osc('square', 220, 520, 0.14, 0.07); osc('sine', 300, 600, 0.12, 0.1); break;
      case 'land': osc('sine', 120, 50, 0.15, 0.3); noise('lowpass', 400, 0.12, 0.15); break;
      case 'boing': osc('sine', 160, 700, 0.35, 0.25); osc('triangle', 320, 1200, 0.3, 0.08); break;
      case 'fall': osc('sine', 600, 80, 0.7, 0.15); break;
      case 'kaloStep': noise('bandpass', 900, 0.06, 0.08, 0, 2); break;
      case 'collect': [0, 4, 7, 12].forEach((s, i) => osc('triangle', 660 * Math.pow(2, s / 12), null, 0.25, 0.12, i * 0.06)); send(0.3); break;
      case 'memory': [0, 7, 12, 16, 19].forEach((s, i) => osc('sine', 523 * Math.pow(2, s / 12), null, 1.2, 0.1, i * 0.12)); send(0.8); break;
      case 'brick': osc('square', 440, 880, 0.1, 0.07); osc('triangle', 880, null, 0.25, 0.1, 0.08); break;
      case 'ticket': osc('square', 990, null, 0.06, 0.06); osc('square', 1320, null, 0.12, 0.06, 0.06); break;
      case 'interact': osc('triangle', 520, 660, 0.08, 0.12); break;
      case 'water': noise('bandpass', 1500, 0.8, 0.12, 0, 0.8, 600); break;
      case 'splash': noise('lowpass', 1800, 0.5, 0.25, 0, 0.6, 300); break;
      case 'pop': noise('bandpass', 1200, 0.08, 0.5, 0, 0.8); osc('sine', 700, 200, 0.06, 0.2); break;
      case 'switch': osc('square', 180, null, 0.04, 0.1); noise('highpass', 3000, 0.04, 0.15); osc('sine', 200, 900, 0.5, 0.12, 0.05); break;
      case 'powerOn': osc('sawtooth', 60, 240, 1.4, 0.08); osc('sine', 120, 480, 1.4, 0.1); send(0.4); break;
      case 'powerDown': osc('sawtooth', 240, 40, 1.6, 0.08); osc('sine', 480, 60, 1.6, 0.08); break;
      case 'chime': osc('sine', 880, null, 0.6, 0.12); osc('sine', 1318, null, 0.8, 0.1, 0.12); send(0.5); break;
      case 'leave': osc('sine', 1318, null, 0.6, 0.1); osc('sine', 880, null, 0.9, 0.1, 0.14); send(0.5); break;
      case 'spawn': [0, 4, 7, 11, 14].forEach((s, i) => osc('sine', 440 * Math.pow(2, s / 12), null, 0.6, 0.07, i * 0.04)); noise('highpass', 5000, 0.5, 0.05, 0, 1, 9000); send(0.6); break;
      case 'creak': { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(110, t + 0.6); o.frequency.linearRampToValueAtTime(60, t + 1.1);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 800; f.Q.value = 6; const g = ctx.createGain(); g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.1); g.gain.linearRampToValueAtTime(0, t + 1.2); o.connect(f).connect(g).connect(out); o.start(t); o.stop(t + 1.3); break; }
      case 'thunder': noise('lowpass', 300, 3.5, 0.6, 0, 0.5, 60); noise('lowpass', 1200, 0.4, 0.4); send(0.6); break;
      case 'rumble': noise('lowpass', 120, 2.5, 0.6, 0, 0.5); osc('sine', 45, 30, 2.5, 0.3); break;
      case 'crash': noise('lowpass', 2500, 1.2, 0.8, 0, 0.5, 100); osc('sine', 90, 30, 1, 0.6); send(0.5); break;
      case 'break': // Kalo's pieces scattering: a soft plastic clatter
        for (let i = 0; i < 7; i++) { osc('square', 300 + Math.random() * 500, 100, 0.07, 0.07, i * 0.05 + Math.random() * 0.03); noise('bandpass', 1500 + Math.random() * 2000, 0.06, 0.15, i * 0.05, 2); }
        osc('sine', 140, 60, 0.4, 0.3); send(0.4); break;
      case 'tick': osc('square', 1200, null, 0.03, 0.05); break;
      case 'tickLow': osc('square', 600, null, 0.05, 0.05); break;
      case 'firework': noise('lowpass', 3000, 1.2, 0.35, 0, 0.5, 200); osc('sine', 120, 40, 0.5, 0.3); send(0.5); break;
      case 'whoosh': noise('bandpass', 400, 0.6, 0.18, 0, 1, 2000); break;
      case 'page': noise('highpass', 2500, 0.25, 0.12, 0, 0.5, 6000); noise('bandpass', 1500, 0.15, 0.06, 0.1, 1); break;
      case 'door': noise('lowpass', 600, 0.3, 0.3); osc('sine', 90, 60, 0.3, 0.3); break;
      case 'glitch': for (let i = 0; i < 6; i++) osc('square', 100 + Math.random() * 1600, null, 0.03, 0.06, i * 0.035); break;
      case 'heartbeat': a.drum('heart', t, 0.7 * vol, out); break;
      case 'place': osc('sine', 300, 150, 0.15, 0.25); noise('lowpass', 900, 0.1, 0.15); break;
      case 'deny': osc('square', 200, 150, 0.15, 0.06); break;
      case 'checkpoint': [0, 5, 9].forEach((s, i) => osc('triangle', 520 * Math.pow(2, s / 12), null, 0.3, 0.1, i * 0.07)); break;
      case 'radio': noise('bandpass', 2200, 1.4, 0.15, 0, 0.4); osc('sine', 1000, null, 0.08, 0.05); break;
      case 'blipGob': osc('square', 170 + Math.random() * 40, null, 0.05, 0.035); break;
      case 'blipKalo': osc('square', 430 + Math.random() * 120, null, 0.045, 0.035); break;
      case 'blipCopy': osc('square', 300 + Math.random() * 10, 290, 0.06, 0.03); osc('square', 304, null, 0.06, 0.02); break;
      case 'blipDiary': noise('highpass', 4000, 0.04, 0.05); break;
      case 'blipSys': osc('sine', 700, null, 0.03, 0.03); break;
      case 'quack': osc('sawtooth', 380, 300, 0.12, 0.05); noise('bandpass', 900, 0.1, 0.06, 0, 3); break;
      case 'select': osc('triangle', 660, null, 0.05, 0.08); break;
      case 'back': osc('triangle', 440, null, 0.05, 0.08); break;
      default: osc('sine', 440, null, 0.1, 0.1);
    }
    setTimeout(() => { try { pn.disconnect(); out.disconnect(); } catch (e) {} }, 5000);
  }
}
