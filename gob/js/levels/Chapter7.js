import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import { buildSunnyPlate, SP } from '../world/SunnyPlate.js';
import * as T from '../render/Textures.js';
import { dist2 } from '../core/utils.js';

/**
 * EPILOGUE — HI, I'M GOB
 * Dawn on the baseplate. GOB waters the flowers again, makes a place for Kalo on the hill,
 * puts up a new sign at the spawn... and notices the board says 1.
 */
const PAD = SP.spawn;

export default class Chapter7 extends ChapterBase {
  async build(progress) {
    const g = this.game;
    this.mood('dawn', 0);
    this.H = buildSunnyPlate(this, 'epilogue');
    this.H.showFort(true);
    this.H.onlineBoard(0);
    await progress(0.7);
    g.sfx.setAmbience({ birds: 0.35, wind: 0.2 });
    this.gob.setPosition(SP.gobStart[0], null, SP.gobStart[1], 0);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.overheadName('Kalo', '#e8d27a'), transparent: true, depthWrite: false }));
    tag.scale.set(2.2, 0.55, 1); tag.position.copy(this.gob.body.pos).add(new THREE.Vector3(0.8, 2, 0));
    g.world.add(tag); this.tag = tag; this.gob.carry = tag;
    g.hud.playersOnline(0);
    await progress(1);
  }

  memorySpots() { return []; }

  restore(beat) {
    this.music('reveal', 0.5);
    if (beat >= 1) this.H.beds.forEach((bd) => this.bloom(bd, true));
    if (beat >= 2) this.placeMemorial(true);
    if (beat >= 3) this.placeSign(true);
  }

  beats() {
    return [
      { id: 'dawn', run: () => this.dawn() },
      { id: 'hill', at: { gob: [0, -18, Math.PI] }, run: () => this.hill() },
      { id: 'sign', at: { gob: [SP.hill[0] - 1.5, SP.hill[1] + 16, Math.PI] }, run: () => this.sign() },
      { id: 'hi', at: { gob: [PAD[0], PAD[1] - 4, 0] }, run: () => this.hi() },
    ];
  }

  bloom(bed, instant = false) {
    const cols = [0xff6b8a, 0xffd23f, 0xffffff, 0xc77dff];
    const i = this.H.beds.indexOf(bed);
    bed.flowers.traverse((o) => { if (o.isMesh && o.geometry.parameters && o.geometry.parameters.width > 0.3) { o.material = o.material.clone(); o.material.color.set(cols[i]); o.rotation.x = 0; o.position.y = 0.68; } if (o.isMesh && o.geometry.parameters && o.geometry.parameters.width === 0.14) o.visible = true; if (o.isMesh && o.geometry.parameters && o.geometry.parameters.width === 0.07) { o.material = this.b.mat(0x3d8a3a); } });
    if (!instant) this.game.fx.burst(bed.pos.clone().add(new THREE.Vector3(0, 1, 0)), { count: 24, colors: [cols[i], 0x7ed957], speed: 2, up: 2, life: 1 });
  }

  placeMemorial(instant = false) {
    const b = this.b, top = SP.hillTop;
    const x = top[0] - 1.6, z = top[2] + 1.6;
    b.box({ x, y: top[1], z, w: 0.7, h: 0.7, d: 0.7, color: 0xf5cd30 });
    if (this.flags.hasStud !== false) { const s = b.cyl({ x, y: top[1] + 0.7, z, r: 0.14, h: 0.12, color: 0xf5cd30, collide: false }); s.material = b.mat(0xf5cd30, { rough: 0.3 }); }
    b.scatter(30, [x - 1.5, z - 1.5, x + 1.5, z + 1.5], { y: top[1], colors: [0xff6b8a, 0xffd23f, 0xffffff, 0xc77dff], avoid: (px, pz) => Math.abs(px - x) < 0.5 && Math.abs(pz - z) < 0.5 });
    this.gob.carry = null;
    const t = this.tag; const target = new THREE.Vector3(x, top[1] + 1.6, z);
    if (instant) t.position.copy(target);
    else { const from = t.position.clone(); this.anim(2, (k) => t.position.lerpVectors(from, target, k)); }
    this.b.onUpdate((dt, tt) => { if (!this.gob.carry) t.position.y = target.y + Math.sin(tt * 1.2) * 0.08; });
  }

  placeSign(instant = false) {
    this.b.sign(PAD[0] - 3.5, PAD[1] + 1.5, 'HI! IM GOB\nI’LL BE HERE.\n(say hi!)', { ry: 0.3, w: 2.8, h: 1.6, bg: '#c43b4b', fg: '#ffffff', border: '#13060a', font: '700 50px Fredoka, sans-serif' });
    if (!instant) this.game.fx.sparkle(new THREE.Vector3(PAD[0] - 3.5, 2, PAD[1] + 1.5));
  }

  // ------------------------------------------------------------------
  async dawn() {
    const g = this.game;
    await this.cutIn();
    this.music('reveal', 3);
    g.cut.orbit([0, 0, -10], 44, 18, 0.06, 2.4);
    await this.titleCard('EPILOGUE', 'Hi, I’m GOB', 'Same place tomorrow.');
    await this.gobClose(3, 0.4, 2);
    await this.say([
      'G: good morning, baseplate.',
      'G: good morning, sky.',
      'G: good morning, kalo.',
      'G: ...',
      'G: first things first.',
    ]);
    this.cutOut();
    this.objective('Water the flowers', '0/4');
    const left = [0, 1, 2, 3]; let n = 0;
    const lines = [
      ['G: petunia. you’re still in there. i can tell.'],
      ['G: sir daisy. sorry i was gone. very brave of you to wait.'],
      ['G: marigold jr.! look at you. you grew back!'],
      ['G: steve.', 'G: ...thanks for listening. you always do.'],
    ];
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const i of left) { const bp = this.H.beds[i].pos; const d = dist2(bp.x, bp.z, p.x, p.z); if (d < bd) { bd = d; best = bp; } } return best || p; });
    while (left.length) {
      const pick = await this.useAny(left.map((i) => ({ pos: this.H.beds[i].pos, label: `Water ${SP.bedNames[i]}`, radius: 2.6 })));
      const i = left.splice(pick, 1)[0];
      this.sfx('water'); this.gob.faceTowards(this.H.beds[i].pos);
      g.fx.burst(this.H.beds[i].pos.clone().add(new THREE.Vector3(0, 1.4, 0)), { count: 30, color: 0x6bc5ff, speed: 1.5, up: 1, life: 0.9, size: 0.08, gravity: 9 });
      await this.wait(0.6);
      this.bloom(this.H.beds[i]); this.sfx('collect');
      await this.say(lines[i]);
      n++; this.progress(`${n}/4`);
    }
    this.unmark();
    this.mood('morning', 20);
    this.objective(null);
  }

  async hill() {
    this.objective('Bring Kalo’s name to the hill');
    await this.reach(SP.hillTop, 3);
    this.objective(null);
    await this.cutIn();
    const top = SP.hillTop;
    this.gob.setPosition(top[0] - 0.2, null, top[2] + 0.6, -Math.PI / 2 - 0.6);
    this.camSet([top[0] + 3.5, top[1] + 2, top[2] + 4], [top[0] - 1.6, top[1] + 0.8, top[2] + 1.6]);
    await this.say(['G: this was your spot. on the blanket. counting clouds.']);
    this.placeMemorial(); this.sfx('place');
    await this.wait(2.2);
    await this.say([
      'G: there. a yellow block. and your stud on top, so it’s easy to find.',
      'G: and your name, so nobody has to ask.',
      'G: ...',
      'G: fourteen clouds today. one looks like a duck.',
      'G: i’ll come up and tell you every evening.',
      'G: but i won’t wait here. you said.',
    ]);
    this.cutOut();
  }

  async sign() {
    this.objective('Put up a new sign at the spawn');
    await this.use([PAD[0] - 3.5, 0.5, PAD[1] + 1.5], 'Put up the sign', 3);
    this.objective(null);
    this.placeSign(); this.sfx('place');
    await this.say(['G: “HI! IM GOB. I’LL BE HERE.”', 'G: short. not desperate.', 'G: ...a little desperate. that’s okay.']);
  }

  async hi() {
    const g = this.game, H = this.H;
    await this.wait(1.5);
    this.sfx('chime');
    H.onlineBoard(1); g.hud.playersOnline(1);
    this.chat('Players online: 1', 'sys');
    this.gob.model.emote('surprised', 1);
    await this.cutIn();
    this.gob.setPosition(PAD[0], null, PAD[1] - 2, 0);
    this.camSet([PAD[0] + 5, 2.4, PAD[1] - 0.5], [PAD[0] + 5.2, 2.4, PAD[1] - 1.5]);
    await this.wait(1.2);
    await this.say(['N: The board by the spawn says 1.']);
    this.gob.faceTowards(v3([PAD[0] + 5.2, 0, PAD[1] - 1.5]));
    await this.gobClose(3.4, 0.5, 1.5, 0);
    await this.say([
      'G: ...',
      'G: the board says one.',
      'G: it isn’t counting me. it never counts me.',
      'G: and the spawn is empty.',
      'G: ...',
    ]);
    // GOB turns to the camera. To you.
    const cam = g.engine.camera;
    await this.cam([this.gob.body.pos.x, 1.1, this.gob.body.pos.z + 2.6], [this.gob.body.pos.x, 0.6, this.gob.body.pos.z], 2);
    this.gob.faceTowards(cam.position.clone());
    this.gob.model.lookAtWorld(cam.position.clone());
    await this.wait(1.5);
    const r = await this.say([
      'G: oh.',
      'G: it’s counting you.',
      'G: you’ve been here the whole time, haven’t you? since the flowers.',
      'G: at the fair. at the tower. at the spawn, all those days.',
      'G: you were there for all of it.',
      'G: ...',
      'G: i should have said this a long time ago. i always wait for people to go first.',
      'G: not anymore.',
      () => this.gob.model.emote('bounce', 1.4),
      'G: hi.',
      'G: i’m GOB.',
      { choice: ['“Hi, GOB.”', '…'] },
    ]);
    if (r.choice === 0) await this.say([() => this.gob.model.emote('happy', 2), 'G: ...', 'G: you said hi.', 'G: you said hi back.']);
    else await this.say(['G: that’s okay. you don’t have to say anything.', 'G: i know you’re there. that’s enough.']);
    await this.say([
      'G: will you stay a little longer?',
      'G: there’s a pond. and a playground. and a fair. and a hill with fourteen clouds.',
      'G: same place tomorrow?',
    ]);
    this.gob.model.lookAtWorld(null);
    this.music('ending', 3);
    this.mood('noon', 10);
    g.sfx.setAmbience({ birds: 1, wind: 0.1 });
    await this.cam([0, 40, 30], [0, 0, -10], 9);
    await this.game.fade(true, 3);
    this.cutOut();
  }
}
