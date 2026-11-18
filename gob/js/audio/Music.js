/**
 * Procedural music. Every track is an arrangement of the same two themes ("GOB's song"):
 * bright and bouncy at the start, a carnival waltz at the fair, then slower, minor,
 * detuned and missing notes as the world empties out — until only a music box is left.
 */
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10], lydian: [0, 2, 4, 6, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10],
};

// [scaleDegree, lengthInSixteenths]; 16 per bar.
const THEME_A = [
  [[0, 2], [2, 2], [4, 4], [4, 2], [5, 2], [4, 4]],
  [[2, 4], [0, 4], [1, 8]],
  [[0, 2], [2, 2], [4, 4], [7, 4], [6, 4]],
  [[5, 4], [4, 4], [4, 8]],
  [[5, 2], [5, 2], [4, 4], [2, 4], [0, 4]],
  [[1, 4], [2, 4], [3, 8]],
  [[4, 2], [2, 2], [1, 4], [4, 4], [-1, 4]],
  [[0, 16]],
];
const CHORDS_A = [0, 5, 0, 4, 3, 1, 4, 0];
const THEME_B = [
  [[3, 4], [5, 4], [7, 4], [5, 4]],
  [[4, 4], [6, 4], [8, 6], [6, 2]],
  [[5, 2], [4, 2], [2, 4], [0, 4], [2, 4]],
  [[4, 12], [2, 4]],
  [[3, 2], [3, 2], [5, 4], [7, 4], [8, 4]],
  [[7, 4], [6, 4], [4, 8]],
  [[3, 4], [2, 4], [1, 4], [3, 4]],
  [[4, 8], [2, 4], [1, 4]],
];
const CHORDS_B = [3, 4, 5, 0, 3, 2, 1, 4];

function compileTheme(bars) {
  const ev = []; let step = 0;
  bars.forEach((bar, bi) => { let s = bi * 16; for (const [d, l] of bar) { ev.push({ step: s, deg: d, len: l }); s += l; } });
  return ev;
}
const A = compileTheme(THEME_A), B = compileTheme(THEME_B.map((x) => x));
const AB = [...A, ...B.map((e) => ({ ...e, step: e.step + 128 }))];

/* Track definitions. layers: melody | counter | arp | bass | pad | drum | bell | drone */
export const TRACKS = {
  title: { bpm: 74, root: 72, scale: 'major', form: 'A', layers: [
    { t: 'melody', inst: 'musicbox', oct: 0, vol: 0.22 },
    { t: 'pad', oct: -2, vol: 0.05 },
    { t: 'arp', inst: 'musicbox', oct: -1, vol: 0.06, pat: [0, null, 2, null, 1, null, 2, null, 0, null, 2, null, 1, null, 2, null] },
  ] },
  happy: { bpm: 116, root: 65, scale: 'major', form: 'AB', layers: [
    { t: 'melody', inst: 'lead', oct: 1, vol: 0.085 },
    { t: 'melody', inst: 'tri', oct: 0, vol: 0.05, delay: 0 },
    { t: 'arp', inst: 'pluck', oct: 0, vol: 0.05, pat: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1] },
    { t: 'bass', oct: -2, vol: 0.18, pat: 'x...x.x.x...x.x.', fifth: true },
    { t: 'pad', oct: -1, vol: 0.03 },
    { t: 'drum', k: 'kick', vol: 0.5, pat: 'x.......x.......' },
    { t: 'drum', k: 'snare', vol: 0.18, pat: '....x.......x...' },
    { t: 'drum', k: 'hat', vol: 0.08, pat: '..x...x...x...xx' },
    { t: 'bell', oct: 2, vol: 0.04, prob: 0.06 },
  ] },
  fair: { bpm: 138, root: 67, scale: 'major', form: 'AB', layers: [
    { t: 'melody', inst: 'organ', oct: 0, vol: 0.09 },
    { t: 'arp', inst: 'pluck', oct: 0, vol: 0.05, pat: [null, null, 0, 1, null, null, 1, 2, null, null, 0, 1, null, null, 1, 2] },
    { t: 'bass', oct: -2, vol: 0.2, pat: 'x...x...x...x...', fifth: true, alt: true },
    { t: 'drum', k: 'kick', vol: 0.4, pat: 'x...x...x...x...' },
    { t: 'drum', k: 'clap', vol: 0.12, pat: '..x...x...x...x.' },
    { t: 'drum', k: 'shaker', vol: 0.05, pat: 'xxxxxxxxxxxxxxxx' },
    { t: 'bell', oct: 2, vol: 0.05, prob: 0.1 },
  ] },
  night: { bpm: 84, root: 67, scale: 'major', form: 'A', layers: [
    { t: 'melody', inst: 'musicbox', oct: 0, vol: 0.18 },
    { t: 'pad', oct: -1, vol: 0.05 },
    { t: 'bass', oct: -2, vol: 0.1, pat: 'x.......x.......' },
    { t: 'drum', k: 'shaker', vol: 0.025, pat: '..x...x...x...x.' },
  ] },
  old: { bpm: 80, root: 62, scale: 'dorian', form: 'B', layers: [
    { t: 'melody', inst: 'piano', oct: 0, vol: 0.13, drop: 0.2 },
    { t: 'pad', oct: -1, vol: 0.05 },
    { t: 'bass', oct: -2, vol: 0.11, pat: 'x.......x.......' },
    { t: 'drum', k: 'hat', vol: 0.03, pat: '....x.......x...' },
    { t: 'bell', oct: 1, vol: 0.04, prob: 0.05 },
  ] },
  storm: { bpm: 152, root: 62, scale: 'minor', form: 'A', layers: [
    { t: 'melody', inst: 'lead', oct: 0, vol: 0.07, detune: 12 },
    { t: 'bass', oct: -2, vol: 0.2, pat: 'xxxxxxxxxxxxxxxx' },
    { t: 'pad', oct: -1, vol: 0.06 },
    { t: 'drum', k: 'kick', vol: 0.55, pat: 'x...x...x...x...' },
    { t: 'drum', k: 'snare', vol: 0.2, pat: '....x.......x..x' },
    { t: 'drum', k: 'hat', vol: 0.06, pat: 'x.x.x.x.x.x.x.x.' },
  ] },
  grief: { bpm: 56, root: 69, scale: 'minor', form: 'A', layers: [
    { t: 'melody', inst: 'musicbox', oct: 0, vol: 0.16, drop: 0.25, detune: 18, wobble: 8 },
    { t: 'pad', oct: -2, vol: 0.045 },
  ] },
  brokenFair: { bpm: 92, root: 67, scale: 'minor', form: 'A', layers: [
    { t: 'melody', inst: 'organ', oct: 0, vol: 0.08, drop: 0.35, detune: 35, wobble: 20, lag: 0.04 },
    { t: 'bass', oct: -2, vol: 0.08, pat: 'x.......x.......', fifth: true, alt: true },
  ] },
  liminal: { bpm: 66, root: 64, scale: 'lydian', form: 'A', layers: [
    { t: 'melody', inst: 'flute', oct: 0, vol: 0.06, drop: 0.45, detune: 30, lag: 0.06, wobble: 12 },
    { t: 'drone', oct: -2, vol: 0.06 },
    { t: 'bell', oct: 1, vol: 0.035, prob: 0.05, detune: 40 },
  ] },
  copy: { bpm: 90, root: 64, scale: 'phrygian', form: 'A', layers: [
    { t: 'drone', oct: -2, vol: 0.07 },
    { t: 'melody', inst: 'musicbox', oct: 0, vol: 0.09, drop: 0.5, detune: 50, wobble: 25, lag: 0.08 },
    { t: 'drum', k: 'heart', vol: 0.5, pat: 'x...............' },
  ] },
  under: { bpm: 48, root: 57, scale: 'minor', form: 'B', layers: [
    { t: 'drone', oct: -2, vol: 0.07 },
    { t: 'bell', oct: 1, vol: 0.05, prob: 0.07 },
    { t: 'melody', inst: 'piano', oct: -1, vol: 0.06, drop: 0.55 },
  ] },
  reveal: { bpm: 70, root: 64, scale: 'major', form: 'AB', layers: [
    { t: 'melody', inst: 'piano', oct: 0, vol: 0.15 },
    { t: 'pad', oct: -1, vol: 0.05 },
    { t: 'bass', oct: -2, vol: 0.09, pat: 'x.......x.......' },
    { t: 'arp', inst: 'musicbox', oct: 1, vol: 0.035, pat: [0, null, null, 1, null, null, 2, null, 0, null, null, 1, null, null, 2, null] },
  ] },
  ending: { bpm: 96, root: 65, scale: 'major', form: 'AB', layers: [
    { t: 'melody', inst: 'musicbox', oct: 1, vol: 0.12 },
    { t: 'melody', inst: 'piano', oct: 0, vol: 0.1 },
    { t: 'arp', inst: 'pluck', oct: 0, vol: 0.035, pat: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1] },
    { t: 'bass', oct: -2, vol: 0.14, pat: 'x.....x.x.......', fifth: true },
    { t: 'pad', oct: -1, vol: 0.04 },
    { t: 'drum', k: 'kick', vol: 0.3, pat: 'x.......x.......' },
    { t: 'drum', k: 'shaker', vol: 0.04, pat: '..x...x...x...x.' },
  ] },
};

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.current = null; // {name, def, gain, step, nextTime, stopped}
    this.timer = null;
  }

  play(name, fade = 2) {
    const a = this.audio; if (!a.ctx) { this.pending = name; return; }
    if (this.current && this.current.name === name && !this.current.stopping) return;
    this.stop(fade);
    if (!name || !TRACKS[name]) return;
    const def = TRACKS[name];
    const gain = a.ctx.createGain(); gain.gain.value = 0; gain.connect(a.musicBus);
    gain.gain.setTargetAtTime(1, a.ctx.currentTime, fade / 3);
    const melody = def.form === 'AB' ? AB : def.form === 'B' ? B : A;
    const chords = def.form === 'AB' ? [...CHORDS_A, ...CHORDS_B] : def.form === 'B' ? CHORDS_B : CHORDS_A;
    this.current = { name, def, gain, step: 0, nextTime: a.ctx.currentTime + 0.1, melody, chords, total: chords.length * 16, stopping: false };
    if (!this.timer) this.timer = setInterval(() => this.tick(), 25);
  }

  stop(fade = 2) {
    const c = this.current; if (!c || !this.audio.ctx) { this.current = null; return; }
    c.stopping = true;
    const t = this.audio.ctx.currentTime;
    c.gain.gain.cancelScheduledValues(t); c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0, t + Math.max(0.05, fade));
    setTimeout(() => { try { c.gain.disconnect(); } catch (e) {} }, (fade + 3) * 1000);
    this.current = null;
  }

  /** After the AudioContext starts, play anything requested before it existed. */
  resumePending() { if (this.pending) { const p = this.pending; this.pending = null; this.play(p, 1); } }

  tick() {
    const c = this.current, a = this.audio;
    if (!c || !a.ctx) return;
    const stepDur = 60 / c.def.bpm / 4;
    while (c.nextTime < a.ctx.currentTime + 0.15) {
      this.scheduleStep(c, c.step % c.total, c.nextTime, stepDur);
      c.nextTime += stepDur; c.step++;
    }
  }

  noteFreq(def, deg, octave) {
    const sc = SCALES[def.scale];
    const o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return this.audio.midi(def.root + sc[i] + 12 * (o + octave));
  }

  scheduleStep(c, step, time, stepDur) {
    const def = c.def, a = this.audio, bar = Math.floor(step / 16), s = step % 16;
    const chordDeg = c.chords[bar % c.chords.length];
    const chordTones = [chordDeg, chordDeg + 2, chordDeg + 4];
    for (const L of def.layers) {
      const det = () => (L.detune ? (Math.random() - 0.5) * 2 * L.detune : 0);
      const lag = L.lag ? Math.random() * L.lag : 0;
      if (L.t === 'melody') {
        for (const e of c.melody) if (e.step === step) {
          if (L.drop && Math.random() < L.drop) continue;
          a.voice(L.inst, this.noteFreq(def, e.deg, L.oct), time + lag, e.len * stepDur * 0.95, L.vol, c.gain, { detune: det(), wobble: L.wobble || 0 });
        }
      } else if (L.t === 'arp') {
        const idx = L.pat[s]; if (idx === null || idx === undefined) continue;
        a.voice(L.inst, this.noteFreq(def, chordTones[idx], L.oct), time + lag, stepDur * 1.5, L.vol, c.gain, { detune: det() });
      } else if (L.t === 'bass') {
        if (L.pat[s] !== 'x') continue;
        let deg = chordDeg;
        if (L.fifth && (s === 6 || s === 14 || (L.alt && (s === 4 || s === 12)))) deg = chordDeg + 4;
        a.voice('bass', this.noteFreq(def, deg, L.oct), time, stepDur * (L.pat === 'xxxxxxxxxxxxxxxx' ? 0.8 : 3), L.vol, c.gain);
      } else if (L.t === 'pad') {
        if (s !== 0) continue;
        for (const ct of chordTones) a.voice('pad', this.noteFreq(def, ct, L.oct), time, 16 * stepDur, L.vol, c.gain, { detune: det() });
      } else if (L.t === 'drone') {
        if (s !== 0 || bar % 2 !== 0) continue;
        a.voice('drone', this.noteFreq(def, 0, L.oct), time, 32 * stepDur, L.vol, c.gain);
        a.voice('drone', this.noteFreq(def, 4, L.oct), time, 32 * stepDur, L.vol * 0.5, c.gain);
      } else if (L.t === 'drum') {
        if (L.pat[s] === 'x') a.drum(L.k, time, L.vol, c.gain);
      } else if (L.t === 'bell') {
        if (Math.random() < L.prob) a.voice('bell', this.noteFreq(def, chordTones[Math.floor(Math.random() * 3)] + (Math.random() < 0.3 ? 7 : 0), L.oct), time, 1, L.vol, c.gain, { detune: det(), reverb: 0.5 });
      }
    }
  }
}
