import { Game } from './core/Game.js';
import { isAbort } from './core/utils.js';

/** Entry point: checks WebGL, starts the game, and routes uncaught errors to the error screen. */
function fatal(msg) {
  const el = document.getElementById('error');
  document.getElementById('error-msg').textContent = msg;
  el.classList.remove('hidden');
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('err-reload').onclick = () => location.reload();
  document.getElementById('err-menu').style.display = 'none';
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}

if (!hasWebGL()) {
  fatal('Your browser could not start WebGL, which GOB needs to draw the world.\nTry an up-to-date Chrome, Firefox, Edge or Safari, and make sure hardware acceleration is on.');
} else {
  let game;
  try {
    game = new Game(document.getElementById('game'));
    window.__gob = game; // handy for debugging from the console
    addEventListener('error', (e) => { if (e.error && !isAbort(e.error)) game.showError(e.error); });
    addEventListener('unhandledrejection', (e) => { if (!isAbort(e.reason)) game.showError(e.reason); else e.preventDefault(); });
    game.boot().then(() => {
      // Dev shortcut: index.html?chapter=3&beat=2 jumps straight in.
      const q = new URLSearchParams(location.search);
      if (q.has('chapter')) game.startChapter(parseInt(q.get('chapter'), 10) || 1, parseInt(q.get('beat') || '0', 10), null, true);
    }).catch((e) => game.showError(e));
  } catch (e) {
    console.error(e);
    fatal((e && e.message) || String(e));
  }
}
