/**
 * localStorage persistence: 3 manual slots + 1 autosave, a global "progress" record
 * (chapters unlocked, memories ever found, game completed) and settings.
 * Everything is wrapped in try/catch: private browsing or full storage must not crash the game.
 */
const PREFIX = 'gob.v1.';
const SLOTS = ['auto', '1', '2', '3'];

function read(key) {
  try { const s = localStorage.getItem(PREFIX + key); return s ? JSON.parse(s) : null; } catch (e) { console.warn('save read failed', e); return null; }
}
function write(key, val) {
  try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch (e) { console.warn('save write failed', e); return false; }
}

export class SaveSystem {
  constructor() {
    this.progress = read('progress') || { unlocked: 1, memories: [], completed: false, furthest: 1 };
  }
  get slots() { return SLOTS; }

  list() { return SLOTS.map((id) => ({ id, data: read('slot.' + id) })); }
  load(id) { return read('slot.' + id); }
  save(id, state) {
    const data = { ...state, savedAt: Date.now(), version: 1 };
    const ok = write('slot.' + id, data);
    return ok;
  }
  remove(id) { try { localStorage.removeItem(PREFIX + 'slot.' + id); } catch (e) {} }
  hasAny() { return SLOTS.some((id) => !!read('slot.' + id)); }
  latest() {
    let best = null;
    for (const s of this.list()) if (s.data && (!best || s.data.savedAt > best.data.savedAt)) best = s;
    return best;
  }

  unlockChapter(n) {
    if (n > this.progress.unlocked) this.progress.unlocked = n;
    if (n > this.progress.furthest) this.progress.furthest = n;
    write('progress', this.progress);
  }
  addMemory(id) { if (!this.progress.memories.includes(id)) { this.progress.memories.push(id); write('progress', this.progress); } }
  setCompleted() { this.progress.completed = true; write('progress', this.progress); }
}

export const DEFAULT_SETTINGS = {
  master: 0.8, music: 0.7, sfx: 0.8,
  mouseSens: 1, invertY: false, fov: 62, quality: 'high', textSpeed: 1, showFps: false,
  screenShake: true, autoCamera: true, camDistance: 7,
};

export class Settings {
  constructor() { this.data = { ...DEFAULT_SETTINGS, ...(read('settings') || {}) }; }
  set(k, v) { this.data[k] = v; write('settings', this.data); }
  reset() { this.data = { ...DEFAULT_SETTINGS }; write('settings', this.data); }
}
