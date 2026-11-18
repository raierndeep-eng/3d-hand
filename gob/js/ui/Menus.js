import { MEMORIES } from '../story/Memories.js';
import { CHAPTERS } from '../levels/chapters.js';
import { formatTime } from '../core/utils.js';

/**
 * All menus: title, chapter select, pause, settings, save/load slots, memories gallery,
 * controls, credits. Pure DOM; talks to the Game through a few methods.
 */
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'html') e.innerHTML = v; else if (v !== false && v !== null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(k));
  return e;
};

export class Menus {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('menus');
    this.stack = [];
    addEventListener('keydown', (e) => {
      if (!this.stack.length) return;
      if (e.code === 'Escape' || e.code === 'Backspace') {
        const top = this.stack[this.stack.length - 1];
        if (top.back) { e.preventDefault(); top.back(); }
      }
    });
  }

  get open() { return this.stack.length > 0; }
  sfx(n) { this.game.sfx.play(n); }

  push(el, back) { this.root.appendChild(el); this.stack.push({ el, back }); const f = el.querySelector('button:not(:disabled)'); f && setTimeout(() => f.focus({ preventScroll: true }), 30); }
  pop() { const t = this.stack.pop(); if (t) t.el.remove(); }
  closeAll() { while (this.stack.length) this.pop(); }

  btn(label, onclick, { sub = '', disabled = false } = {}) {
    return h('button', { class: 'btn', disabled: disabled ? 'disabled' : false, onclick: (e) => { this.sfx('select'); onclick(e); } }, label, sub ? h('span', { class: 'sub' }, sub) : null);
  }
  backBtn(fn) { return h('button', { class: 'btn', onclick: () => { this.sfx('back'); fn(); } }, '← Back'); }

  // ---------------- Title ----------------
  title() {
    this.closeAll();
    const g = this.game, save = g.save;
    const latest = save.latest();
    const prog = save.progress;
    const wrap = h('div', { class: 'title-wrap' },
      h('div', { class: 'logo' }, 'GOB ', h('span', { class: 'tagline' }, 'HI! IM')),
      h('div', { class: 'title-sub' }, prog.completed ? 'Thank you for staying.' : prog.furthest >= 4 ? 'Same place tomorrow.' : 'A small grey cube. A very big world.'),
      latest ? this.btn('Continue', () => g.loadSlot(latest.id), { sub: describeSave(latest.data) }) : null,
      this.btn('New Game', () => this.confirmNew()),
      this.btn('Chapters', () => this.chapters()),
      this.btn('Load Game', () => this.slots('load')),
      this.btn('Memories', () => this.memories()),
      this.btn('Settings', () => this.settings()),
      this.btn('Credits', () => g.rollCredits(false)),
    );
    const el = h('div', { class: 'menu', id: 'title-screen' }, wrap, h('div', { class: 'title-foot' }, 'Best with headphones · Click to start audio'));
    this.push(el, null);
  }

  confirmNew() {
    if (!this.game.save.hasAny()) { this.closeAll(); this.game.newGame(); return; }
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel' }, h('h2', {}, 'Start a new game?'),
      h('p', {}, 'Your saves stay where they are. The autosave slot will be overwritten as you play.'),
      h('div', { class: 'btn-row' }, this.btn('Start', () => { this.closeAll(); this.game.newGame(); }), this.backBtn(() => this.pop()))));
    this.push(el, () => this.pop());
  }

  chapters() {
    const un = this.game.save.progress.unlocked;
    const list = CHAPTERS.map((c, i) => this.btn(`${i + 1}. ${i < un ? c.title : '???'}`, () => { this.closeAll(); this.game.startChapter(i + 1, 0, null, true); }, { sub: i < un ? c.subtitle : 'Locked', disabled: i >= un }));
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel' }, h('h2', {}, 'Chapters'), ...list, this.backBtn(() => this.pop())));
    this.push(el, () => this.pop());
  }

  // ---------------- Pause ----------------
  pause() {
    const g = this.game;
    const ch = CHAPTERS[g.chapterIndex - 1];
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel' },
      h('h2', {}, 'Paused'),
      h('p', { style: 'color:var(--ui-dim);margin-top:-8px' }, ch ? `Chapter ${g.chapterIndex}: ${ch.title} · ${formatTime(g.playTime)}` : ''),
      this.btn('Resume', () => g.resume()),
      this.btn('Save Game', () => this.slots('save')),
      this.btn('Load Game', () => this.slots('load')),
      this.btn('Memories', () => this.memories()),
      this.btn('Settings', () => this.settings()),
      this.btn('Controls', () => this.controls()),
      this.btn('Restart Checkpoint', () => { this.closeAll(); g.restartCheckpoint(); }),
      this.btn('Quit to Title', () => this.confirmQuit()),
    ));
    this.push(el, () => g.resume());
  }

  confirmQuit() {
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel' }, h('h2', {}, 'Quit to title?'),
      h('p', {}, 'Progress since the last checkpoint will be lost. (Checkpoints autosave.)'),
      h('div', { class: 'btn-row' }, this.btn('Quit', () => { this.closeAll(); this.game.quitToTitle(); }), this.backBtn(() => this.pop()))));
    this.push(el, () => this.pop());
  }

  // ---------------- Save / Load ----------------
  slots(mode) {
    const g = this.game;
    const render = () => {
      panel.innerHTML = '';
      panel.append(h('h2', {}, mode === 'save' ? 'Save Game' : 'Load Game'));
      for (const s of g.save.list()) {
        const label = s.id === 'auto' ? 'Autosave' : `Slot ${s.id}`;
        const can = mode === 'load' ? !!s.data : s.id !== 'auto';
        const row = h('div', { class: 'slot' });
        const b = this.btn(label, () => {
          if (mode === 'load') { this.closeAll(); g.loadSlot(s.id); }
          else { const ok = g.saveToSlot(s.id); g.hud.toast(ok ? 'Game saved' : 'Could not save (storage full or blocked)', label); render(); }
        }, { sub: s.data ? describeSave(s.data) : 'Empty', disabled: !can });
        b.style.flex = '1';
        row.append(b);
        if (s.data && s.id !== 'auto') {
          const del = h('button', { class: 'btn', style: 'width:auto;margin-left:8px', title: 'Delete', onclick: () => { g.save.remove(s.id); render(); } }, '✕');
          row.append(del);
        }
        panel.append(row);
      }
      panel.append(this.backBtn(() => this.pop()));
    };
    const panel = h('div', { class: 'panel' });
    const el = h('div', { class: 'menu dim' }, panel);
    render();
    this.push(el, () => this.pop());
  }

  // ---------------- Memories ----------------
  memories() {
    const found = new Set([...this.game.save.progress.memories, ...(this.game.collected || [])]);
    const detail = h('div', { class: 'memdetail hidden' });
    const grid = h('div', { class: 'memgrid' }, MEMORIES.map((m, i) => {
      const has = found.has(m.id);
      const card = h('div', { class: 'mem' + (has ? '' : ' locked'), style: `--r:${((i * 37) % 7) - 3}deg` },
        h('div', { class: 'pic', style: has ? `background:linear-gradient(${m.a},${m.b})` : '' }, has ? m.glyph : '?'),
        h('div', { class: 'cap' }, has ? m.title : `Chapter ${m.ch}`));
      if (has) card.addEventListener('click', () => { this.sfx('page'); detail.textContent = `${m.title}\n\n${m.text}`; detail.classList.remove('hidden'); });
      return card;
    }));
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel wide' },
      h('h2', {}, `Memories (${[...found].filter((id) => MEMORIES.some((m) => m.id === id)).length}/${MEMORIES.length})`),
      h('p', { style: 'color:var(--ui-dim);margin-top:-6px' }, 'Polaroids hidden around the world. Click one to read the back.'),
      grid, detail, this.backBtn(() => this.pop())));
    this.push(el, () => this.pop());
  }

  // ---------------- Settings ----------------
  settings() {
    const g = this.game, s = g.settings;
    const slider = (key, label, min, max, step, fmt = (v) => Math.round(v * 100) + '%') => {
      const val = h('span', { class: 'val' }, fmt(s.data[key]));
      const inp = h('input', { type: 'range', min, max, step, value: s.data[key] });
      inp.addEventListener('input', () => { s.set(key, parseFloat(inp.value)); val.textContent = fmt(s.data[key]); g.applySettings(); });
      return h('div', { class: 'row' }, h('label', {}, label), inp, val);
    };
    const check = (key, label) => {
      const inp = h('input', { type: 'checkbox' }); inp.checked = !!s.data[key];
      inp.addEventListener('change', () => { s.set(key, inp.checked); g.applySettings(); });
      return h('div', { class: 'row' }, h('label', {}, label), inp);
    };
    const select = (key, label, opts) => {
      const sel = h('select', {}, opts.map(([v, t]) => { const o = h('option', { value: v }, t); if (String(s.data[key]) === String(v)) o.selected = true; return o; }));
      sel.addEventListener('change', () => { const v = sel.value; s.set(key, isNaN(+v) ? v : +v); g.applySettings(); });
      return h('div', { class: 'row' }, h('label', {}, label), sel);
    };
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel' },
      h('h2', {}, 'Settings'),
      h('h3', {}, 'AUDIO'),
      slider('master', 'Master volume', 0, 1, 0.01), slider('music', 'Music', 0, 1, 0.01), slider('sfx', 'Sound effects', 0, 1, 0.01),
      h('h3', {}, 'CONTROLS'),
      slider('mouseSens', 'Camera sensitivity', 0.2, 3, 0.05, (v) => v.toFixed(2) + '×'),
      check('invertY', 'Invert camera Y'), check('autoCamera', 'Camera follows behind while walking'),
      h('h3', {}, 'DISPLAY'),
      select('quality', 'Graphics quality', [['low', 'Low (fast)'], ['medium', 'Medium'], ['high', 'High']]),
      slider('fov', 'Field of view', 50, 85, 1, (v) => Math.round(v) + '°'),
      slider('camDistance', 'Camera distance', 4, 12, 0.5, (v) => v.toFixed(1)),
      check('screenShake', 'Screen shake'), check('showFps', 'Show FPS'),
      h('h3', {}, 'TEXT'),
      slider('textSpeed', 'Text speed', 0.4, 3, 0.1, (v) => v.toFixed(1) + '×'),
      h('div', { class: 'btn-row', style: 'margin-top:12px' },
        this.btn('Reset to defaults', () => { s.reset(); g.applySettings(); this.pop(); this.settings(); }),
        this.backBtn(() => this.pop())),
    ));
    this.push(el, () => this.pop());
  }

  controls() {
    const rows = [
      ['W A S D / Arrows', 'Move'], ['Mouse (click to capture)', 'Look around'], ['Mouse wheel', 'Zoom'], ['Space', 'Jump (hold for higher)'],
      ['E / F', 'Interact'], ['Space / E / Enter / Click', 'Advance dialogue'], ['Esc / P', 'Pause'],
      ['Gamepad', 'Left stick move · Right stick look · A jump · X use · Start pause'], ['Touch', 'Left stick move · drag to look · buttons'],
    ];
    const el = h('div', { class: 'menu dim' }, h('div', { class: 'panel' }, h('h2', {}, 'Controls'),
      h('table', { class: 'controls-table' }, rows.map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', {}, b)))),
      this.backBtn(() => this.pop())));
    this.push(el, () => this.pop());
  }

  credits(onDone, fromEnding) {
    const lines = [
      h('h1', {}, 'GOB'),
      h('p', { class: 'q' }, fromEnding ? '“Hi. I’m GOB.”' : '“Same place tomorrow?”'),
      h('h4', {}, 'GOB'), h('p', {}, 'a small grey cube with very big eyes'),
      h('h4', {}, 'KALO'), h('p', {}, 'who said hi first'),
      h('h4', {}, 'STORY, WORLD, CODE & MUSIC'), h('p', {}, 'Procedurally built in Three.js and the Web Audio API'),
      h('h4', {}, 'TECHNOLOGY'), h('p', {}, 'Three.js (MIT License)'), h('p', {}, 'Web Audio API'), h('p', {}, 'Fredoka & VT323 typefaces (OFL)'),
      h('h4', {}, 'FLOWERS'), h('p', {}, 'Petunia · Sir Daisy · Marigold Jr. · Steve'),
      h('h4', {}, 'THE FAIR'), h('p', {}, 'built by GOB, day 380'), h('p', {}, 'attendance: 2'),
      h('h4', {}, 'SPECIAL THANKS'), h('p', {}, 'everyone who ever said hi first'),
      h('p', { class: 'q' }, 'If you know someone who’s been quiet for a while — say hi.'),
      h('h4', {}, 'PLAYERS ONLINE'), h('p', { style: 'font-size:42px;font-weight:700' }, '1'),
      h('p', { class: 'q' }, 'Thank you for staying.'),
    ];
    const roll = h('div', { class: 'credits-roll' }, lines);
    const done = () => { if (this._cdone) return; this._cdone = true; this.pop(); onDone && onDone(); };
    this._cdone = false;
    const skip = h('button', { class: 'btn skip', style: 'width:auto', onclick: done }, 'Skip');
    const el = h('div', { class: 'menu', id: 'credits' }, roll, skip);
    roll.addEventListener('animationend', done);
    this.push(el, done);
  }
}

function describeSave(d) {
  if (!d) return 'Empty';
  const ch = CHAPTERS[d.chapter - 1];
  const date = new Date(d.savedAt);
  return `Ch. ${d.chapter}: ${ch ? ch.title : '?'} · ${formatTime(d.playTime || 0)} · ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
