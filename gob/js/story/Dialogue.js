/**
 * Dialogue box with typewriter text, per-speaker voice blips, choices, and inline actions.
 *
 * Lines:  'K: hello'  'G: hi'  'C: hi'  'D: diary text'  'N: narration'  'S: system'  '?: ???'
 *         { choice: ['Yes', 'No'] }   -> resolves play() with the chosen index in result.choice
 *         () => {...}                 -> inline action (may return a promise)
 */
const SPEAKERS = {
  G: { name: 'GOB', cls: 'gob', blip: 'blipGob' },
  K: { name: 'Kalo', cls: 'kalo', blip: 'blipKalo' },
  C: { name: 'Kalo?', cls: 'copy', blip: 'blipCopy' },
  D: { name: 'GOB’s notebook', cls: 'diary', blip: 'blipDiary' },
  L: { name: 'Note', cls: 'diary', blip: 'blipDiary' },
  N: { name: '', cls: 'narr', blip: null },
  S: { name: 'System', cls: 'sys', blip: 'blipSys' },
  '?': { name: '???', cls: 'sys', blip: 'blipSys' },
};

export class Dialogue {
  constructor(game) {
    this.game = game;
    this.el = document.getElementById('dialogue');
    this.nameEl = document.getElementById('dlg-name');
    this.textEl = document.getElementById('dlg-text');
    this.choicesEl = document.getElementById('dlg-choices');
    this.nextEl = document.getElementById('dlg-next');
    this.active = false;
    this.full = ''; this.shown = 0; this.typing = false; this.blipT = 0;
    this.waitingAdvance = null; this.choice = null; this.choiceIdx = 0;
    this.el.addEventListener('click', () => { this.clicked = true; });
    this.chain = Promise.resolve();
  }

  /** Dialogues queue up: a new one waits for the one on screen to finish. */
  play(lines, opts = {}) {
    const run = () => this._play(lines, opts);
    const p = this.chain.then(run, run);
    this.chain = p.catch(() => {});
    return p;
  }
  reset() { this.chain = Promise.resolve(); this.hide(); }

  async _play(lines, { lock = true } = {}) {
    const game = this.game;
    const result = { choice: -1 };
    if (lock) game.lock('dialogue');
    try {
      for (const ln of lines) {
        if (typeof ln === 'function') { await ln(); continue; }
        if (ln && ln.choice) { result.choice = await this.ask(ln.choice); continue; }
        if (ln && ln.wait) { await game.wait(ln.wait); continue; }
        const m = /^([GKCDLNS?]):\s?([\s\S]*)$/.exec(ln);
        const sp = m ? SPEAKERS[m[1]] : SPEAKERS.N;
        // GOB has no mouth: he gives a little squash when he talks.
        if (m && m[1] === 'G') game.player.model.impulseSquash(1.4);
        await this.show(sp, m ? m[2] : ln);
      }
    } finally {
      this.hide();
      if (lock) game.unlock('dialogue');
    }
    return result;
  }

  show(sp, text) {
    this.active = true;
    this.el.classList.remove('hidden', 'gob', 'kalo', 'copy', 'diary', 'narr', 'sys');
    this.el.classList.add(sp.cls);
    this.nameEl.textContent = sp.name; this.nameEl.className = sp.cls;
    this.full = text; this.shown = 0; this.hold = 0; this.typing = true; this.speaker = sp;
    this.textEl.textContent = ''; this.choicesEl.innerHTML = ''; this.nextEl.style.visibility = 'hidden';
    this.clicked = false;
    return this.game.promise((res) => { this.waitingAdvance = res; });
  }

  ask(options) {
    this.active = true;
    this.el.classList.remove('hidden');
    this.choice = options; this.choiceIdx = 0;
    this.choicesEl.innerHTML = '';
    options.forEach((o, i) => {
      const b = document.createElement('button'); b.className = 'choice' + (i === 0 ? ' sel' : ''); b.textContent = o;
      b.addEventListener('click', (e) => { e.stopPropagation(); this.pickChoice(i); });
      this.choicesEl.appendChild(b);
    });
    this.nextEl.style.visibility = 'hidden';
    return this.game.promise((res) => { this.choiceResolve = res; });
  }

  pickChoice(i) {
    if (!this.choice) return;
    this.game.sfx.play('select');
    const r = this.choiceResolve; this.choice = null; this.choiceResolve = null; this.choicesEl.innerHTML = '';
    r && r(i);
  }

  hide() { this.active = false; this.el.classList.add('hidden'); this.waitingAdvance = null; this.choice = null; }

  update(dt) {
    if (!this.active) return;
    const input = this.game.input;
    if (this.choice) {
      const n = this.choice.length;
      if (input.pressed('ArrowLeft') || input.pressed('ArrowUp') || input.pressed('KeyA') || input.pressed('KeyW')) this.choiceIdx = (this.choiceIdx + n - 1) % n;
      if (input.pressed('ArrowRight') || input.pressed('ArrowDown') || input.pressed('KeyD') || input.pressed('KeyS')) this.choiceIdx = (this.choiceIdx + 1) % n;
      [...this.choicesEl.children].forEach((b, i) => b.classList.toggle('sel', i === this.choiceIdx));
      if (input.pressed('Enter') || input.pressed('Space') || input.pressed('KeyE')) this.pickChoice(this.choiceIdx);
      return;
    }
    const advance = input.confirmPressed() || this.clicked; this.clicked = false;
    if (this.typing) {
      const cps = 42 * this.game.settings.data.textSpeed * (this.speaker.cls === 'narr' || this.speaker.cls === 'diary' ? 0.75 : 1);
      const prev = Math.floor(this.shown);
      if (this.hold > 0) this.hold -= dt;
      else this.shown = Math.min(this.full.length, this.shown + Math.min(dt, 0.05) * cps);
      const now = Math.floor(this.shown);
      const ch = this.full[now - 1];
      // brief pauses on punctuation
      if (now !== prev && (ch === '.' || ch === ',' || ch === '?' || ch === '!')) this.hold = ch === ',' ? 0.06 : 0.12;
      this.textEl.textContent = this.full.slice(0, now);
      this.blipT -= dt;
      if (this.speaker.blip && this.blipT <= 0 && now > prev && ch && ch !== ' ') { this.game.sfx.play(this.speaker.blip); this.blipT = 0.06; }
      if (advance && this.shown > 2) this.shown = this.full.length;
      if (this.shown >= this.full.length) { this.typing = false; this.textEl.textContent = this.full; this.nextEl.style.visibility = 'visible'; }
    } else if (advance) {
      const r = this.waitingAdvance; this.waitingAdvance = null; r && r();
    }
  }
}
