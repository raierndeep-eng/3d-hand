import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import * as T from '../render/Textures.js';
import { mulberry32, dist2 } from '../core/utils.js';

/**
 * CHAPTER SIX — DAY ONE
 * Under the baseplate, where GOB started. Floating scraps of the world before it was finished,
 * diary pages, and GOB's first room: walls covered in tally marks. And a letter.
 */
const ISLANDS = [
  { id: 'A', x: 0, y: 0, z: 0, r: 6 },
  { id: 'B', x: -15, y: 1.2, z: -14, r: 4 },
  { id: 'C', x: 15, y: 2.0, z: -18, r: 4 },
  { id: 'D', x: 0, y: 2.8, z: -32, r: 5 },
  { id: 'E', x: -17, y: 3.6, z: -42, r: 4 },
  { id: 'F', x: 17, y: 4.4, z: -46, r: 4 },
  { id: 'G', x: 0, y: 4.8, z: -66, r: 11 },
];
const ROOM = { x: 0, z: -68 };

export default class Chapter6 extends ChapterBase {
  async build(progress) {
    const b = this.b, g = this.game, r = mulberry32(66);
    this.mood('under', 0);
    g.physics.killY = -30;
    g.sfx.setAmbience({ wind: 0.25 });
    g.fx.setMotes(0.5, 0xaab6ff, -0.15, 0.1);
    const islandMat = b.mat(0xffffff, { map: T.studs('#5c6170', 64) });
    for (const is of ISLANDS) {
      const s = is.r * 2;
      const tx = islandMat.map.clone(); tx.needsUpdate = true; tx.repeat.set(s / 2, s / 2);
      b.box({ x: is.x, y: is.y - 1.5, z: is.z, w: s, d: s, h: 1.5, mat: new THREE.MeshStandardMaterial({ map: tx, roughness: 0.9 }) });
      // rocky underside
      for (let k = 0; k < 4; k++) b.box({ x: is.x + (r() - 0.5) * is.r, y: is.y - 1.5 - 1 - k * 1.2, z: is.z + (r() - 0.5) * is.r, w: s * (0.7 - k * 0.15), d: s * (0.7 - k * 0.15), h: 1.2, color: 0x3a3e4a, collide: false });
    }
    // stepping paths between islands (some bob gently)
    this.bobbers = [];
    const path = (a, c, n, bob = false) => {
      const A = ISLANDS.find((i) => i.id === a), C = ISLANDS.find((i) => i.id === c);
      for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        const x = A.x + (C.x - A.x) * t, y = A.y + (C.y - A.y) * t, z = A.z + (C.z - A.z) * t;
        if (bob) {
          const m = b.box({ x, y: y - 0.4, z, w: 1.8, d: 1.8, h: 0.4, color: 0x8a90a0, collide: false });
          const col = g.physics.addBox(x, y - 0.2, z, 1.8, 0.4, 1.8, { moving: true });
          this.bobbers.push({ m, col, x, y: y - 0.2, z, ph: k });
        } else b.box({ x, y: y - 0.4, z, w: 1.8, d: 1.8, h: 0.4, color: 0x7d8496 });
      }
    };
    path('A', 'B', 4); path('A', 'C', 4); path('A', 'D', 6); path('D', 'E', 4, true); path('D', 'F', 4, true); path('D', 'G', 6); path('E', 'G', 5); path('F', 'G', 5, true);
    await progress(0.3);

    // Floating relics of the unfinished world
    const relic = (fn, x, y, z, spin = 0.1) => { const o = fn(); o.position.set(x, y, z); b.add(o); const ph = r() * 6; b.onUpdate((dt, t) => { o.position.y = y + Math.sin(t * 0.4 + ph) * 0.8; o.rotation.y += spin * dt; }); return o; };
    relic(() => { const gr = new THREE.Group(); const p = b.panel(0, 0, 0, 'COMING SOON', { w: 14, h: 3.5, bg: '#2d3240', fg: '#aab6ff', font: '700 120px VT323, monospace', emissive: true }); gr.attach(p); p.position.set(0, 0, 0); const back = p.clone(); back.rotation.y = Math.PI; gr.add(back); return gr; }, -30, 14, -60, 0.05);
    relic(() => { const c = document.createElement('canvas'); const m = new THREE.Mesh(new THREE.PlaneGeometry(6, 3.6), new THREE.MeshBasicMaterial({ map: T.gobFace(), side: THREE.DoubleSide })); return m; }, 34, 12, -30, 0.08);
    for (let i = 0; i < 26; i++) {
      const col = [0x5aa845, 0xd94a5a, 0xffd23f, 0x4fc3f7, 0x8b9099, 0xc77dff][i % 6];
      const x = (r() - 0.5) * 120, z = -40 + (r() - 0.5) * 120, y = -18 + r() * 40;
      if (Math.abs(x) < 24 && z < 5 && z > -80 && y > -6 && y < 12) continue;
      relic(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1 + r() * 4, 1 + r() * 3, 1 + r() * 4), new THREE.MeshStandardMaterial({ color: col, roughness: 0.8, transparent: true, opacity: 0.85 })); m.rotation.set(r(), r(), r()); return m; }, x, y, z, 0.05 + r() * 0.2);
    }
    // faint glow at the room
    b.pointLight(ROOM.x, 9, ROOM.z, 0xaab6ff, 18, 26);
    b.pointLight(0, 6, -20, 0x8090ff, 10, 30);
    await progress(0.5);

    // GOB's first room
    const W = 9, D = 8, Hh = 4.2, y0 = 4.8, wallTex = T.tallyWall(3, 1);
    const wallMat = (w, h) => { const tx = wallTex.clone(); tx.needsUpdate = true; tx.repeat.set(w / 6, h / 3); return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.95 }); };
    const rx = ROOM.x, rz = ROOM.z;
    b.box({ x: rx, y: y0, z: rz - D / 2, w: W, h: Hh, d: 0.3, mat: wallMat(W, Hh) });
    b.box({ x: rx - W / 2, y: y0, z: rz, w: 0.3, h: Hh, d: D, mat: wallMat(D, Hh) });
    b.box({ x: rx + W / 2, y: y0, z: rz, w: 0.3, h: Hh, d: D, mat: wallMat(D, Hh) });
    b.box({ x: rx - 3, y: y0, z: rz + D / 2, w: 3, h: Hh, d: 0.3, mat: wallMat(3, Hh) });
    b.box({ x: rx + 3, y: y0, z: rz + D / 2, w: 3, h: Hh, d: 0.3, mat: wallMat(3, Hh) });
    b.box({ x: rx, y: y0 + 2.6, z: rz + D / 2, w: 3, h: Hh - 2.6, d: 0.3, mat: wallMat(3, 1.6) });
    b.box({ x: rx, y: y0 + Hh, z: rz, w: W + 0.4, h: 0.3, d: D + 0.4, color: 0x4a5060 });
    // furniture: bed, desk, shoebox of name tags, calendar
    b.box({ x: rx - 3, y: y0, z: rz - 2.6, w: 2.4, h: 0.6, d: 2, color: 0x6a7080 });
    b.box({ x: rx - 3, y: y0 + 0.6, z: rz - 3.2, w: 2.2, h: 0.25, d: 0.6, color: 0xd8dce6, collide: false });
    b.box({ x: rx + 2.8, y: y0, z: rz - 3, w: 2.6, h: 1.0, d: 1.2, color: 0x7a5a3a, map: T.planks('#7a5a3a'), rep: [1, 1] });
    b.box({ x: rx + 2.4, y: y0 + 1.0, z: rz - 3, w: 0.9, h: 0.4, d: 0.6, color: 0xc9b89a });
    for (let i = 0; i < 6; i++) { const tg = b.box({ x: rx + 3.2 + (i % 3) * 0.28, y: y0 + 1.0, z: rz - 3.2 + Math.floor(i / 3) * 0.35, w: 0.25, h: 0.02, d: 0.15, color: 0xc43b4b, collide: false }); tg.rotation.y = i; }
    b.panel(rx + 4.33, y0 + 2.4, rz, 'COMING SOON', { ry: -Math.PI / 2, w: 2.4, h: 0.7, bg: '#d6d8de', fg: '#3a3e4a', font: '700 70px VT323, monospace' });
    b.panel(rx - 4.33, y0 + 2.6, rz + 1, 'say hi first\n(they might be shy)', { ry: Math.PI / 2, w: 2.2, h: 0.9, bg: '#e8e0cc', fg: '#3a3020', font: '700 44px VT323, monospace' });
    // mailbox outside: "GOB — DAY 1"
    b.box({ x: rx + 3.5, y: y0, z: rz + 6, w: 0.15, h: 1.1, d: 0.15, color: 0x555555 });
    this.mailbox = b.box({ x: rx + 3.5, y: y0 + 1.1, z: rz + 6, w: 0.9, h: 0.5, d: 0.6, color: 0x4a6fd9 });
    b.panel(rx + 3.5, y0 + 1.95, rz + 6.31, 'GOB · DAY 1', { w: 1.4, h: 0.32, bg: '#f2ead5', fg: '#333', font: '700 70px VT323, monospace' });
    this.flag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.2), b.mat(0xd94a5a)); this.flag.position.set(rx + 3.97, y0 + 1.5, rz + 6); b.add(this.flag);
    await progress(0.8);

    // diary pages
    this.pages = [
      { at: 'B', lines: ['D: day 1.', 'D: i woke up here. there is a sign that says COMING SOON.', 'D: i don’t know what is coming. i will wait for it.'] },
      { at: 'C', lines: ['D: day 40.', 'D: i made flowers. i gave them names.', 'D: they don’t talk back. that’s ok. it is nice to say good morning to something.'] },
      { at: 'D', lines: ['D: day 380.', 'D: i built a fair. people like fairs. if there is a fair, someone will come.', 'D: day 381. nobody came. maybe it needs more lights.', 'D: day 500. i added more lights.'] },
      { at: 'E', lines: ['D: day 1200.', 'D: i made a name tag. HI! IM GOB.', 'D: so when someone comes, they will know my name right away and won’t have to ask.', 'D: i practised saying hi. hi. hi. hi. hi.'] },
      { at: 'F', lines: ['D: day 3041.', 'D: i stopped counting.', 'D: that is a lie. 3041. 3041. 3041.'] },
      { at: 'room', lines: ['D: day 3042.', 'D: someone joined. his name is kalo.', 'D: he said hi FIRST.', 'D: day 3043. he came back.', 'D: day 3044. he came back again.', 'N: The rest of the notebook is empty.'] },
    ];
    this.pageObjs = this.pages.map((pg) => {
      const pos = pg.at === 'room' ? new THREE.Vector3(rx + 2.8, y0 + 1.05, rz - 3) : (() => { const is = ISLANDS.find((i) => i.id === pg.at); return new THREE.Vector3(is.x, is.y, is.z); })();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0xf2ead5, emissive: 0x333022, side: THREE.DoubleSide }));
      m.position.copy(pos).add(new THREE.Vector3(0, pg.at === 'room' ? 0.02 : 0.9, 0)); if (pg.at === 'room') m.rotation.x = -Math.PI / 2;
      b.add(m);
      if (pg.at !== 'room') b.onUpdate((dt, t) => { m.rotation.y += dt; m.position.y = pos.y + 0.9 + Math.sin(t * 2) * 0.1; });
      return { m, pos };
    });

    // way up (revealed at the end): a column of soft light
    this.lift = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.lift.position.set(0, 30, -50); b.add(this.lift);

    this.gob.setPosition(0, null, 2, Math.PI);
    this.gob.model.setMood('sad');
    if (this.flags.hasTag) this.makeTag();
    g.hud.playersOnline(0);
    await progress(1);
  }

  makeTag() {
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.overheadName('Kalo', '#c8c8c8'), transparent: true, depthWrite: false }));
    tag.scale.set(2.2, 0.55, 1); tag.position.copy(this.gob.body.pos).add(new THREE.Vector3(0.8, 2, 0));
    this.game.world.add(tag); this.gob.carry = tag;
  }

  memorySpots() {
    return [
      { id: 'm6a', pos: [ROOM.x + 2.4, 5.8, ROOM.z - 2.2] },
      { id: 'm6c', pos: [-15, 1.2, -18] },
    ];
  }

  restore(beat) { this.music('under', 0.5); if (beat >= 2) this.flags.pagesRead = 6; }

  beats() {
    return [
      { id: 'under', run: () => this.under() },
      { id: 'pages', at: { gob: [0, 2, Math.PI] }, run: () => this.readPages() },
      { id: 'letter', at: { gob: [ROOM.x + 2, ROOM.z + 7.5, Math.PI], y: 4.8 }, run: () => this.letter() },
    ];
  }

  update(dt, t) {
    super.update(dt, t);
    for (const bb of this.bobbers) { const y = bb.y + Math.sin(t * 0.9 + bb.ph) * 0.6; bb.col.setCenter(bb.x, y, bb.z); bb.m.position.y = y; }
  }

  // ------------------------------------------------------------------
  async under() {
    this.music('under', 4);
    await this.cutIn();
    this.game.cut.orbit([0, 4, -34], 46, 16, 0.06, 0.4);
    await this.titleCard('CHAPTER SIX', 'Day One', 'Underneath the baseplate.');
    await this.gobClose(3, 0.5, 2);
    await this.say([
      'G: ...',
      'G: this is where i started.',
      'G: before the grass. before the flowers. before anything.',
      'G: i left pages down here. i didn’t want to carry them anymore.',
    ]);
    this.cutOut();
  }

  async readPages() {
    this.objective('Find the pages of GOB’s notebook', '0/6');
    const left = this.pageObjs.map((_, i) => i); let n = 0;
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const i of left) { const q = this.pageObjs[i].pos; const d = dist2(q.x, q.z, p.x, p.z) + (i === 5 && left.length > 1 ? 50 : 0); if (d < bd) { bd = d; best = q; } } return best || p; }, 1.8);
    while (left.length) {
      const idx = await this.useAny(left.map((i) => ({ pos: this.pageObjs[i].pos.clone().add(new THREE.Vector3(0, 0.6, 0)), label: 'Read the page', radius: 2.4 })));
      const i = left.splice(idx, 1)[0];
      this.sfx('page'); this.pageObjs[i].m.visible = false;
      this.gob.model.emote('droop', 2);
      await this.say(this.pages[i].lines);
      this.gob.model.emoteName = null;
      n++; this.progress(`${n}/6`);
      if (i === 5) await this.reveal();
    }
    this.unmark();
    this.objective(null);
  }

  async reveal() {
    const g = this.game, rx = ROOM.x, rz = ROOM.z;
    await this.cutIn();
    this.music('reveal', 4);
    this.camSet([rx + 3.5, 6.8, rz + 3], [rx + 3, 6.2, rz - 3.9]);
    await this.say(['N: The walls are covered in marks. Little bundles of five.']);
    await this.cam([rx - 3.5, 7.4, rz + 2], [rx - 4.3, 6.5, rz - 1], 5);
    await this.say(['N: Floor to ceiling. Every wall.']);
    await this.cam([rx, 7.8, rz + 3.6], [rx, 6.4, rz - 3.9], 4);
    this.gob.setPosition(rx, 4.8, rz, Math.PI);
    await this.gobClose(2.8, 0.5, 2.5, 0);
    await this.say([
      'G: three thousand and forty one days.',
      'G: i counted every single one. i was so good at counting.',
      'G: i built the flowers so i’d have someone to say good morning to.',
      'G: i built the fair so someone would want to stay.',
      'G: i made a name tag so nobody would have to ask who i was.',
      'G: and then i waited.',
      'G: ...',
      'G: i was so lonely that i forgot it was called lonely. it was just called “every day”.',
      'G: and then kalo came. and it stopped. for a little while it stopped.',
      'G: and when he didn’t come back, i didn’t want to come back here.',
      'G: so i waited at the spawn. and i built a copy. and i walked in circles.',
      'G: ...',
      'G: but i was always here. in this room. even on the hill.',
    ]);
    this.cutOut();
  }

  async letter() {
    const g = this.game, rx = ROOM.x, rz = ROOM.z;
    this.objective('Check the mailbox');
    this.flag.rotation.z = -1.2; this.flag.position.y += 0.2; // flag up: there is mail
    this.sfx('chime');
    await this.use([rx + 3.5, 5.6, rz + 6.6], 'Check the mailbox (GOB · DAY 1)', 2.4);
    this.objective(null);
    await this.cutIn();
    this.gob.setPosition(rx + 3.5, 4.8, rz + 7.6, Math.PI);
    await this.gobClose(2.6, 0.5, 1.2, 0.5);
    await this.say([
      'N: There is one letter in the mailbox.',
      'N: The address on the envelope says: GOB, DAY 1. The only address the server has ever had for GOB.',
      'N: The handwriting is big and messy.',
      'G: ...',
      'G: he wrote it.',
      'G: he said “tomorrow i’m writing you a letter.” and he did. the night before the tower.',
      'G: it just went to the wrong mailbox.',
    ]);
    this.music('reveal', 1);
    await this.say([
      'L: gobby —',
      'L: ok so you said you can keep a letter, so i’m writing one. i couldn’t sleep anyway.',
      'L: thank you for saying hi back. you have no idea. i said hi to like forty empty places before yours.',
      'L: you said you know what 0 players feels like. i think you’ve been alone way longer than me. you don’t have to tell me. i can tell.',
      'L: if i ever don’t come back, it’s NOT because of you. ok?? servers close. batteries die. stuff happens.',
      'L: don’t wait at spawn forever. you’re really good at saying hi. say it to someone else too.',
      'L: same place tomorrow. — kalo',
      'L: p.s. the board should count you. it always should have.',
    ]);
    this.flags.letter = true;
    g.collected.includes('m6b') || (g.collected.push('m6b'), g.save.addMemory('m6b'), g.hud.toast('Memory found: Kalo’s note', 'You can keep a letter.'));
    await this.wait(1.5);
    await this.say([
      'G: ...',
      'G: “it’s not because of you.”',
      'G: ...',
      'G: i thought if i stopped waiting, it would mean he wasn’t my friend anymore.',
      'G: but he told me not to. he told me first. he always said things first.',
      { choice: ['Keep the letter.', 'Read it again.'] },
    ]);
    await this.say([
      'G: i’ll keep it. forever.',
      'G: like the stud.',
      'G: ...',
      'G: okay, kalo.',
      'G: i won’t wait at the spawn forever.',
      'G: but i’ll take care of the place. so it’s nice. for whoever comes next.',
      'G: and i’ll say hi first.',
    ]);
    // the way up
    this.mood('dawn', 8);
    this.sfx('memory');
    this.lift.position.set(rx, 30, rz + 12);
    await this.anim(2, (k) => (this.lift.material.opacity = 0.35 * k));
    g.physics.addBox(rx, 4.65, rz + 12, 3, 0.3, 3);
    this.cutOut();
    this.objective('Go up');
    this.gob.model.setMood('normal');
    await this.reach([rx, 4.8, rz + 12], 1.6);
    this.objective(null);
    await this.cutIn();
    this.gob.body.enabled = false;
    const sp = this.gob.body.pos.clone();
    this.game.cut.follow(() => this.gob.body.pos.clone().add(new THREE.Vector3(5, -1, 6)), () => this.gob.body.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), 3);
    await this.anim(5, (k) => { this.gob.body.pos.copy(sp).add(new THREE.Vector3(0, k * k * 30, 0)); });
    await this.game.fade(true, 2);
    this.gob.body.enabled = true;
    this.cutOut();
  }
}
