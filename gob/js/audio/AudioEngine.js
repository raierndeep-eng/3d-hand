/**
 * Web Audio core: master/music/sfx/ambience buses, a generated reverb, shared noise buffers,
 * and small synth voice helpers used by both the music sequencer and the sound effects.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null; this.ready = false;
    this.vol = { master: 0.8, music: 0.7, sfx: 0.8 };
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { console.warn('Web Audio unsupported'); return; }
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.25;
    this.master.connect(this.comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 20000; this.musicFilter.Q.value = 0.4;
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.connect(this.master);
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.makeImpulse(3.2, 2.6);
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.55;
    this.reverb.connect(this.reverbGain).connect(this.master);
    this.reverbSendMusic = ctx.createGain(); this.reverbSendMusic.gain.value = 0.35; this.musicBus.connect(this.reverbSendMusic).connect(this.reverb);
    this.noise = this.makeNoise(2);
    this.pulse = ctx.createPeriodicWave(...this.pulseCoeffs(0.25));
    this.applyVolumes();
    this.ready = true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.05);
  }
  setVolumes(m, mu, s) { this.vol = { master: m, music: mu, sfx: s }; this.applyVolumes(); }

  /** Muffle all music (e.g. underwater feeling of shock). 0 = clear, 1 = very muffled. */
  muffle(a, time = 1.5) {
    if (!this.ctx) return;
    const f = 20000 * Math.pow(0.012, a);
    this.musicFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, time / 3);
  }

  pulseCoeffs(duty) {
    const n = 32, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) im[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return [re, im];
  }

  makeNoise(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }

  makeImpulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }

  midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  /**
   * One synthesized note. inst decides the waveform/envelope.
   * Returns nothing; nodes clean themselves up.
   */
  voice(inst, freq, time, dur, vol, dest, { detune = 0, pan = 0, wobble = 0, reverb = 0 } = {}) {
    const ctx = this.ctx; if (!ctx) return;
    const out = ctx.createGain(); out.gain.value = 0;
    let node = out;
    if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; out.connect(p); node = p; }
    node.connect(dest);
    if (reverb > 0) { const s = ctx.createGain(); s.gain.value = reverb; node.connect(s); s.connect(this.reverb); }
    const g = out.gain;
    const oscs = [];
    const mk = (type, f, gain = 1, det = 0) => {
      const o = ctx.createOscillator();
      if (type === 'pulse') o.setPeriodicWave(this.pulse); else o.type = type;
      o.frequency.value = f; o.detune.value = detune + det;
      const og = ctx.createGain(); og.gain.value = gain; o.connect(og); oscs.push(o);
      if (wobble) { const l = ctx.createOscillator(); l.frequency.value = 4 + Math.random() * 2; const lg = ctx.createGain(); lg.gain.value = wobble; l.connect(lg).connect(o.detune); l.start(time); l.stop(time + dur + 2); }
      return og;
    };
    let rel = 0.08, end = time + dur;
    switch (inst) {
      case 'lead': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 3200; mk('pulse', freq).connect(f); f.connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.01); g.setTargetAtTime(vol * 0.6, time + 0.02, 0.1); rel = 0.06; break; }
      case 'tri': mk('triangle', freq).connect(out); g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.01); g.setTargetAtTime(vol * 0.5, time + 0.03, 0.15); rel = 0.08; break;
      case 'musicbox': mk('sine', freq).connect(out); mk('sine', freq * 2, 0.25).connect(out); mk('sine', freq * 4.02, 0.08).connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.005); g.setTargetAtTime(0, time + 0.01, 0.45); end = time + Math.max(dur, 1.6); rel = 0.05; break;
      case 'piano': { mk('triangle', freq).connect(out); mk('sine', freq * 2, 0.3).connect(out); mk('sine', freq, 0.5, 4).connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.008); g.setTargetAtTime(vol * 0.25, time + 0.01, 0.35); end = time + Math.max(dur, 0.6); rel = 0.4; break; }
      case 'pad': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.6;
        mk('sawtooth', freq, 0.5, -9).connect(f); mk('sawtooth', freq, 0.5, 9).connect(f); mk('sine', freq / 2, 0.4).connect(f); f.connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + Math.min(0.8, dur * 0.4)); rel = 1.2; break; }
      case 'organ': mk('sine', freq).connect(out); mk('sine', freq * 2, 0.5).connect(out); mk('sine', freq * 3, 0.25).connect(out); mk('square', freq, 0.05).connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.02); rel = 0.1; break;
      case 'bass': mk('triangle', freq).connect(out); mk('sine', freq / 2, 0.5).connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.01); g.setTargetAtTime(vol * 0.6, time + 0.02, 0.2); rel = 0.06; break;
      case 'pluck': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(4000, time); f.frequency.exponentialRampToValueAtTime(400, time + 0.25);
        mk('sawtooth', freq).connect(f); f.connect(out); g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.005); g.setTargetAtTime(0, time + 0.01, 0.12); end = time + 0.5; rel = 0.05; break; }
      case 'bell': mk('sine', freq).connect(out); mk('sine', freq * 2.76, 0.3).connect(out); mk('sine', freq * 5.4, 0.1).connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.004); g.setTargetAtTime(0, time + 0.01, 0.8); end = time + 3; rel = 0.05; break;
      case 'flute': mk('sine', freq).connect(out); mk('triangle', freq * 2, 0.08).connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.08); rel = 0.2; break;
      case 'drone': { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; mk('sawtooth', freq, 0.4, -6).connect(f); mk('sawtooth', freq, 0.4, 7).connect(f); mk('sine', freq / 2, 0.6).connect(f); f.connect(out);
        g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + dur * 0.3); rel = 2; break; }
      default: mk('sine', freq).connect(out); g.setValueAtTime(0, time); g.linearRampToValueAtTime(vol, time + 0.01); rel = 0.1;
    }
    g.setTargetAtTime(0, end, rel / 3);
    const stopAt = end + rel * 3 + 0.1;
    for (const o of oscs) { o.start(time); o.stop(stopAt); }
    oscs[0].onended = () => { try { node.disconnect(); } catch (e) {} };
  }

  /** Percussion and noise hits. */
  drum(kind, time, vol, dest) {
    const ctx = this.ctx; if (!ctx) return;
    const out = ctx.createGain(); out.connect(dest);
    if (kind === 'kick') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(130, time); o.frequency.exponentialRampToValueAtTime(42, time + 0.14);
      out.gain.setValueAtTime(vol, time); out.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
      o.connect(out); o.start(time); o.stop(time + 0.35);
    } else if (kind === 'heart') {
      for (const off of [0, 0.16]) {
        const o = ctx.createOscillator(); o.type = 'sine'; const gg = ctx.createGain(); gg.connect(out);
        o.frequency.setValueAtTime(70, time + off); o.frequency.exponentialRampToValueAtTime(38, time + off + 0.12);
        gg.gain.setValueAtTime(vol * (off ? 0.7 : 1), time + off); gg.gain.exponentialRampToValueAtTime(0.001, time + off + 0.2);
        o.connect(gg); o.start(time + off); o.stop(time + off + 0.25);
      }
    } else {
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      let len = 0.05;
      if (kind === 'snare') { f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7; len = 0.18;
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(220, time); o.frequency.exponentialRampToValueAtTime(120, time + 0.08);
        const og = ctx.createGain(); og.gain.setValueAtTime(vol * 0.5, time); og.gain.exponentialRampToValueAtTime(0.001, time + 0.1); o.connect(og).connect(out); o.start(time); o.stop(time + 0.12); }
      else if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7000; len = 0.04; }
      else if (kind === 'ohat') { f.type = 'highpass'; f.frequency.value = 6000; len = 0.22; }
      else if (kind === 'shaker') { f.type = 'bandpass'; f.frequency.value = 5000; f.Q.value = 1.5; len = 0.07; }
      else if (kind === 'clap') { f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 1; len = 0.14; }
      s.connect(f).connect(out);
      out.gain.setValueAtTime(vol, time); out.gain.exponentialRampToValueAtTime(0.001, time + len);
      s.start(time, Math.random() * 1.5); s.stop(time + len + 0.02);
    }
    setTimeout(() => { try { out.disconnect(); } catch (e) {} }, (time - ctx.currentTime + 1.5) * 1000);
  }
}
