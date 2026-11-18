import * as THREE from 'three';
import { mulberry32 } from '../core/utils.js';

/**
 * Every texture in the game is painted here on canvases at load time — no image files needed.
 * GOB's face is painted to match the reference image: slate stucco, two pixel-art
 * bloodshot eyes with octagonal blue irises, and the red "HI! IM GOB" name tag.
 */
const cache = new Map();

function canvas(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { nearest = false, repeat = null, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapLinearFilter; }
  else t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function memo(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

/** GOB's slate stucco: blue-grey (≈ rgb 70,80,101) with fine mottled grit. */
function paintStucco(ctx, w, h, seed = 7, base = [104, 115, 142]) {
  const r = mulberry32(seed);
  const img = ctx.createImageData(w, h);
  // low-frequency blotches
  const blot = [];
  for (let i = 0; i < 40; i++) blot.push([r() * w, r() * h, 6 + r() * 26, (r() - 0.5) * 14]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = (r() - 0.5) * 22; // grit
    if (r() < 0.06) v -= 14 * r();
    if (r() < 0.03) v += 12 * r();
    for (const [bx, by, br, bv] of blot) { const d = Math.hypot(x - bx, y - by); if (d < br) v += bv * (1 - d / br); }
    const i = (y * w + x) * 4;
    img.data[i] = Math.max(0, Math.min(255, base[0] + v));
    img.data[i + 1] = Math.max(0, Math.min(255, base[1] + v));
    img.data[i + 2] = Math.max(0, Math.min(255, base[2] + v * 1.05));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

export function gobSide(seed = 11) {
  return memo('gobSide' + seed, () => { const c = canvas(256); paintStucco(c.getContext('2d'), 256, 256, seed); return tex(c); });
}

/** Pixel font used for the name tag (5x5 glyphs, matching the chunky tag lettering). */
const GLYPHS = {
  H: ['1.1', '1.1', '111', '1.1', '1.1'], I: ['111', '.1.', '.1.', '.1.', '111'], '!': ['1', '1', '1', '.', '1'],
  M: ['1...1', '11.11', '1.1.1', '1...1', '1...1'], G: ['111', '1..', '1.1', '1.1', '111'], O: ['111', '1.1', '1.1', '1.1', '111'],
  B: ['11.', '1.1', '11.', '1.1', '111'], ' ': ['.', '.', '.', '.', '.'],
};
function pixelText(ctx, str, x, y, s, color) {
  ctx.fillStyle = color;
  let cx = x;
  for (const ch of str) {
    const g = GLYPHS[ch] || GLYPHS[' '];
    for (let row = 0; row < g.length; row++) for (let col = 0; col < g[row].length; col++) if (g[row][col] === '1') ctx.fillRect(cx + col * s, y + row * s, s, s);
    cx += (g[0].length + 1) * s;
  }
  return cx - x - s;
}
function pixelTextWidth(str, s) { let w = 0; for (const ch of str) w += ((GLYPHS[ch] || GLYPHS[' '])[0].length + 1) * s; return w - s; }

/** Draws the "HI! IM / -[GOB]-" tag. Coordinates in a 256px face. */
export function drawNameTag(ctx, x, y, w, h) {
  const p = 4; // pixel size
  ctx.fillStyle = '#13060a'; ctx.fillRect(x, y, w, h);                     // black outline
  ctx.fillStyle = '#c43b4b'; ctx.fillRect(x + p, y + p, w - 2 * p, h - 2 * p); // red body
  ctx.fillStyle = '#e05a68'; ctx.fillRect(x + p, y + p, w - 2 * p, p);       // highlight
  // Top text "HI! IM"
  const tw = pixelTextWidth('HI! IM', p);
  pixelText(ctx, 'HI! IM', x + (w - tw) / 2, y + p * 3, p, '#ffffff');
  // White plate with "-[GOB]-"
  const py = y + h * 0.5, ph = h * 0.32;
  ctx.fillStyle = '#13060a'; ctx.fillRect(x + p * 2, py - p, w - p * 4, ph + p * 2);
  ctx.fillStyle = '#d9dee9'; ctx.fillRect(x + p * 3, py, w - p * 6, ph);
  ctx.fillStyle = '#a7afc4'; ctx.fillRect(x + p * 3, py + ph - p, w - p * 6, p);
  const gw = pixelTextWidth('GOB', p);
  const gx = x + (w - gw) / 2, gy = py + (ph - 5 * p) / 2;
  pixelText(ctx, 'GOB', gx, gy, p, '#3b3f4b');
  // brackets and dashes either side
  ctx.fillStyle = '#3b3f4b';
  ctx.fillRect(gx - p * 3, gy, p, p * 5); ctx.fillRect(gx - p * 3, gy, p * 2, p); ctx.fillRect(gx - p * 3, gy + p * 4, p * 2, p);
  ctx.fillRect(gx + gw + p * 2, gy, p, p * 5); ctx.fillRect(gx + gw + p, gy, p * 2, p); ctx.fillRect(gx + gw + p, gy + p * 4, p * 2, p);
  ctx.fillRect(x + p * 4, gy + p * 2, gx - p * 4 - (x + p * 4), p);
  ctx.fillRect(gx + gw + p * 4, gy + p * 2, x + w - p * 4 - (gx + gw + p * 4), p);
}

/** Front face: stucco + name tag in the bottom-right corner (eyes are separate, animated meshes). */
export function gobFace() {
  return memo('gobFace', () => {
    const N = 512; const c = canvas(N); const ctx = c.getContext('2d');
    paintStucco(ctx, N, N, 3);
    // Reference: tag spans x 71.7%..96.5%, y 82%..97% of the face (measured from the image).
    drawNameTag(ctx, Math.round(N * 0.717), Math.round(N * 0.815), Math.round(N * 0.248), Math.round(N * 0.15));
    const t = tex(c); t.magFilter = THREE.NearestFilter; return t;
  });
}

/** Pixel-art eyeball: black outline, off-white, grey rim shading, little red veins. */
export function eyeWhite(seed = 1, veins = 1) {
  return memo('eye' + seed + '_' + veins, () => {
    const N = 40; const c = canvas(N); const ctx = c.getContext('2d');
    const r = mulberry32(seed);
    const R = N / 2 - 0.5, cx = N / 2 - 0.5, cy = N / 2 - 0.5;
    const img = ctx.createImageData(N, N);
    const set = (x, y, col) => { if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255; };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > R) continue;
      if (d > R - 2.2) set(x, y, [18, 6, 8]);                     // outline
      else if (d > R - 3.6) set(x, y, [198, 204, 214]);            // grey rim shade
      else { const n = (r() - 0.5) * 8; set(x, y, [232 + n, 235 + n, 240 + n]); }
    }
    // veins: short branching squiggles from the rim inward
    const vc = [[196, 74, 90], [214, 112, 124]];
    const count = Math.round(9 * veins);
    for (let v = 0; v < count; v++) {
      const a = r() * Math.PI * 2; let x = cx + Math.cos(a) * (R - 3), y = cy + Math.sin(a) * (R - 3);
      let dir = a + Math.PI + (r() - 0.5) * 0.8; const len = 3 + Math.floor(r() * 4);
      for (let s = 0; s < len; s++) {
        set(Math.round(x), Math.round(y), vc[s % 2 === 0 ? 0 : 1]);
        if (r() < 0.35) { set(Math.round(x + Math.cos(dir + 1.4)), Math.round(y + Math.sin(dir + 1.4)), vc[1]); }
        x += Math.cos(dir); y += Math.sin(dir); dir += (r() - 0.5) * 1.1;
      }
    }
    ctx.putImageData(img, 0, 0);
    return tex(c, { nearest: true });
  });
}

/** Octagonal iris: black outline, blue with radial darkening, navy pupil. */
export function iris() {
  return memo('iris', () => {
    const N = 20; const c = canvas(N); const ctx = c.getContext('2d');
    const img = ctx.createImageData(N, N);
    const cx = N / 2 - 0.5, cy = N / 2 - 0.5, R = N / 2 - 0.5;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      const oct = Math.max(dx, dy, (dx + dy) * 0.72);  // octagon "radius"
      if (oct > R) continue;
      const i = (y * N + x) * 4; let col;
      const d = Math.hypot(x - cx, y - cy);
      if (oct > R - 1.6) col = [14, 18, 26];
      else if (d < 2.6) col = [16, 26, 40];
      else { const k = d / R; col = [Math.round(38 + 40 * k), Math.round(66 + 52 * k), Math.round(104 + 64 * k)]; }
      if (x === Math.round(cx - 3) && y === Math.round(cy - 3)) col = [150, 185, 220];
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return tex(c, { nearest: true });
  });
}

/** Soft grey shadow ring the iris casts on the eyeball (seen in reference around each iris). */
export function irisShadow() {
  return memo('irisShadow', () => {
    const N = 32; const c = canvas(N); const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(N / 2, N / 2, 4, N / 2, N / 2, N / 2);
    g.addColorStop(0, 'rgba(150,160,178,0.9)'); g.addColorStop(0.7, 'rgba(170,178,192,0.55)'); g.addColorStop(1, 'rgba(200,205,215,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, N, N);
    return tex(c);
  });
}

/** Roblox-style baseplate studs. */
export function studs(color = '#5aa845', size = 64, seed = 1) {
  return memo('studs' + color + size, () => {
    const c = canvas(size); const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, size, size);
    const r = mulberry32(seed);
    for (let i = 0; i < 160; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + r() * 0.03})`; ctx.fillRect(r() * size, r() * size, 2, 2); }
    const s = size / 2;
    for (const [x, y] of [[s / 2, s / 2], [s * 1.5, s / 2], [s / 2, s * 1.5], [s * 1.5, s * 1.5]]) {
      ctx.beginPath(); ctx.arc(x + 1, y + 1.5, s * 0.3, 0, 7); ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, s * 0.3, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x - 1, y - 1, s * 0.22, 0, 7); ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

export function noiseTex(base = '#888', amount = 30, size = 128, seed = 2, key = '') {
  return memo('noise' + base + amount + size + seed + key, () => {
    const c = canvas(size); const ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, size, size);
    const r = mulberry32(seed); const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) { const v = (r() - 0.5) * amount; img.data[i] += v; img.data[i + 1] += v; img.data[i + 2] += v; }
    ctx.putImageData(img, 0, 0);
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

export function planks(color = '#b07a48') {
  return memo('planks' + color, () => {
    const c = canvas(128); const ctx = c.getContext('2d'); const r = mulberry32(5);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
    for (let y = 0; y < 128; y += 16) {
      ctx.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; ctx.fillRect(0, y, 128, 16);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, y, 128, 1.5);
      const off = r() * 128; ctx.fillRect(off, y, 1.5, 16);
      for (let k = 0; k < 6; k++) { ctx.fillStyle = 'rgba(60,30,10,0.12)'; ctx.fillRect(r() * 128, y + 3 + r() * 10, 10 + r() * 30, 1); }
    }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

export function tiles(color = '#e8e2c9', line = '#b9b195', n = 4, key = '') {
  return memo('tiles' + color + line + n + key, () => {
    const c = canvas(128); const ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = line; ctx.lineWidth = 2;
    const s = 128 / n;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, 128); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(128, i * s); ctx.stroke(); }
    const r = mulberry32(9);
    for (let i = 0; i < 300; i++) { ctx.fillStyle = `rgba(0,0,0,${r() * 0.04})`; ctx.fillRect(r() * 128, r() * 128, 2, 2); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

/** Wallpaper with stripes (for the liminal rooms). */
export function wallpaper(a = '#e9dca0', b = '#e2d18c', key = '') {
  return memo('wp' + a + b + key, () => {
    const c = canvas(128); const ctx = c.getContext('2d');
    ctx.fillStyle = a; ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = b; for (let x = 0; x < 128; x += 32) ctx.fillRect(x, 0, 12, 128);
    const r = mulberry32(4);
    for (let i = 0; i < 70; i++) { ctx.fillStyle = `rgba(90,70,20,${r() * 0.07})`; ctx.fillRect(r() * 128, r() * 128, 3 + r() * 6, 3 + r() * 10); }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

/** Wall of tally marks for GOB's room. Thousands of days. */
export function tallyWall(seed = 1, density = 1) {
  return memo('tally' + seed + density, () => {
    const W = 512, H = 256; const c = canvas(W, H); const ctx = c.getContext('2d'); const r = mulberry32(seed);
    paintStucco(ctx, W, H, seed + 40, [96, 102, 116]);
    ctx.strokeStyle = 'rgba(25,22,30,0.85)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for (let y = 8; y < H - 14; y += 18) {
      let x = 6 + r() * 6;
      while (x < W - 24) {
        if (r() > density) { x += 22; continue; }
        const sk = (r() - 0.5) * 2;
        for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 3.6 + sk, y); ctx.lineTo(x + k * 3.6 - sk, y + 12); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(x - 2, y + 9); ctx.lineTo(x + 14, y + 3); ctx.stroke();
        x += 20 + r() * 3;
      }
    }
    const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  });
}

/** Text on a canvas (signs, notes, labels). Returns texture + aspect. */
export function textTexture(text, opts = {}) {
  const { font = '700 48px Fredoka, Trebuchet MS, sans-serif', color = '#222', bg = '#f4ecd2', border = '#7a5a33', pad = 24, w = 512, h = 256, lineH = 1.2, align = 'center', pixel = false } = opts;
  const key = 'txt' + text + JSON.stringify(opts);
  return memo(key, () => {
    const c = canvas(w, h); const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    if (border) { ctx.strokeStyle = border; ctx.lineWidth = 12; ctx.strokeRect(6, 6, w - 12, h - 12); }
    ctx.fillStyle = color; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
    const lines = String(text).split('\n');
    const size = parseInt(font.match(/(\d+)px/)[1], 10);
    const total = lines.length * size * lineH;
    lines.forEach((ln, i) => ctx.fillText(ln, align === 'center' ? w / 2 : pad, h / 2 - total / 2 + size * lineH * (i + 0.5)));
    const t = tex(c, { nearest: pixel });
    return t;
  });
}

/** Roblox-style overhead name: white text, dark outline, no background. */
export function overheadName(name, color = '#ffffff') {
  return memo('ohn' + name + color, () => {
    const c = canvas(256, 64); const ctx = c.getContext('2d');
    ctx.font = '700 40px "Source Sans Pro", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(name, 128, 34);
    ctx.fillStyle = color; ctx.fillText(name, 128, 34);
    return tex(c);
  });
}

/** Classic blocky smile decal for Kalo. */
export function smileFace() {
  return memo('smile', () => {
    const c = canvas(128); const ctx = c.getContext('2d');
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(46, 50, 7, 13, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(82, 50, 7, 13, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    ctx.beginPath(); ctx.arc(64, 66, 26, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();
    return tex(c);
  });
}

/** The copy's face: GOB tried to draw Kalo, but could only draw eyes like his own. */
export function copyFace() {
  return memo('copyface', () => {
    const c = canvas(128); const ctx = c.getContext('2d');
    const eye = (x, y, r) => {
      ctx.fillStyle = '#120507'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#e9ecf1'; ctx.beginPath(); ctx.arc(x, y, r - 3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#c45060'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { const a = i * 1.1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3)); ctx.lineTo(x + Math.cos(a + 0.2) * (r - 8), y + Math.sin(a + 0.2) * (r - 8)); ctx.stroke(); }
      ctx.fillStyle = '#2f5788'; ctx.beginPath(); ctx.arc(x + 1, y + 2, r * 0.38, 0, 7); ctx.fill();
      ctx.fillStyle = '#0e1622'; ctx.beginPath(); ctx.arc(x + 1, y + 2, r * 0.16, 0, 7); ctx.fill();
    };
    eye(42, 52, 17); eye(86, 46, 20);
    ctx.lineWidth = 4; ctx.strokeStyle = '#111'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(44, 92); ctx.quadraticCurveTo(64, 100, 86, 90); ctx.stroke(); // crooked smile, drawn by a cube
    return tex(c);
  });
}

/** A polaroid-like memory picture (used for collectibles in the world). */
export function polaroid(colorA, colorB, glyph) {
  return memo('pol' + colorA + colorB + glyph, () => {
    const c = canvas(128, 150); const ctx = c.getContext('2d');
    ctx.fillStyle = '#f6f2e7'; ctx.fillRect(0, 0, 128, 150);
    const g = ctx.createLinearGradient(0, 10, 0, 118); g.addColorStop(0, colorA); g.addColorStop(1, colorB);
    ctx.fillStyle = g; ctx.fillRect(10, 10, 108, 100);
    ctx.font = '54px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(glyph, 64, 62);
    return tex(c);
  });
}

export function radialGlow(color = '255,240,180') {
  return memo('glow' + color, () => {
    const c = canvas(64); const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${color},1)`); g.addColorStop(0.35, `rgba(${color},0.45)`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return tex(c);
  });
}

/** Animated film grain canvas drawn into the #fx-grain overlay. */
export function drawGrain(cnv) {
  const ctx = cnv.getContext('2d'); const img = ctx.createImageData(cnv.width, cnv.height);
  for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  ctx.putImageData(img, 0, 0);
}
