import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import { buildSunnyPlate, SP } from '../world/SunnyPlate.js';
import { KaloModel } from '../characters/KaloModel.js';
import * as T from '../render/Textures.js';
import { dist2 } from '../core/utils.js';

/**
 * CHAPTER FOUR — RESPAWN
 * The same baseplate as Chapter One, with the colour drained out. GOB waits at the spawn
 * for a respawn that never comes, then walks through every place they went together.
 */
const [GX, GZ] = SP.playground, [PX, PZ] = SP.pond, [FX, FZ] = SP.fort, [HX, HZ] = SP.hill;
const PAD = SP.spawn;

export default class Chapter4 extends ChapterBase {
  async build(progress) {
    const g = this.game;
    this.mood('grief', 0);
    this.H = buildSunnyPlate(this, 'grief');
    this.H.showFort(true);
    this.H.onlineBoard(0);
    await progress(0.7);
    g.fx.setRain(0.35);
    g.sfx.setAmbience({ wind: 0.5, rain: 0.5 });
    this.gob.model.setMood('sad');
    this.gob.setPosition(PAD[0] - 2.6, null, PAD[1] - 0.5, Math.PI / 2);
    g.hud.playersOnline(0);
    // Kalo's pieces, laid out on the spawn pad the way GOB carried them home.
    const km = new KaloModel(); this.pieces = km;
    const P = km.parts; km.root.position.set(PAD[0], 0.35, PAD[1]); g.world.add(km.root);
    km.tag.visible = false;
    const lay = (o, x, z, ry = 0) => { o.position.set(x, 0.3, z); o.rotation.set(-Math.PI / 2, 0, ry); };
    lay(P.head, 0, -1.55); P.head.position.y = 0.37; P.head.rotation.set(-Math.PI / 2, 0, 0.2);
    lay(P.torso, 0, -0.35); lay(P.armL, -0.95, -0.2, 0.15); lay(P.armR, 1.0, -0.15, -0.2);
    lay(P.legL, -0.35, 1.05, 0.05); lay(P.legR, 0.4, 1.1, -0.1);
    for (const k of ['armL', 'armR', 'legL', 'legR']) P[k].children[0].position.y = -0.6;
    // his name, still floating there
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.overheadName('Kalo', '#c8c8c8'), transparent: true, depthWrite: false }));
    this.tag.scale.set(2.2, 0.55, 1); this.tag.position.set(PAD[0], 2.6, PAD[1]); g.world.add(this.tag);
    this.b.onUpdate((dt, t) => { if (!this.gob.carry) this.tag.position.y = 2.6 + Math.sin(t * 1.1) * 0.08; });
    // Kalo's notes left from before? no. the mailbox stays empty.
    g.interactions.add({ pos: v3([3.6, 1.2, -26.4]), label: 'Check the mailbox', radius: 2, onUse: () => this.say(['N: The mailbox is empty.', 'G: he said he’d write me a letter.', 'G: ...mail is slow. like the server.']) });
    await progress(1);
  }

  memorySpots() {
    return [
      { id: 'm4a', pos: [PAD[0] - 3, 0, PAD[1] + 3] },
      { id: 'm4b', pos: [SP.beds[3][0], 0.4, SP.beds[3][1] - 1.8] },
      { id: 'm4c', pos: [FX, 2.3, FZ - 3] },
    ];
  }

  restore(beat) {
    this.music('grief', 0.5);
    if (beat >= 1) { this.game.fx.setRain(0); this.game.sfx.setAmbience({ wind: 0.5 }); }
    if (beat >= 3) this.takeTag(true);
  }

  beats() {
    return [
      { id: 'wait', run: () => this.waiting() },
      { id: 'echoes', at: { gob: [PAD[0] - 2.6, PAD[1] - 0.5, Math.PI / 2] }, run: () => this.echoes() },
      { id: 'fair', at: { gob: [56, 2, Math.PI / 2] }, run: () => this.fairEdge() },
      { id: 'tag', at: { gob: [PAD[0] - 3, PAD[1] - 3, 0] }, run: () => this.lastBeat() },
    ];
  }

  takeTag(instant = false) {
    this.gob.carry = this.tag;
    this.flags.hasTag = true;
    if (instant) this.tag.position.copy(this.gob.body.pos).add(new THREE.Vector3(0.8, 2, 0));
  }

  // ------------------------------------------------------------------
  async waiting() {
    const g = this.game, H = this.H;
    await this.cutIn();
    this.music('grief', 3);
    this.camSet([PAD[0] + 6, 2.2, PAD[1] + 6], [PAD[0], 0.6, PAD[1]]);
    await this.cam([PAD[0] + 4, 1.6, PAD[1] + 4], [PAD[0] - 0.5, 0.6, PAD[1]], 6);
    await this.titleCard('CHAPTER FOUR', 'Respawn', 'Same place tomorrow.');
    this.gob.model.emote('droop', 3);
    g.hud.big('Respawning in 5...');
    for (let s = 4; s >= 1; s--) { await this.wait(1.2); g.hud.big(`Respawning in ${s}...`); this.sfx('tick', { vol: 0.5 }); }
    await this.wait(1.6);
    g.hud.big(null);
    this.cutOut();
    this.objective('Wait for Kalo to respawn');
    // Let the player move a little; GOB keeps coming back to the pad.
    const days = [
      { cap: 'Day 1', lines: ['G: same place tomorrow. he said.'] },
      { cap: 'Day 2', lines: ['G: maybe he’s busy. maybe his battery died. that happens.'] },
      { cap: 'Day 3', lines: ['G: i checked the mailbox. he said he’d write.', 'G: nothing yet.'] },
      { cap: 'Day 5', lines: ['G: the flowers are thirsty.', 'G: i’ll water them later. i don’t want to miss him.'], rainOff: true },
      { cap: 'Day 9', lines: ['G: the board says 0 players.', 'G: it doesn’t count me. it never counted me.'] },
      { cap: 'Day 14', lines: ['G: ...'] },
      { cap: 'Day 23', lines: ['G: ...', 'G: maybe he’s somewhere else. somewhere we went.', 'G: i should look. just in case.'] },
    ];
    await this.wait(4);
    for (const d of days) {
      // a day passes: night, then grey morning
      await this.game.fade(true, 1.2);
      this.mood('griefNight', 0); g.sfx.setAmbience({ crickets: 0.4, wind: 0.3, rain: d.rainOff ? 0 : 0.4 });
      if (d.rainOff) g.fx.setRain(0);
      if (dist2(this.gob.body.pos.x, this.gob.body.pos.z, PAD[0], PAD[1]) > 10) this.gob.setPosition(PAD[0] - 2.6, null, PAD[1] - 0.5, Math.PI / 2);
      g.cameraCtl.snap();
      await this.game.fade(false, 0.8);
      g.hud.caption(d.cap, { pixel: true });
      await this.wait(1.6);
      this.mood('grief', 2.5); g.sfx.setAmbience({ wind: 0.5, rain: g.fx.rainAmount > 0 ? 0.4 : 0 });
      await this.wait(1.4);
      g.hud.caption(null);
      this.gob.model.emote('droop', 2);
      await this.say(d.lines);
      this.gob.model.emoteName = null;
      await this.wait(3);
    }
    this.objective(null);
  }

  /** A translucent Kalo replaying a moment, then fading. */
  async echo(pos, yaw, pose, lines, { onSay } = {}) {
    const g = this.game;
    const gm = new KaloModel({ variant: 'ghost' });
    gm.root.position.copy(v3(pos)); gm.root.rotation.y = yaw; gm.setPose(pose);
    g.world.add(gm.root);
    const mats = [gm.mat, gm.faceMat, gm.tagMat];
    const base = mats.map((m) => m.opacity);
    mats.forEach((m) => (m.opacity = 0));
    const tick = this.b.onUpdate((dt) => gm.update(dt, { speed: 0, grounded: true }));
    this.sfx('memory', { vol: 0.5 });
    await this.anim(1.2, (k) => mats.forEach((m, i) => (m.opacity = base[i] * k)));
    if (onSay) onSay(gm);
    await this.say(lines);
    await this.anim(2, (k) => { mats.forEach((m, i) => (m.opacity = base[i] * (1 - k))); gm.root.position.y += 0.004; });
    g.world.remove(gm.root);
    this.b.updaters.splice(this.b.updaters.indexOf(tick), 1);
  }

  async echoes() {
    const g = this.game;
    this.objective('Visit the places you went together', '0/5');
    const places = [
      { name: 'pond', pos: [PX + 9, 0, PZ], run: async () => {
        await this.echo([PX + 7.5, 0, PZ + 1.5], -Math.PI / 2, 'point', ['K: lmao. hi mr duck. hi also mr duck.']);
        await this.say(['G: ...', 'G: the ducks are gone.', 'G: even the ducks left.']);
      } },
      { name: 'slide', pos: [GX - 6, 0, GZ - 3], run: async () => {
        await this.echo([GX - 3, 3.6, GZ], Math.PI / 2, 'cheer', ['K: then next time i’m watching. every time.']);
        await this.say(['G: ...', 'G: nobody’s watching.', 'G: so it doesn’t count.']);
      } },
      { name: 'fort', pos: [FX + 4, 0, FZ + 5], run: async () => {
        await this.echo([FX, 0.3, FZ + 1], Math.PI, 'cheer', ['K: the GOB AND KALO FORT. established today.', 'K: obviously. we’re co-owners.']);
        await this.say(['N: The wind has torn the flag. Now it just says “GOB +”.', 'G: half a flag.', 'G: half a fort.']);
      } },
      { name: 'flowers', pos: [0, 0, -20], run: async () => {
        await this.say(['N: Petunia, Sir Daisy, Marigold Jr. and Steve have gone brown and soft.', 'G: sorry, petunia. sorry, sir daisy.', 'G: sorry, marigold jr.', 'G: sorry, steve.', 'G: i forgot about you. i was busy waiting.']);
      } },
      { name: 'hill', pos: SP.hillTop, run: async () => {
        const top = SP.hillTop;
        this.gob.faceTowards(v3([top[0] - 1.6, 0, top[2] + 1.6]));
        await this.echo([top[0] - 1.6, top[1], top[2] + 1.6], -Math.PI / 2, 'sit', ['K: hey gobby.', 'K: best friends?']);
        await this.say(['G: best friends.', 'G: ...', 'G: you said tomorrow.', 'G: it’s been so many tomorrows.']);
      } },
    ];
    const left = places.map((_, i) => i); let n = 0;
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const i of left) { const sp = places[i].pos; const d = dist2(sp[0], sp[2], p.x, p.z); if (d < bd) { bd = d; best = v3(sp); } } return best || p; });
    while (left.length) {
      let hit = -1;
      await this.until(() => { for (const i of left) { const sp = places[i].pos; if (dist2(sp[0], sp[2], this.gob.body.pos.x, this.gob.body.pos.z) < 4.5 && Math.abs(this.gob.body.pos.y - sp[1]) < 3) { hit = i; return true; } } return false; });
      left.splice(left.indexOf(hit), 1);
      this.game.lock('echo');
      await places[hit].run();
      this.game.unlock('echo');
      n++; this.progress(`${n}/5`);
    }
    this.unmark();
    this.objective(null);
    await this.say(['G: ...', 'G: he’s not anywhere.', 'G: the fair. we didn’t check the fair.']);
  }

  async fairEdge() {
    const g = this.game;
    this.objective('Look toward the fair');
    await this.reach([64, 0, 4], 5);
    await this.cutIn();
    this.camSet([62, 3, 0], [118, 12, 10]);
    this.gob.setPosition(64, null, 4, Math.PI / 2);
    await this.say([
      'N: Far away, past the fence, the ferris wheel stands still. No lights.',
      'G: i could go turn it on.',
      'G: ...',
      'G: but then it would just be on. with nobody in it. again.',
    ]);
    this.music('brokenFair', 2);
    await this.wait(4);
    await this.say(['N: Somewhere, a music box tries to play GOB’s song and keeps forgetting the notes.']);
    this.music('grief', 3);
    this.cutOut();
  }

  async lastBeat() {
    const g = this.game;
    this.objective('Go back to the spawn');
    await this.reach([PAD[0], 0, PAD[1]], 5);
    await this.cutIn();
    this.gob.setPosition(PAD[0] - 2.6, null, PAD[1] - 0.2, Math.PI / 2);
    await this.cam([PAD[0] - 6, 2, PAD[1] + 3], [PAD[0], 1, PAD[1]], 2);
    await this.say([
      'G: kalo.',
      'G: i went everywhere. you weren’t there.',
      'G: so you must be here. you must still be loading.',
      'N: The name floats above the pad, grey now. It doesn’t say anything.',
    ]);
    this.cutOut();
    this.objective('Take Kalo’s name with you');
    await this.use([PAD[0], 0.5, PAD[1]], 'Take Kalo’s name', 3);
    this.objective(null);
    this.sfx('memory');
    this.takeTag();
    g.hud.toast('Kalo’s name tag', 'It will follow GOB from now on.');
    await this.cutIn();
    await this.gobClose(3, 0.6, 1.5, 0.5);
    await this.say([
      'G: there. now you’re with me.',
      'G: ...',
      'G: i can’t make you come back.',
      'G: ...',
      'G: can i?',
      () => this.gob.model.emote('lookUp', 2),
      'G: i made the flowers. i made the fair. i made the hill and the pond and the fence.',
      'G: i made this whole world, one block at a time.',
      'G: i can make a kalo.',
      'G: i just need yellow blocks. lots of them.',
      'N: Behind GOB, the door of his house creaks open on its own.',
      'N: It leads somewhere it never used to.',
    ]);
    this.gob.model.emoteName = null;
    this.cutOut();
    // The impossible hallway
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2), new THREE.MeshBasicMaterial({ color: 0xf2e7a6 }));
    door.position.set(0, 1, SP.home[1] + 3.07); g.world.add(door);
    const glow = new THREE.PointLight(0xffe9a0, 6, 10); glow.position.set(0, 1.5, SP.home[1] + 4); g.world.add(glow);
    this.sfx('creak');
    this.objective('Go into the house');
    await this.reach([0, 0, SP.home[1] + 3.6], 1.8);
    this.objective(null);
    this.sfx('door');
    await this.cutIn();
    await this.cam([0, 1.4, SP.home[1] + 3.2], [0, 1.2, SP.home[1] - 6], 1.6);
    await this.game.fade(true, 1.5);
    this.cutOut();
  }
}
