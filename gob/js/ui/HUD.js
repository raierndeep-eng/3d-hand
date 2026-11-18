/**
 * In-game heads-up display: objective panel, chat feed ("Kalo joined the game"), toasts,
 * big centered captions, counters, chapter title cards.
 */
const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.root = $('hud');
    this.objEl = $('objective'); this.objText = $('obj-text'); this.objProg = $('obj-progress');
    this.chat = $('chat'); this.toasts = $('toast-area'); this.captionEl = $('caption');
    this.counterEl = $('counter'); this.counterText = $('counter-text');
    this.bigEl = $('bigcount'); this.fpsEl = $('fps'); this.poEl = $('players-online'); this.poCount = $('po-count');
    this.titleEl = $('titlecard');
    this.fpsAcc = 0; this.fpsN = 0;
  }
  show(v) { this.root.classList.toggle('hidden', !v); }

  objective(text, progress = '') {
    if (!text) { this.objEl.classList.add('hidden'); this.current = null; return; }
    const changed = text !== this.current;
    this.current = text;
    this.objText.textContent = text; this.objProg.textContent = progress;
    this.objEl.classList.remove('hidden');
    if (changed) { this.objEl.style.animation = 'none'; void this.objEl.offsetWidth; this.objEl.style.animation = ''; }
  }
  progress(p) { this.objProg.textContent = p; }

  chatMsg(text, cls = 'sys') {
    const d = document.createElement('div'); d.className = 'chatmsg ' + cls; d.textContent = text;
    this.chat.appendChild(d);
    setTimeout(() => { d.style.opacity = '0'; }, 7000);
    setTimeout(() => d.remove(), 8400);
    while (this.chat.children.length > 5) this.chat.firstChild.remove();
  }
  clearChat() { this.chat.innerHTML = ''; }

  toast(title, sub = '') {
    const d = document.createElement('div'); d.className = 'toast';
    d.innerHTML = ''; d.textContent = title;
    if (sub) { const s = document.createElement('small'); s.textContent = sub; d.appendChild(s); }
    this.toasts.appendChild(d); setTimeout(() => d.remove(), 3500);
  }

  caption(text, { pixel = false } = {}) {
    if (!text) { this.captionEl.classList.add('hidden'); return; }
    this.captionEl.textContent = text; this.captionEl.classList.toggle('pixel', pixel);
    this.captionEl.classList.remove('hidden');
    this.captionEl.style.animation = 'none'; void this.captionEl.offsetWidth; this.captionEl.style.animation = '';
  }

  big(text) { if (!text) this.bigEl.classList.add('hidden'); else { this.bigEl.textContent = text; this.bigEl.classList.remove('hidden'); } }

  counter(text) { if (text === null || text === undefined) this.counterEl.classList.add('hidden'); else { this.counterText.textContent = text; this.counterEl.classList.remove('hidden'); } }

  playersOnline(n) { if (n === null) this.poEl.classList.add('hidden'); else { this.poCount.textContent = n; this.poEl.classList.remove('hidden'); } }

  async titleCard(num, title, sub, hold = 3.2) {
    const el = this.titleEl;
    el.querySelector('.tc-num').textContent = num; el.querySelector('.tc-title').textContent = title; el.querySelector('.tc-sub').textContent = sub;
    el.classList.remove('hidden', 'out');
    await this.game.wait(hold);
    el.classList.add('out');
    await this.game.wait(1.5);
    el.classList.add('hidden'); el.classList.remove('out');
  }

  clearAll() {
    this.objective(null); this.caption(null); this.big(null); this.counter(null); this.playersOnline(null); this.clearChat();
    this.titleEl.classList.add('hidden'); this.toasts.innerHTML = '';
  }

  updateFps(dt) {
    if (!this.game.settings.data.showFps) { this.fpsEl.classList.add('hidden'); return; }
    this.fpsEl.classList.remove('hidden');
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fpsEl.textContent = Math.round(this.fpsN / this.fpsAcc) + ' fps'; this.fpsAcc = 0; this.fpsN = 0; }
  }
}
