import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import * as T from '../render/Textures.js';
import { mulberry32, dist2 } from '../core/utils.js';

/**
 * CHAPTER THREE — PAST THE FENCE
 * The abandoned places outside GOB's world. Notes from people who left. Kalo's old house.
 * A radio tower that nobody answers. Then the "cleanup" starts, the ground falls away,
 * and Kalo doesn't make it back.
 */
const TILE = 8;
const TOWER = { x: 0, z: -162 };
const KHOUSE = [32, -78];

export default class Chapter3 extends ChapterBase {
  async build(progress) {
    const b = this.b, g = this.game, r = mulberry32(31);
    this.mood('overcast', 0);
    g.physics.killY = -30;
    g.sfx.setAmbience({ wind: 0.6 });
    // ---------------- GOB's side (south of the fence): static
    b.ground({ x: 0, z: 40, w: 160, d: 80, tex: T.studs('#62b34b'), rep: [80, 40] });
    b.scatter(300, [-60, 2, 60, 60], { avoid: (x, z) => Math.abs(x) < 3 });
    b.scatter(600, [-60, 2, 60, 60], { kind: 'grass', colors: [0x4c9a3a, 0x5fb04a] });
    b.fence(-60, 0, -2.5, 0, { color: 0xffffff }); b.fence(2.5, 0, 60, 0, { color: 0xffffff });
    this.gateL = b.box({ x: -1.25, z: 0, w: 2.5, h: 2.2, d: 0.25, color: 0x8a5a33, map: T.planks('#8a5a33'), rep: [1, 1] });
    this.gateR = b.box({ x: 1.25, z: 0, w: 2.5, h: 2.2, d: 0.25, color: 0x8a5a33, map: T.planks('#8a5a33'), rep: [1, 1] });
    for (const [x, z] of [[-20, 14], [18, 10], [-36, 26], [30, 30]]) b.tree(x, z, { s: 1.2 });
    b.house(0, 30, { wall: 0xdfe3ec, roof: 0x4a5369, door: 0xc43b4b });

    // ---------------- Old world: tiles that can fall
    this.tiles = [];
    const gridMat = b.mat(0xffffff, { map: T.studs('#8b9099', 64) });
    const roadMat = b.mat(0x4f535a, { map: T.noiseTex('#4f535a', 18, 64, 8) });
    const addTile = (cx, cz, w, d, mat, thick = 3) => {
      const grp = new THREE.Group(); b.add(grp);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), mat); m.position.set(cx, -thick / 2, cz); m.receiveShadow = true; grp.add(m);
      if (mat === gridMat) { const tx = mat.map.clone(); tx.needsUpdate = true; tx.repeat.set(w / 2, d / 2); m.material = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.85 }); }
      const col = g.physics.addBox(cx, -thick / 2, cz, w, thick, d);
      const t = { grp, cols: [col], cx, cz, w, d, fallen: false, vy: 0 };
      this.tiles.push(t); return t;
    };
    // town + Kalo's neighbourhood
    for (let zz = -TILE / 2; zz > -96; zz -= TILE) for (let xx = -52; xx <= 52; xx += TILE) addTile(xx, zz, TILE, TILE, Math.abs(xx) <= 4 ? roadMat : gridMat);
    // bridge
    for (let zz = -100; zz > -132; zz -= 4) addTile(0, zz, 4, 4, b.mat(0x8a6a4a, { map: T.planks('#8a6a4a') }), 0.6);
    // tower plaza
    for (let zz = -136; zz > -184; zz -= TILE) for (let xx = -16; xx <= 16; xx += TILE) addTile(xx, zz, TILE, TILE, gridMat);
    await progress(0.25);

    // Helper: anything built inside fn belongs to the tile under (x,z) and falls with it.
    this.onTile = (x, z, fn) => {
      const t = this.tileAt(x, z);
      const nC = g.physics.colliders.length, nW = g.world.children.length;
      const res = fn();
      if (t) {
        for (const c of g.physics.colliders.slice(nC)) t.cols.push(c);
        for (const o of g.world.children.slice(nW)) t.grp.attach(o);
      }
      return res;
    };

    // Road markings
    for (let zz = -8; zz > -94; zz -= 6) this.onTile(0, zz, () => b.box({ x: 0, z: zz, w: 0.3, h: 0.04, d: 2.5, color: 0xd8d2a0, collide: false }));

    // ---------------- Old town buildings
    const faded = [0xc9a9a6, 0xa9b8c9, 0xc9c3a6, 0xa6c9b0, 0xb9a9c9, 0xc2c2c2];
    const shops = [
      [-14, -16, 'PIZZA PLACE', 7, 6, 5], [14, -18, 'ROLEPLAY HQ', 8, 6, 7], [-16, -36, 'OBBY SHOP', 7, 7, 4.5],
      [16, -40, 'HANGOUT CAFÉ', 8, 7, 5], [-30, -24, 'TYCOON', 7, 8, 6], [-34, -50, 'SCHOOL RP', 10, 8, 7], [30, -24, 'BANK', 7, 7, 8], [-14, -62, 'PET SHOP', 7, 6, 4],
    ];
    shops.forEach(([x, z, name, w, d, h], i) => this.onTile(x, z, () => {
      b.box({ x, z, w, d, h, color: faded[i % faded.length] });
      b.box({ x, y: h, z, w: w + 0.4, d: d + 0.4, h: 0.4, color: 0x8c8f96, collide: false });
      const face = x < 0 ? Math.PI / 2 : -Math.PI / 2, fx = x + (x < 0 ? w / 2 + 0.02 : -w / 2 - 0.02);
      b.panel(fx, h * 0.72, z, name, { ry: face, w: Math.min(d - 0.6, 6), h: 0.9, bg: '#d9d4c7', fg: '#5a5650', font: '700 70px Fredoka, sans-serif' });
      b.panel(fx + (x < 0 ? 0.01 : -0.01), 1.1, z, 'CLOSED', { ry: face, w: 1.6, h: 0.6, bg: '#e8e2d2', fg: '#a33', font: '700 80px Fredoka, sans-serif', border: '#a33' });
      for (const wz of [-d * 0.3, d * 0.3]) b.box({ x: fx, y: 1.2, z: z + wz, w: 0.1, h: 1.4, d: 1.4, color: 0x2a2e36, collide: false });
    }));
    // cars, benches, dead trees, lamp posts, a dry fountain
    for (const [x, z, c] of [[-7, -30, 0x9a6a6a], [7, -54, 0x6a7f9a], [-7, -72, 0x8a8a6a]]) this.onTile(x, z, () => { b.box({ x, z, w: 2, h: 0.9, d: 4, color: c, y: 0.3 }); b.box({ x, y: 1.2, z: z - 0.3, w: 1.8, h: 0.7, d: 2.2, color: 0x3a3e46, collide: false }); for (const wx of [-0.9, 0.9]) for (const wz of [-1.3, 1.3]) b.cyl({ x: x + wx, y: 0, z: z + wz, r: 0.35, h: 0.3, color: 0x222222, collide: false }); });
    for (const [x, z] of [[-24, -8], [24, -12], [-40, -40], [40, -56], [-24, -80], [6, -88]]) this.onTile(x, z, () => b.tree(x, z, { kind: 'dead', trunk: 0x5d554e }));
    for (const z of [-12, -36, -60, -84]) for (const x of [-5, 5]) this.onTile(x, z, () => b.lamp(x, z, { on: false }));
    this.onTile(-24, -46, () => { b.cyl({ x: -24, z: -46, r: 3, h: 0.8, color: 0x9a9fa8 }); b.cyl({ x: -24, y: 0.8, z: -46, r: 0.5, h: 2.2, color: 0x9a9fa8 }); });
    await progress(0.45);

    // ---------------- Notes (environmental storytelling)
    this.notes = [
      { pos: [-8.6, 0, -12.5], title: 'A note taped to the pizza place', lines: ['L: “brb”', 'N: The tape is yellow and brittle. The date on it is from years ago.', 'K: ...brb.', 'K: they didn’t b r b.'] },
      { pos: [9, 0, -30], title: 'A bulletin board', lines: ['L: “SERVERS CLOSE FRIDAY. THANKS FOR PLAYING! WE HAD A GREAT TIME :)”', 'N: Underneath, scratched into the wood with something sharp: “i didn’t”.', 'G: ...', 'K: somebody stayed after everyone left.', 'G: like us?', 'K: ...yeah. like us.'] },
      { pos: [-24, 0, -42], title: 'Chalk on the ground', lines: ['L: “MAX + JO + SAM WERE HERE. BEST FRIENDS 4EVER”', 'N: Three stick figures holding hands. The rain has washed one of them almost away.', 'K: i wonder where max and jo and sam went.', 'G: maybe they’re still best friends somewhere else.', 'K: maybe.'] },
      { pos: [10, 0, -66], title: 'A sign on a lamp post', lines: ['L: “anyone online?? meet at the fountain”', 'L: (another handwriting) “i’m here”', 'L: (the first handwriting) “where”', 'L: (nothing else)', 'K: ...', 'K: ok that one’s actually sad.'] },
    ];
    for (const n of this.notes) this.onTile(n.pos[0], n.pos[2], () => {
      b.box({ x: n.pos[0], z: n.pos[2], w: 1.4, h: 1.6, d: 0.2, color: 0x7a6a5a });
      b.panel(n.pos[0], 1.25, n.pos[2] + 0.11, '!', { w: 0.8, h: 0.6, bg: '#f2ead5', fg: '#7a6a5a', font: '700 120px Fredoka, sans-serif' });
    });

    // ---------------- Kalo's old house (yellow, faded)
    const [kx, kz] = KHOUSE;
    this.onTile(kx, kz, () => {
      b.house(kx, kz, { w: 7, d: 6, h: 4, wall: 0xd8c983, roof: 0x9a8a4a, door: 0x6a5a3a, ry: -Math.PI / 2 });
      b.box({ x: kx - 6, z: kz + 3, w: 0.15, h: 1.1, d: 0.15, color: 0x555555 });
      b.box({ x: kx - 6, y: 1.1, z: kz + 3, w: 0.9, h: 0.5, d: 0.6, color: 0xd9c040 });
      b.sign(kx - 5, kz - 4, 'KALO’S HOUSE\nno noobs (jk)', { ry: -Math.PI / 2, w: 2.8, h: 1.2, bg: '#efe2a6', font: '700 50px Fredoka, sans-serif' });
    });
    await progress(0.6);

    // ---------------- Radio tower
    const { x: tx, z: tz } = TOWER;
    this.towerParts = [];
    this.onTile(tx, tz, () => {
      b.box({ x: tx, z: tz, w: 2.2, d: 2.2, h: 19, color: 0x6d737d });
      this.spiral = [];
      for (let i = 0; i < 15; i++) {
        const a = i * 0.72, rr = 3.5;
        const px = tx + Math.cos(a) * rr, pz = tz + Math.sin(a) * rr, py = 1.2 * (i + 1) - 0.4;
        b.box({ x: px, y: py, z: pz, w: 2.2, d: 2.2, h: 0.4, color: i % 2 ? 0xa3a8b0 : 0x8b9099 });
        this.spiral.push(new THREE.Vector3(px, py + 0.4, pz));
      }
      b.box({ x: tx, y: 19, z: tz, w: 7, d: 7, h: 0.4, color: 0x8b9099 });
      b.fence(tx - 3.4, tz - 3.4, tx + 3.4, tz - 3.4, { y: 19.4, color: 0xa3a8b0, h: 1 });
      b.fence(tx - 3.4, tz + 3.4, tx - 1, tz + 3.4, { y: 19.4, color: 0xa3a8b0, h: 1 }); b.fence(tx + 3.4, tz - 3.4, tx + 3.4, tz + 3.4, { y: 19.4, color: 0xa3a8b0, h: 1 });
      b.box({ x: tx, y: 19.4, z: tz, w: 0.6, d: 0.6, h: 14, color: 0x5c6470, collide: false });
      b.box({ x: tx, y: 30, z: tz, w: 5, d: 0.3, h: 0.3, color: 0x5c6470, collide: false });
      b.box({ x: tx, y: 26, z: tz, w: 3.5, d: 0.3, h: 0.3, color: 0x5c6470, collide: false });
      // radio console
      b.box({ x: tx - 1.5, y: 19.4, z: tz - 2.2, w: 2, d: 1, h: 1.1, color: 0x3a4048 });
      this.radioLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.1), new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0xff3333, emissiveIntensity: 0.2 }));
      this.radioLight.position.set(tx - 1.0, 20.25, tz - 1.68); b.add(this.radioLight);
      b.panel(tx - 1.5, 20.3, tz - 1.69, 'RADIO', { w: 1, h: 0.3, bg: '#22262c', fg: '#9fd0ff', font: '700 90px VT323, monospace' });
    });
    this.towerTop = new THREE.Vector3(tx - 1.5, 19.4, tz - 0.8);
    this.towerBlink = b.pointLight(tx, 33, tz, 0xff3333, 0, 40);

    // Distant ruins to sell the scale
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = 120 + r() * 120;
      b.box({ x: Math.cos(a) * d, z: -80 + Math.sin(a) * d, y: -20 + r() * 10, w: 6 + r() * 14, d: 6 + r() * 14, h: 10 + r() * 30, color: 0x7d838c, collide: false, shadow: false });
    }
    await progress(0.85);

    // Kalo + GOB
    g.spawnKalo(); this.kalo.model.root.visible = false; this.kalo.active = false;
    this.gob.setPosition(0, null, 12, Math.PI);
    g.hud.playersOnline(0);
    this.found = 0;
    await progress(1);
  }

  tileAt(x, z) { return this.tiles.find((t) => Math.abs(x - t.cx) <= t.w / 2 && Math.abs(z - t.cz) <= t.d / 2); }

  memorySpots() {
    return [
      { id: 'm3a', pos: [12, 0, -26] },
      { id: 'm3b', pos: [KHOUSE[0] - 7, 0, KHOUSE[1] + 3] },
      { id: 'm3c', pos: [TOWER.x + 2, 19.4, TOWER.z + 2] },
    ];
  }

  openGate(instant = false) {
    const L = this.gateL, R = this.gateR;
    L.userData.collider.enabled = false; R.userData.collider.enabled = false;
    if (instant) { L.position.x = -2.4; L.rotation.y = -1.4; R.position.x = 2.4; R.rotation.y = 1.4; return Promise.resolve(); }
    return this.anim(1.4, (k) => { L.rotation.y = -1.4 * k; L.position.x = -1.25 - 1.15 * k; L.position.z = k * -1.2; R.rotation.y = 1.4 * k; R.position.x = 1.25 + 1.15 * k; R.position.z = k * -1.2; });
  }

  restore(beat) {
    if (beat >= 1) { this.openGate(true); this.kalo.model.root.visible = true; this.kalo.active = true; this.kalo.follow(); this.game.hud.playersOnline(1); }
    if (beat >= 4) { this.mood('storm', 0); this.game.fx.setRain(1); this.music('storm', 0.5); }
    if (beat >= 5) { for (const t of this.tiles) if (t.cz < -20) this.dropTile(t, true); }
  }

  beats() {
    return [
      { id: 'gate', run: () => this.gate() },
      { id: 'town', at: { gob: [0, -6, Math.PI], kalo: [2, -5] }, run: () => this.town() },
      { id: 'house', at: { gob: [0, -70, Math.PI], kalo: [2, -69] }, run: () => this.kaloHouse() },
      { id: 'tower', at: { gob: [0, -92, Math.PI], kalo: [2, -91] }, run: () => this.tower() },
      { id: 'collapse', at: { gob: [0, -146, 0], kalo: [2, -144] }, run: () => this.collapse() },
      { id: 'death', at: { gob: [0, -14, 0], kalo: [1.5, -12] }, run: () => this.death() },
    ];
  }

  update(dt, t) {
    super.update(dt, t);
    for (const tl of this.tiles) {
      if (!tl.fallen || tl.gone) continue;
      tl.vy -= 14 * dt; tl.grp.position.y += tl.vy * dt; tl.grp.rotation.x += tl.spin * dt; tl.grp.rotation.z += tl.spin * 0.5 * dt;
      if (tl.grp.position.y < -60) { tl.gone = true; tl.grp.visible = false; }
    }
    if (this.wave !== undefined && this.waveOn) {
      this.wave += this.waveSpeed * dt;
      for (const tl of this.tiles) if (!tl.fallen && tl.cz < this.wave && tl.cz < -18) {
        this.dropTile(tl);
        if (Math.random() < 0.3) this.sfx('crash', { pos: new THREE.Vector3(tl.cx, 0, tl.cz), vol: 0.5 });
      }
      // respawn ahead of the wave
      this.gob.respawnPoint = new THREE.Vector3(0, 0, Math.min(-20, this.wave + 22));
      if (this.kalo && this.kalo.pos.z < this.wave + 2) this.kalo.teleport(0.5, 0, Math.min(-18, this.gob.body.pos.z + 3));
    }
    if (this.towerBlink) this.towerBlink.intensity = Math.sin(t * 3) > 0.7 ? 30 : 0;
  }

  dropTile(t, instant = false) {
    t.fallen = true; for (const c of t.cols) c.enabled = false;
    t.vy = -2 - Math.random() * 3; t.spin = (Math.random() - 0.5) * 0.8;
    if (instant) { t.gone = true; t.grp.visible = false; }
  }

  // ------------------------------------------------------------------
  async gate() {
    const g = this.game;
    await this.cutIn();
    this.camSet([6, 3, 18], [0, 1.5, 0]);
    await this.titleCard('CHAPTER THREE', 'Past the Fence', 'The old places, where everyone left.');
    await this.gobClose(3, 0.4, 1.5);
    await this.say(['G: same place.', 'G: tomorrow.', 'G: ...', 'G: he’s a little late.']);
    await this.wait(2.5);
    this.sfx('chime'); this.chat('Kalo joined the game.', 'sys'); g.hud.playersOnline(1);
    const k = this.kalo; k.model.root.visible = true; k.active = true; k.teleport(-3, null, 10, Math.PI / 2);
    this.sfx('spawn'); g.fx.sparkle(new THREE.Vector3(-3, 1.5, 10));
    await this.wait(1);
    k.faceGob(); this.faceEachOther();
    await this.twoShot(1, 6, 2, 1);
    await this.say([
      'K: hey gobby. sorry. i’m late.',
      'G: you came.',
      'K: yeah. i didn’t sleep much. my parents were kinda... loud. it’s fine.',
      'K: it’s FINE. today’s gonna be cool. the tower!',
      'G: are you sure you’re okay?',
      'K: i’m always okay. that’s my thing. come on.',
    ]);
    this.cutOut();
    k.follow();
    this.objective('Open the gate');
    await this.use([0, 0.5, 1], 'Open the gate', 2.6);
    this.sfx('creak');
    await this.cutIn();
    this.camSet([0, 2.5, 7], [0, 1.2, -10]);
    await this.openGate();
    this.mood('overcast', 2);
    await this.cam([0, 6, 4], [0, 2, -40], 3);
    await this.say(['G: ...', 'G: it’s so grey.', 'K: yeah. that’s what it looks like when everyone leaves.', 'K: stay close, ok?']);
    this.cutOut();
    this.music('old', 3);
  }

  async town() {
    const k = this.kalo;
    k.follow();
    this.objective('Look around the old town', '0/4 notes');
    const left = [0, 1, 2, 3]; let n = 0;
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const i of left) { const sp = this.notes[i].pos; const d = dist2(sp[0], sp[2], p.x, p.z); if (d < bd) { bd = d; best = v3([sp[0], 0.5, sp[2] + 0.6]); } } return best || p; }, 2.6);
    while (left.length) {
      const idx = await this.useAny(left.map((i) => ({ pos: [this.notes[i].pos[0], 0.5, this.notes[i].pos[2] + 0.8], label: `Read: ${this.notes[i].title}`, radius: 2.6 })));
      const note = this.notes[left.splice(idx, 1)[0]];
      this.sfx('page');
      if (k.pos.distanceTo(this.gob.body.pos) > 6) k.teleport(this.gob.body.pos.x + 1.5, null, this.gob.body.pos.z + 1.5);
      await this.say(note.lines);
      n++; this.progress(`${n}/4 notes`);
    }
    this.unmark();
    await this.say(['K: ...', 'K: my old house is around here. wanna see?', 'G: yes. please.']);
  }

  async kaloHouse() {
    const k = this.kalo, [kx, kz] = KHOUSE;
    this.objective('Visit Kalo’s old house');
    await this.reach([kx - 7, 0, kz], 5);
    await this.cutIn();
    k.teleport(kx - 6.5, null, kz + 1.5); k.idle(); k.face(v3([kx, 0, kz]));
    this.gob.setPosition(kx - 8.5, null, kz + 0.5, Math.PI / 2);
    this.camSet([kx - 13, 3, kz + 4], [kx - 2, 2, kz]);
    await this.say([
      'K: this was mine.',
      'K: i picked yellow for the walls. obviously.',
      'K: i had a whole room. and a pet. it was a rock with a hat.',
      'G: what was its name?',
      'K: rock.',
      'G: good name.',
    ]);
    k.lookAt(v3([kx - 6, 1.3, kz + 3]));
    await this.cam([kx - 9.5, 2.2, kz + 6], [kx - 6, 1.2, kz + 3], 2);
    await this.say([
      'N: The yellow mailbox is stuffed full. Every letter is addressed to a different friend.',
      'N: Every letter is stamped: RECIPIENT NOT FOUND.',
      'K: i kept writing to people. after everyone left.',
      'K: i thought maybe they’d check their mail sometime. like, out of nowhere.',
      'K: they never did.',
      'G: ...',
      'G: i check my mailbox every morning.',
      'K: yeah?',
      'G: there’s never anything in it either.',
      'K: ...',
      'K: ok. tomorrow i’m writing you a letter. a real one.',
      'G: you can just tell me things.',
      'K: it’s not the same. you can keep a letter.',
    ]);
    k.lookAt(null);
    this.cutOut();
    k.follow();
  }

  async tower() {
    const g = this.game, k = this.kalo;
    this.objective('Cross the bridge to the radio tower');
    await this.reach([0, 0, -136], 6);
    await this.say(['K: whoa, don’t look down.', 'G: there’s no down. there’s just... nothing.', 'K: yeah. that’s what i meant.']);
    this.objective('Climb the radio tower');
    k.idle(); k.teleport(TOWER.x + 4, null, TOWER.z + 6); k.faceGob();
    this.mark(this.towerTop, 2);
    this.say(['K: race you up! (i’m taking the ladder)'], { lock: false });
    await this.until(() => this.gob.body.pos.y > 18.5 && dist2(this.gob.body.pos.x, this.gob.body.pos.z, TOWER.x, TOWER.z) < 5);
    this.unmark();
    k.teleport(TOWER.x + 1.8, 19.4, TOWER.z + 1); k.faceGob();
    this.objective('Use the radio');
    await this.use([TOWER.x - 1.5, 19.8, TOWER.z - 1.5], 'Use the radio', 2.4);
    this.objective(null);
    await this.cutIn();
    this.radioLight.material.emissiveIntensity = 2; this.radioLight.material.emissive.set(0x33ff66);
    k.teleport(TOWER.x - 0.4, 19.4, TOWER.z - 0.6, Math.PI); k.idle();
    this.gob.setPosition(TOWER.x - 2.4, 19.4, TOWER.z - 0.4, Math.PI);
    this.camSet([TOWER.x + 1, 21.5, TOWER.z + 4], [TOWER.x - 1.4, 20, TOWER.z - 1.4]);
    this.sfx('radio'); g.sfx.setAmbience({ wind: 0.8, static: 1 });
    this.music(null, 2);
    await this.say([
      'K: ok. ok. it’s on.',
      'K: hello? is anyone out there?',
      'K: this is Kalo. and Gob. we’re at the radio tower. past the grey town.',
      'K: if anyone’s still online... we’re here. you can come hang out. there’s a fair and everything.',
      { wait: 2 },
      'N: Static.',
      'K: hello?',
      { wait: 2 },
      'N: Static.',
      'G: kalo...',
      'K: one more. hello? anyone? please?',
      { wait: 3 },
      'N: Nobody answers.',
    ]);
    g.sfx.setAmbience({ wind: 0.8 });
    k.pose('sad');
    await this.twoShot(-1, 4, 1.2, 1.2);
    await this.say([
      'K: ...',
      'K: i really thought someone would answer.',
      'G: someone did.',
      'K: what? who?',
      'G: me. i was here. i heard you.',
      'K: ...',
      'K: you’re kinda the best, you know that?',
      () => this.gob.model.emote('happy', 1),
    ]);
    k.pose(null);
    // The cleanup begins
    this.sfx('thunder'); g.cameraCtl.shake(0.3, 1);
    this.mood('storm', 4); g.fx.setRain(0.8); g.sfx.setAmbience({ wind: 1, rain: 1 });
    await this.wait(1.5);
    this.sfx('blipSys'); this.chat('[Server] Cleaning up unused places...', 'server');
    this.sfx('rumble');
    await this.cam([TOWER.x + 12, 26, TOWER.z + 30], [0, 0, -60], 2);
    // distant tiles start falling for drama
    const far = this.tiles.filter((t) => t.cz < -40 && t.cz > -96 && Math.abs(t.cx) > 20).slice(0, 18);
    for (const t of far) { this.dropTile(t); await this.wait(0.12); }
    this.sfx('crash');
    await this.say(['K: ...is the ground FALLING?', 'G: “cleanup”. it said cleanup last night. i didn’t know what it meant.', 'K: it means we need to GO. NOW.']);
    this.cutOut();
  }

  async collapse() {
    const g = this.game, k = this.kalo;
    this.music('storm', 0.5);
    this.mood('storm', 0); g.fx.setRain(1); g.sfx.setAmbience({ wind: 1, rain: 1 });
    // Skip the climb down.
    await this.game.fade(true, 0.4);
    this.gob.setPosition(0, null, -144, 0); k.teleport(1.5, null, -142, 0);
    g.cameraCtl.setBehind(0); g.cameraCtl.snap();
    await this.game.fade(false, 0.4);
    this.objective('RUN! Get back to the fence!');
    this.mark([0, 0, -6], 2);
    this.wave = -190; this.waveSpeed = 5.6; this.waveOn = true;
    k.runSpeed = 6.9; k.goto(0, -14, { run: true });
    let shout = 0; const shouts = ['Kalo: RUN GOBBY', 'Kalo: dont look back!!', 'Kalo: almost there!!', 'Kalo: keep going!!!'];
    await this.until(() => {
      if (this.wave > -160 + shout * 40 && shout < shouts.length) { this.chat(shouts[shout++], 'kalo-chat'); g.cameraCtl.shake(0.15, 0.5); this.sfx('rumble', { vol: 0.6 }); }
      if (k.mode === 'idle') { k.goto(0, -14, { run: true }); }
      return this.gob.body.pos.z > -18 && this.gob.body.onGround;
    });
    this.unmark();
    this.waveOn = false;
  }

  async death() {
    const g = this.game, k = this.kalo;
    this.waveOn = false; this.objective(null);
    this.mood('storm', 0); g.fx.setRain(1); g.sfx.setAmbience({ wind: 1, rain: 1 });
    await this.cutIn();
    // positions
    this.gob.setPosition(0, null, -12, 0); k.active = true; k.physics = true; k.idle(); k.teleport(0.9, null, -15, 0);
    this.camSet([6, 2.5, -4], [0, 1.2, -13]);
    await this.wait(0.6);
    await this.say(['K: we made it! the fence! we’re—']);
    // the falling block
    const block = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), new THREE.MeshStandardMaterial({ color: 0x5c6470, roughness: 0.9 }));
    block.castShadow = true; block.position.set(0.3, 40, -12.5); g.world.add(block);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.set(0.3, 0.05, -12.5); g.world.add(shadow);
    this.sfx('whoosh'); this.sfx('rumble');
    k.lookAt(v3([0, 30, -12])); this.gob.model.emote('lookUp', 2);
    await this.anim(0.9, (t) => { shadow.material.opacity = t * 0.6; block.position.y = 40 - t * 14; });
    k.lookAt(null); k.faceGob();
    // Kalo pushes GOB clear — slow motion
    this.music(null, 0.3);
    g.audio.muffle(0.8, 0.3);
    k.pose('push'); this.sfx('pop');
    const gs = this.gob.body.pos.clone(), ge = new THREE.Vector3(0, 0, -4.5);
    this.gob.body.enabled = false;
    await this.anim(1.4, (t) => {
      this.gob.body.pos.lerpVectors(gs, ge, 1 - Math.pow(1 - t, 3)); this.gob.body.pos.y = Math.sin(t * Math.PI) * 1.4;
      this.gob.model.body.rotation.x = -t * Math.PI * 2;
      block.position.y = 26 - t * 22;
    });
    this.gob.body.enabled = true; this.gob.model.body.rotation.x = 0;
    this.gob.setPosition(0, null, -4.5, Math.PI);
    // impact
    block.position.y = 0; this.sfx('crash'); this.sfx('break');
    g.cameraCtl.shake(0.6, 1); g.cut.cam.position.x += 0.4;
    g.fx.burst(new THREE.Vector3(0.3, 1, -12.5), { count: 60, color: 0x9aa0aa, speed: 7, up: 5, life: 1.4, size: 0.25 });
    k.die(new THREE.Vector3(0, 1, 5));
    k.model.setName('Kalo', '#bdbdbd');
    this.flags.kaloDead = true;
    g.hud.playersOnline(0);
    await this.wait(1.2);
    // silence. the block is "cleaned up" too
    await this.anim(2.2, (t) => { block.scale.setScalar(1 - t); block.rotation.y = t * 2; shadow.material.opacity = 0.6 * (1 - t); });
    g.world.remove(block); g.world.remove(shadow);
    g.fx.setRain(0.6);
    await this.cam([3, 2.2, -4], [0, 0.6, -11], 3);
    await this.wait(1.5);
    this.camSet([0, 1.1, -2.5], [0, 0.7, -4.5]);
    this.gob.faceTowards(v3([0, 0, -12]));
    await this.wait(1.2);
    await this.say(['G: ...', 'G: kalo?']);
    this.cutOut();
    g.audio.muffle(0.35, 2);
    this.muffle = 0.35;

    // Go to him. Each piece.
    this.objective('Kalo?');
    const lines = {
      head: ['G: kalo?', 'G: kalo. get up.'],
      torso: ['G: you’re supposed to respawn.', 'G: that’s how it works. you fall down and you come back. everybody comes back.'],
      armL: ['G: i’ll hold this for you. until you’re back.'],
      armR: ['G: you pushed me.'],
      legL: ['G: why did you push me.'],
      legR: ['G: you said you’d be with me the whole time.', 'G: ...you were. you were with me the whole time.'],
    };
    const pieces = [...k.model.pieces];
    for (const pc of pieces) pc.obj.updateWorldMatrix(true, false);
    while (pieces.length) {
      const idx = await this.useAny(pieces.map((pc) => ({ pos: new THREE.Vector3().setFromMatrixPosition(pc.obj.matrixWorld), label: '...', radius: 2.2 })));
      const pc = pieces.splice(idx, 1)[0];
      this.gob.faceTowards(new THREE.Vector3().setFromMatrixPosition(pc.obj.matrixWorld));
      this.gob.model.emote('droop', 2);
      await this.say(lines[pc.key] || ['G: ...']);
    }
    this.gob.model.emoteName = null;
    this.objective(null);
    // Respawn countdown that never finishes
    await this.cutIn();
    this.camSet([2.5, 1.6, -7], [0, 0.6, -11]);
    for (let loop = 0; loop < 3; loop++) {
      for (let s = 5; s >= (loop === 2 ? 1 : 0); s--) {
        g.hud.big(`Respawning in ${s}...`);
        this.sfx(s === 0 ? 'tickLow' : 'tick');
        await this.wait(loop === 2 ? 1.6 : 1);
      }
      if (loop < 2) { g.hud.big('...'); await this.wait(2.5); }
    }
    g.hud.big(null);
    await this.wait(2);
    await this.gobClose(2.6, 0.2, 2);
    await this.say([
      'G: ...',
      'G: it’s okay.',
      'G: it’s a slow server. it takes a while sometimes.',
      'G: i’ll wait.',
    ]);
    this.chat('Kalo left the game.', 'leave');
    await this.wait(2.5);
    await this.cam([0, 14, 6], [0, 0, -10], 6);
    await this.game.fade(true, 3);
    g.hud.caption('The storm stopped before morning.');
    await this.wait(3.2);
    g.hud.caption('The ground stopped falling at the fence.');
    await this.wait(3.2);
    g.hud.caption('GOB carried every piece home.');
    await this.wait(4);
    g.hud.caption(null);
    g.audio.muffle(0, 1);
    this.cutOut();
  }
}
