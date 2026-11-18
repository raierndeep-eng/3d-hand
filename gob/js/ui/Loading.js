/** Loading screen with a hopping GOB, progress bar and a rotating quiet tip. */
const TIPS = [
  'GOB has no mouth. He talks with his eyes.',
  'Hold Space for a higher jump. Tap it for a little hop.',
  'Polaroids are hidden in every chapter. Some are hard to reach.',
  'Kalo picked yellow because it is the colour of the sun.',
  'You can save any time from the pause menu. Checkpoints autosave.',
  'If you get lost, look for the yellow diamond.',
  'The flowers are called Petunia, Sir Daisy, Marigold Jr. and Steve.',
  'Click the game to capture the mouse. Esc to pause.',
];
export class Loading {
  constructor() {
    this.el = document.getElementById('loading');
    this.fill = document.getElementById('ld-fill');
    this.title = document.getElementById('ld-title');
    this.tip = document.getElementById('ld-tip');
  }
  show(title = 'LOADING', tip = null) {
    this.title.textContent = title;
    this.tip.textContent = tip || TIPS[Math.floor(Math.random() * TIPS.length)];
    this.fill.style.width = '0%';
    this.el.classList.remove('hidden', 'fade');
  }
  progress(p) { this.fill.style.width = Math.round(Math.max(0, Math.min(1, p)) * 100) + '%'; }
  hide() { this.el.classList.add('fade'); setTimeout(() => { if (this.el.classList.contains('fade')) this.el.classList.add('hidden'); }, 650); }
}
