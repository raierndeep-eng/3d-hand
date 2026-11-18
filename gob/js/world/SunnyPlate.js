import * as THREE from 'three';
import * as T from '../render/Textures.js';
import { mulberry32 } from '../core/utils.js';

/**
 * GOB's home baseplate. The same place is visited three times:
 *  'happy'    — Chapter 1: saturated, flowers blooming, ducks, everything new.
 *  'grief'    — Chapter 4: grey, wilted, the fort flag torn, the spawn pad empty.
 *  'epilogue' — Chapter 7: dawn, a few colours coming back.
 * Returns handles to interactive parts and key positions.
 */
export const SP = {
  home: [0, -30], gobStart: [0, -24.5],
  beds: [[-9, -23], [9, -23], [-15, -30], [15, -30]],
  bedNames: ['Petunia', 'Sir Daisy', 'Marigold Jr.', 'Steve'],
  spawn: [0, 12], pond: [-32, 10], playground: [30, 8], fort: [-28, -16], hill: [38, -36], gate: [0, -70],
  hillTop: [38, 4.8, -36],
};

export function buildSunnyPlate(ch, variant = 'happy') {
  const b = ch.b, game = ch.game, physics = game.physics;
  const happy = variant === 'happy', grief = variant === 'grief', epi = variant === 'epilogue';
  const r = mulberry32(7);
  const H = {};

  const grass = happy ? '#62b34b' : grief ? '#6f7a62' : '#71964f';
  b.ground({ w: 320, d: 320, tex: T.studs(grass), rep: [160, 160], color: 0xffffff });

  // ---- Paths (flat tiles, just visual)
  const pathMat = b.mat(happy ? 0xe8d9a8 : grief ? 0xa9a597 : 0xd9cfae, { map: T.noiseTex('#ffffff', 25, 64, 3) });
  const path = (x1, z1, x2, z2, w = 3) => {
    const len = Math.hypot(x2 - x1, z2 - z1); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, len), pathMat);
    m.position.set((x1 + x2) / 2, 0.03, (z1 + z2) / 2); m.rotation.y = Math.atan2(x2 - x1, z2 - z1); m.receiveShadow = true; b.add(m);
  };
  path(0, -26, 0, 12); path(0, 0, 28, 6); path(0, 2, -28, 8); path(0, -10, -26, -16); path(0, -12, 34, -30); path(0, 12, 0, 40); path(0, -34, 0, -68);

  // ---- Boundary fence + outside scenery
  const F = 70, fcol = happy ? 0xffffff : grief ? 0xb8b8b8 : 0xeeeeee; // posts every 3 units keeps draw calls down
  b.fence(-F, -F, -4, -F, { color: fcol }); b.fence(4, -F, F, -F, { color: fcol });
  b.fence(F, -F, F, F, { color: fcol }); b.fence(-F, F, F, F, { color: fcol }); b.fence(-F, -F, -F, F, { color: fcol });
  // gate (closed)
  H.gateL = b.box({ x: -2, z: -F, w: 4, h: 2.2, d: 0.25, color: 0x8a5a33, map: T.planks('#8a5a33'), rep: [1, 1] });
  H.gateR = b.box({ x: 2, z: -F, w: 4, h: 2.2, d: 0.25, color: 0x8a5a33, map: T.planks('#8a5a33'), rep: [1, 1] });
  b.sign(6.5, -F + 1.2, 'PAST THE FENCE:\nnothing. (it’s all empty)', { w: 3.6, h: 1.4, font: '700 40px Fredoka, sans-serif' });
  // rolling blocky hills outside the fence
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2, d = 95 + r() * 40;
    const s = 10 + r() * 18;
    b.box({ x: Math.cos(a) * d, z: Math.sin(a) * d, w: s * 2, d: s * 2, h: 3 + r() * 9, color: happy ? 0x6cbf52 : grief ? 0x77806c : 0x86a865, collide: false, shadow: false });
  }
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2, d = 78 + r() * 30;
    b.tree(Math.cos(a) * d, Math.sin(a) * d, { s: 1.4 + r(), kind: r() < 0.5 ? 'pine' : 'round', collide: false, leaf: grief ? 0x6d7564 : null });
  }
  // the fair, far away to the east, unlit
  const fair = new THREE.Group(); fair.position.set(118, 0, 10);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(12, 0.5, 6, 24), b.mat(grief ? 0x6a6a6a : 0xd9d2c3)); wheel.position.y = 15; fair.add(wheel);
  for (let i = 0; i < 12; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.25, 24, 0.25), b.mat(0xbbbbbb)); sp.position.y = 15; sp.rotation.z = (i / 12) * Math.PI; fair.add(sp); }
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.6, 17, 0.6), b.mat(0x999999)); leg.position.set(sx * 3, 7.5, 0); leg.rotation.z = sx * 0.2; fair.add(leg); }
  fair.rotation.y = Math.PI / 2; b.add(fair); H.fairWheel = wheel;
  for (let i = 0; i < 3; i++) { const tent = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 8), b.mat([0xd94a5a, 0xf2c14e, 0x4a90d9][i])); tent.position.set(108 - i * 3, 2.5, -12 + i * 12); b.add(tent); }
  b.sign(F - 3, 2, 'FAIR →\n(closed)', { ry: -Math.PI / 2, w: 2.6, h: 1.3 });

  // ---- GOB's home
  b.house(SP.home[0], SP.home[1], { w: 7, d: 6, h: 4.2, wall: happy ? 0xdfe3ec : 0xb9bcc4, roof: 0x4a5369, door: 0xc43b4b });
  b.panel(0, 3.2, SP.home[1] + 3.05, 'GOB’S HOUSE', { w: 3, h: 0.6, bg: '#c43b4b', fg: '#ffffff', font: '700 64px Fredoka, sans-serif' });
  // mailbox (always empty)
  b.box({ x: 3.6, z: -26.4, w: 0.15, h: 1.1, d: 0.15, color: 0x555555 });
  H.mailbox = b.box({ x: 3.6, y: 1.1, z: -26.4, w: 0.6, h: 0.45, d: 0.9, color: 0x4a6fd9 });

  // ---- Flower beds
  const bloom = happy ? [0xff6b8a, 0xffd23f, 0xffffff, 0xc77dff] : grief ? [0x7a6a52, 0x6d6152, 0x8a7a62, 0x5e5446] : [0xff9ab0, 0x8a7a62, 0xffd23f, 0x7a6a52];
  H.beds = SP.beds.map(([x, z], i) => {
    b.box({ x, z, w: 3.4, h: 0.35, d: 2.2, color: 0x8a5a33, map: T.planks('#8a5a33'), rep: [2, 1] });
    b.box({ x, z, y: 0.35, w: 3.0, h: 0.06, d: 1.8, color: 0x5a3a22, collide: false });
    const flowers = new THREE.Group(); flowers.position.set(x, 0.4, z);
    for (let k = 0; k < 7; k++) {
      const fx = (k % 4) * 0.8 - 1.2 + (k > 3 ? 0.4 : 0), fz = k > 3 ? 0.45 : -0.35;
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), b.mat(grief ? 0x6b5e45 : 0x3d8a3a)); stem.position.set(fx, 0.3, fz);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), b.mat(bloom[i])); head.position.set(fx, grief ? 0.45 : 0.68, fz + (grief ? 0.15 : 0)); head.rotation.set(grief ? 0.8 : 0, k, 0.78);
      const mid = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), b.mat(0xffe066)); mid.position.copy(head.position); mid.position.y += 0.05; mid.visible = !grief;
      flowers.add(stem, head, mid);
    }
    flowers.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    b.add(flowers);
    b.sign(x, z + 1.6, SP.bedNames[i], { w: 1.6, h: 0.5, post: 0.3, font: '700 70px Fredoka, sans-serif', collide: false });
    return { pos: new THREE.Vector3(x, 0.5, z), flowers };
  });

  // ---- Spawn pad + players online board
  b.spawnPad(SP.spawn[0], SP.spawn[1]);
  b.sign(SP.spawn[0], SP.spawn[1] - 3.2, 'SPAWN', { w: 2.4, h: 0.8, post: 2.2, bg: '#dfe6f0', fg: '#4a5369', border: '#4a5369', collide: false });
  H.onlineBoard = (n) => {
    if (H._board) { b.group.remove(H._board); }
    H._board = b.panel(5.2, 2.4, SP.spawn[1] - 1.5, `PLAYERS ONLINE\n${n}`, { ry: -0.5, w: 2.6, h: 1.4, bg: '#1d2230', fg: n > 0 ? '#7ed957' : '#ff6b6b', font: '700 54px VT323, monospace', emissive: true });
  };
  b.box({ x: 5.2, z: SP.spawn[1] - 1.5, w: 0.2, h: 1.7, d: 0.2, color: 0x333333, collide: false });
  H.onlineBoard(0);

  // ---- Pond with ducks
  const [px, pz] = SP.pond;
  b.water(px, pz, 18, 13, { color: happy ? 0x4fb4e6 : grief ? 0x6c7f8a : 0x7fb0c8 });
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; b.rock(px + Math.cos(a) * 9.4, pz + Math.sin(a) * 7, 0.7 + r() * 0.4, grief ? 0x7c7f86 : 0x9aa0aa, 0, false); }
  // small island (memory spot)
  b.box({ x: px + 3, z: pz - 1, w: 3, h: 0.5, d: 2.6, color: happy ? 0x6cbf52 : 0x7c8a6c });
  H.ducks = [];
  if (!grief) for (let i = 0; i < 3; i++) {
    const d = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.5), b.mat(0xffffff)); body.position.y = 0.22; d.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), b.mat(0xffffff)); head.position.set(0.35, 0.55, 0); d.add(head);
    const beak = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.16), b.mat(0xffa531)); beak.position.set(0.56, 0.52, 0); d.add(beak);
    for (const sz of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), b.mat(0x111111)); e.position.set(0.45, 0.62, sz * 1.5); d.add(e); }
    d.scale.setScalar(i === 0 ? 1 : 0.6);
    b.add(d); H.ducks.push(d);
    const ph = i * 2.1, rad = 3 + i;
    b.onUpdate((dt, t) => { const a = t * 0.3 + ph; d.position.set(px - 2 + Math.cos(a) * rad, 0.03 + Math.sin(t * 3 + i) * 0.03, pz + Math.sin(a) * rad * 0.6); d.rotation.y = -a; });
  }

  // ---- Playground
  const [gx, gz] = SP.playground;
  b.box({ x: gx, z: gz, w: 16, h: 0.1, d: 12, color: happy ? 0xf2d49b : 0xb5ab95, collide: false });
  // slide: tower + stairs + slide board
  b.box({ x: gx - 3, z: gz, w: 2.4, h: 3.6, d: 2.4, color: happy ? 0xff6b6b : 0x9c7c7c });
  b.stairs(gx - 6.6, gz, { dir: [1, 0], steps: 4, w: 2, rise: 0.9, run: 0.9, color: happy ? 0xffd23f : 0xaaa080 });
  const slide = b.box({ x: gx + 0.6, y: 0, z: gz, w: 5, h: 0.25, d: 1.8, color: happy ? 0x4fc3f7 : 0x7b98a4, rz: 0.62, collide: false });
  slide.position.y = 1.8;
  // slide collision as small steps descending
  for (let i = 0; i < 6; i++) physics.addBox(gx - 1.2 + i * 0.7, (3.4 - i * 0.6) / 2, gz, 0.7, 3.4 - i * 0.6, 1.8);
  // swings
  const sw = new THREE.Group(); sw.position.set(gx + 4, 0, gz - 4);
  for (const sx of [-2.2, 2.2]) for (const sz of [-0.6, 0.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), b.mat(0x2d6cdf)); p.position.set(sx, 1.7, sz); sw.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.2, 0.2), b.mat(0x2d6cdf)); top.position.y = 3.4; sw.add(top);
  for (const s of [-1, 1]) {
    const seatG = new THREE.Group(); seatG.position.set(s, 3.4, 0);
    const ch1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.6, 0.04), b.mat(0xcccccc)); ch1.position.y = -1.3; seatG.add(ch1);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.1, 0.4), b.mat(0x333333)); seat.position.y = -2.6; seatG.add(seat);
    sw.add(seatG);
    b.onUpdate((dt, t) => { seatG.rotation.z = Math.sin(t * 1.6 + s) * (happy ? 0.25 : grief ? 0.05 : 0.12); });
  }
  sw.traverse((o) => { if (o.isMesh) o.castShadow = true; }); b.add(sw);
  physics.addBox(gx + 4, 1.7, gz - 4, 5, 3.4, 0.3, { noCamera: true });
  // jungle gym platforms
  b.box({ x: gx + 5, z: gz + 3.5, w: 3, h: 1.4, d: 3, color: happy ? 0x7ed957 : 0x8a9a7a });
  b.box({ x: gx + 2, z: gz + 4.5, w: 2, h: 2.6, d: 2, color: happy ? 0xc77dff : 0x8f8a9c });
  b.box({ x: gx - 1, z: gz + 4.5, w: 2, h: 3.6, d: 2, color: happy ? 0xffa531 : 0xa08f7a });
  // seesaw
  b.box({ x: gx - 4, z: gz - 4.5, w: 0.5, h: 0.6, d: 0.5, color: 0x666666 });
  const see = b.box({ x: gx - 4, y: 0.55, z: gz - 4.5, w: 5, h: 0.15, d: 0.7, color: happy ? 0xff6b6b : 0x8c7474, collide: false });
  b.onUpdate((dt, t) => { see.rotation.z = Math.sin(t * 1.2) * (happy ? 0.2 : 0.02); });
  b.sign(gx - 8.6, gz - 6, 'PLAYGROUND', { w: 2.8, h: 0.8, ry: 0.3 });

  // ---- Fort site
  const [fx, fz] = SP.fort;
  b.box({ x: fx, z: fz, w: 8, h: 0.3, d: 8, color: 0xa47448, map: T.planks('#a47448'), rep: [3, 3] });
  H.fortParts = [];
  const fortColors = [0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff, 0xffa531, 0xff8fb1, 0x5ad1c8];
  const fortLayout = [[-3, 0.3, -3, 2, 1.6, 2], [3, 0.3, -3, 2, 1.6, 2], [-3, 0.3, 3, 2, 1.6, 2], [3, 0.3, 3, 2, 1.6, 2], [0, 0.3, -3.5, 4, 1.2, 1], [-3.5, 0.3, 0, 1, 1.2, 4], [3.5, 0.3, 0, 1, 1.2, 4], [0, 1.9, -3, 8, 0.4, 2]];
  fortLayout.forEach(([x, y, z, w, h, d], i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), b.mat(grief ? new THREE.Color(fortColors[i]).lerp(new THREE.Color(0x888888), 0.7).getHex() : fortColors[i]));
    m.position.set(fx + x, y + h / 2, fz + z); m.castShadow = true; m.receiveShadow = true;
    m.userData.home = m.position.clone(); m.userData.box = [fx + x, y + h / 2, fz + z, w, h, d];
    m.visible = false; b.add(m); H.fortParts.push(m);
  });
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 0.15), b.mat(0xdddddd)); pole.position.set(fx, 2.5, fz); pole.visible = false; b.add(pole);
  const flagTex = T.textTexture(grief ? 'GOB +' : 'GOB + KALO', { bg: '#ffffff', color: '#c43b4b', border: '#c43b4b', font: '700 90px Fredoka, sans-serif', w: 512, h: 256 });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(grief ? 1.3 : 2.2, 1.1), new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide }));
  flag.position.set(fx + (grief ? 0.7 : 1.15), 4.4, fz); flag.visible = false; b.add(flag);
  b.onUpdate((dt, t) => { flag.rotation.y = Math.sin(t * 2) * 0.15; });
  H.fortPole = pole; H.fortFlag = flag;
  H.showFort = (on = true) => {
    for (const m of H.fortParts) { m.visible = on; if (on && !m.userData.col) { const [x, y, z, w, h, d] = m.userData.box; m.userData.col = physics.addBox(x, y, z, w, h, d); } }
    pole.visible = on; flag.visible = on;
  };

  // ---- The hill (terraces + stairs) with picnic spot
  const [hx, hz] = SP.hill;
  const hcol = happy ? [0x63b84c, 0x6cc155, 0x75ca5e, 0x7fd367] : grief ? [0x737d68, 0x78826d, 0x7d8772, 0x828c77] : [0x6da452, 0x76ad5a, 0x7fb662, 0x88bf6b];
  [[26, 1.2], [19, 2.4], [12, 3.6], [7, 4.8]].forEach(([s, h], i) => b.box({ x: hx, z: hz, w: s, d: s, h, color: hcol[i], map: T.studs('#ffffff', 64), rep: [s / 2, s / 2] }));
  // stairs up the south face
  // gentle steps on the south face: two 0.4 steps before each 1.2 terrace
  [[13, 0], [9.5, 1.2], [6, 2.4], [3.5, 3.6]].forEach(([e, f]) => {
    b.box({ x: hx - 1.5, z: hz + e + 0.3, w: 2.4, d: 0.6, h: f + 0.8, color: 0xd9cfae });
    b.box({ x: hx - 1.5, z: hz + e + 0.9, w: 2.4, d: 0.6, h: f + 0.4, color: 0xe4dbbd });
  });
  b.tree(hx + 1.5, hz - 1.5, { s: 1.3, kind: 'round', y: 4.8, leaf: grief ? 0x6f7864 : 0x4caf50 });
  H.blanket = b.box({ x: hx - 1, y: 4.8, z: hz + 1.2, w: 3, h: 0.04, d: 2.4, color: 0xd94a5a, map: T.tiles('#d94a5a', '#ffffff', 4, 'blanket'), rep: [1, 1], collide: false });
  H.basket = b.box({ x: hx - 2.2, y: 4.8, z: hz + 0.4, w: 0.8, h: 0.5, d: 0.6, color: 0xb07a48, map: T.planks('#b07a48'), rep: [1, 1] });

  // ---- Trees, bushes, benches, lamps, clouds
  const treeSpots = [[-20, -40], [-40, -30], [-50, -10], [-45, 25], [-20, 35], [15, 35], [45, 30], [55, 5], [55, -15], [20, -45], [-55, -50], [50, 50], [-50, 50], [-10, 50], [25, -12], [-15, -8], [60, -55], [-60, 0], [10, 55], [-35, -55]];
  treeSpots.forEach(([x, z], i) => b.tree(x, z, { s: 1 + r() * 0.5, kind: i % 4 === 0 ? 'pine' : 'round', leaf: grief ? 0x6d7564 : epi ? null : null, trunk: grief ? 0x6a5a4a : 0x8a5a33 }));
  b.bench(-6, 6, Math.PI / 2); b.bench(6, -6, -Math.PI / 2); b.bench(-24, 18, 0);
  H.lamps = [[-3, 0], [3, 20], [-3, -14], [14, 4], [-14, 6]].map(([x, z]) => b.lamp(x, z, { on: !happy }));
  if (!grief) for (let i = 0; i < 14; i++) b.cloud(-200 + r() * 400, 40 + r() * 25, -150 + r() * 300, 1.2 + r() * 1.5, 0.6 + r());
  else for (let i = 0; i < 10; i++) b.cloud(-200 + r() * 400, 35 + r() * 15, -150 + r() * 300, 2.5, 0.3, 0x9a9da3);

  // Flowers + grass everywhere (fewer, browner when grieving)
  const avoid = (x, z) => Math.abs(x) < 2.5 || (Math.hypot(x - px, (z - pz) * 1.35) < 11) || (Math.abs(x - gx) < 9 && Math.abs(z - gz) < 7) || (Math.abs(x - hx) < 14 && Math.abs(z - hz) < 14) || (Math.abs(x - fx) < 5 && Math.abs(z - fz) < 5);
  b.scatter(happy ? 700 : grief ? 120 : 380, [-66, -66, 66, 66], { avoid, colors: happy ? undefined : grief ? [0x7a6a52, 0x8a8070] : [0xff9ab0, 0xffd23f, 0xffffff, 0x8a8070] });
  b.scatter(1600, [-66, -66, 66, 66], { kind: 'grass', avoid, colors: happy ? [0x4c9a3a, 0x5fb04a, 0x3f8a32] : grief ? [0x6a705c, 0x5e6452, 0x787a66] : [0x5c8a44, 0x6a9a50] });

  // Crate stack parkour to a secret (memory m1c) in the north-west corner
  const cx = -58, cz = -58;
  [[0, 0, 1.2], [2.4, 0, 2.4], [4.2, 2.2, 3.6], [2.0, 4.4, 4.8], [-0.4, 4.6, 6.0]].forEach(([ox, oz, h], i) => b.box({ x: cx + ox, z: cz + oz, w: 1.8, d: 1.8, h, color: 0xb07a48, map: T.planks('#b07a48'), rep: [1, Math.max(1, h / 1.2)] }));
  b.box({ x: cx - 0.4, y: 6.0, z: cz + 4.6 + 2.2, w: 2.6, d: 2.6, h: 0.3, color: 0x8a5a33 });

  // Ambient tiny butterflies in happy variant
  if (happy || epi) {
    for (let i = 0; i < 10; i++) {
      const bf = new THREE.Group(); const col = [0xffd23f, 0xff8fb1, 0x8fd3ff, 0xffffff][i % 4];
      const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.18), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); wl.position.x = -0.1; bf.add(wl);
      const wr = wl.clone(); wr.position.x = 0.1; bf.add(wr);
      b.add(bf);
      const cx2 = -40 + r() * 80, cz2 = -40 + r() * 80, ph = r() * 10;
      b.onUpdate((dt, t) => {
        bf.position.set(cx2 + Math.sin(t * 0.4 + ph) * 6, 1.2 + Math.sin(t * 1.7 + ph) * 0.5, cz2 + Math.cos(t * 0.33 + ph) * 6);
        const f = Math.sin(t * 22 + ph) * 1.1; wl.rotation.y = f; wr.rotation.y = -f; bf.rotation.y = t * 0.4 + ph;
      });
    }
  }
  return H;
}
