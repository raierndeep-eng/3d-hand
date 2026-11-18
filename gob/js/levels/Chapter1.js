import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import { buildSunnyPlate, SP } from '../world/SunnyPlate.js';
import { dist2 } from '../core/utils.js';

/**
 * CHAPTER ONE — GOOD MORNING
 * The happiest day GOB has ever had. Kalo joins. They play tag, build a fort, watch the sunset.
 */
const [GX, GZ] = SP.playground, [PX, PZ] = SP.pond, [FX, FZ] = SP.fort, [HX, HZ] = SP.hill;

export default class Chapter1 extends ChapterBase {
  async build(progress) {
    this.mood('morning', 0);
    this.H = buildSunnyPlate(this, 'happy');
    await progress(0.7);
    this.game.sfx.setAmbience({ birds: 1, wind: 0.1, waves: 0.15 });
    this.game.spawnKalo();
    this.kalo.model.root.visible = false; this.kalo.active = false;
    this.kalo.teleport(SP.spawn[0], 0.4, SP.spawn[1]);
    this.gob.setPosition(SP.gobStart[0], null, SP.gobStart[1], 0);
    this.game.hud.playersOnline(0);
    // quack at the ducks any time
    this.game.interactions.add({ pos: () => this.H.ducks[0].position, label: 'Say hi to Mr. Duck', radius: 4, onUse: () => { this.sfx('quack'); this.gob.model.emote('happy', 0.8); } });
    this.game.interactions.add({ pos: v3([3.6, 1.2, -26.4]), label: 'Check the mailbox', radius: 2, onUse: () => this.say(['N: The mailbox is empty.', 'G: maybe tomorrow.']) });
    await progress(1);
  }

  memorySpots() {
    return [
      { id: 'm1a', pos: [-15, 0, -38] },
      { id: 'm1b', pos: [PX + 3, 0.5, PZ - 1] },
      { id: 'm1c', pos: [-58.4, 6.3, -51.2] },
      { id: 'm1d', pos: [GX - 3, 3.6, GZ] },
    ];
  }

  showKalo(at) {
    const k = this.kalo; k.model.root.visible = true; k.active = true;
    if (at) k.teleport(at[0], null, at[1]);
    this.H.onlineBoard(1); this.game.hud.playersOnline(1);
  }

  restore(beat) {
    if (beat >= 1) this.music('happy', 0.5);
    if (beat >= 2) { this.showKalo([SP.spawn[0] + 2, SP.spawn[1]]); this.kalo.follow(); }
    if (beat >= 5) this.H.showFort(true);
  }

  beats() {
    return [
      { id: 'wake', run: () => this.wake() },
      { id: 'join', at: { gob: [0, -18, Math.PI] }, run: () => this.join() },
      { id: 'tour', at: { gob: [0, 9, Math.PI], kalo: [2, 12] }, run: () => this.tour() },
      { id: 'tag', at: { gob: [FX + 4, FZ + 6, 0], kalo: [FX + 2, FZ + 7] }, run: () => this.tag() },
      { id: 'bricks', at: { gob: [FX + 4, FZ + 6, 0], kalo: [FX, FZ] }, run: () => this.bricks() },
      { id: 'picnic', at: { gob: [FX + 5, FZ + 5, Math.PI], kalo: [FX + 2, FZ + 5] }, run: () => this.picnic() },
    ];
  }

  // ------------------------------------------------------------------
  async wake() {
    const g = this.game;
    await this.cutIn();
    this.music('happy', 3);
    g.cut.orbit([0, 0, -10], 46, 22, 0.08, 0.6);
    await this.titleCard('CHAPTER ONE', 'Good Morning', 'Someone new on the baseplate.');
    await this.gobClose(3.2, 0.4, 2.2);
    this.gob.model.emote('surprised', 0.8);
    await this.wait(0.6);
    await this.say([
      'G: ...',
      () => this.gob.model.emote('bounce', 1.4),
      'G: good morning, baseplate!',
      'G: good morning, sky. good morning, clouds. good morning, house.',
      () => this.gob.model.lookAtWorld(v3([3.6, 1.3, -26.4])),
      'G: good morning, mailbox.',
      'G: ...no letters today. that’s okay! maybe tomorrow.',
      () => this.gob.model.lookAtWorld(null),
      'G: first things first. the flowers need their morning water.',
    ]);
    this.cutOut();
    g.hud.toast(g.input.isTouch ? 'Left stick to move · drag to look · JUMP / USE buttons' : 'WASD to move · Mouse to look · Space to jump · E to interact', 'Click the game to capture the mouse');

    this.objective('Water your flowers', '0/4');
    const lines = [
      ['G: good morning, petunia. you look very pink today.'],
      ['G: sir daisy. standing tall as always. very brave.'],
      ['G: marigold jr.! you grew! a little! i think!'],
      ['G: hi steve.', 'G: ...steve doesn’t say much. but steve is a good listener.'],
    ];
    const left = [0, 1, 2, 3];
    let done = 0;
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const i of left) { const bp = this.H.beds[i].pos; const d = dist2(bp.x, bp.z, p.x, p.z); if (d < bd) { bd = d; best = bp; } } return best || p; });
    while (left.length) {
      const pick = await this.useAny(left.map((i) => ({ pos: this.H.beds[i].pos, label: `Water ${SP.bedNames[i]}`, radius: 2.6 })));
      const i = left.splice(pick, 1)[0];
      this.sfx('water'); g.fx.burst(this.H.beds[i].pos.clone().add(new THREE.Vector3(0, 1.4, 0)), { count: 30, color: 0x6bc5ff, speed: 1.5, up: 1, life: 0.9, size: 0.08, gravity: 9 });
      this.H.beds[i].flowers.scale.y = 1.15;
      this.gob.faceTowards(this.H.beds[i].pos);
      await this.say(lines[i]);
      done++; this.progress(`${done}/4`);
    }
    this.unmark();
    await this.say(['G: all watered! good job, everyone.', () => this.gob.model.emote('happy', 1)]);
    this.objective(null);
  }

  async join() {
    const g = this.game;
    await this.wait(1.2);
    this.sfx('chime');
    this.chat('Kalo joined the game.', 'sys');
    this.H.onlineBoard(1); g.hud.playersOnline(1);
    this.gob.model.emote('surprised', 1);
    await this.cutIn();
    await this.gobClose(3, 0.3, 1);
    await this.say([
      'G: ...',
      'G: “kalo joined the game”?',
      'G: someone... joined?',
      () => this.gob.model.emote('spin', 0.9),
      'G: someone JOINED!',
      'G: oh no. oh no oh no. am i presentable? is my name tag straight?',
      () => this.gob.model.emote('shiver', 1),
      'G: okay. okay. be normal. go to the spawn. say hi.',
    ]);
    this.gob.model.emoteName = null;
    this.cutOut();
    this.objective('Go to the Spawn');
    await this.reach([SP.spawn[0], 0, SP.spawn[1]], 7);

    // Kalo appears
    await this.cutIn();
    const k = this.kalo;
    this.showKalo(); k.teleport(SP.spawn[0], 4, SP.spawn[1], Math.PI);
    k.idle();
    this.gob.setPosition(SP.spawn[0], null, SP.spawn[1] - 5.5, 0);
    this.camSet([SP.spawn[0] + 6, 3, SP.spawn[1] - 3], [SP.spawn[0], 1.8, SP.spawn[1]]);
    this.sfx('spawn'); g.fx.sparkle(new THREE.Vector3(SP.spawn[0], 1.5, SP.spawn[1])); g.fx.burst(new THREE.Vector3(SP.spawn[0], 1, SP.spawn[1]), { count: 30, color: 0xffffff, speed: 3, up: 3, life: 1 });
    await this.wait(1.4);
    k.lookAt(v3([20, 2, 0]));
    await this.say([
      'K: WHOA.',
      () => { k.lookAt(v3([-20, 2, 0])); },
      'K: ok this place is SO colorful. is this a new game?? there’s FLOWERS. there’s a SKY.',
      () => { k.lookAt(null); k.faceGob(); this.faceEachOther(); },
    ]);
    await this.twoShot(1, 6.5, 2.2, 1);
    await this.say([
      'K: oh! hi! um.',
      'K: are you... a block?',
      'G: ...h-hi.',
      'G: i’m not a block. i’m GOB.',
      () => k.pose('think'),
      'K: “hi im gob.” haha, you have a NAME TAG. that’s so cute.',
      () => k.pose('wave'),
      'K: hi gob! i’m Kalo!',
      'K: it says it over my head too, see? K-A-L-O.',
      () => k.pose(null),
      'G: ...',
      'G: hi, kalo.',
      'G: (he said hi. he said hi FIRST.)',
      'K: so is this your world? where is everybody?',
      'G: it’s just me. it’s... a quiet server.',
      'G: but it’s a really nice place! there’s a pond. and a playground. and flowers. and a hill.',
      () => k.pose('cheer'),
      'K: a HILL. ok you have to show me EVERYTHING.',
      () => k.pose(null),
      'G: really?',
      'K: duh!! lead the way, gobby.',
      () => this.gob.model.emote('happy', 1.4),
      'G: (gobby.)',
    ]);
    this.cutOut();
    k.follow();
  }

  async tour() {
    const k = this.kalo, g = this.game;
    k.follow();
    this.objective('Show Kalo around', '0/3');
    // Pond
    await this.reach([PX + 9, 0, PZ], 6);
    k.lookAt(this.H.ducks[0].position);
    await this.say([
      'K: DUCKS. do they have names?',
      'G: the big one is Mr. Duck. the little ones are Also Mr. Duck.',
      () => this.sfx('quack'),
      'K: lmao. hi mr duck. hi also mr duck.',
      'K: can we swim? ...wait no. i can’t swim in this game. i just sink. it’s embarrassing.',
    ]);
    k.lookAt(null);
    this.progress('1/3');
    // Playground
    await this.reach([GX - 6, 0, GZ - 3], 6);
    await this.say(['K: A SLIDE. ok. ok. watch this.']);
    await this.cutIn();
    this.camSet([GX + 2, 3.5, GZ + 9], [GX - 1, 2, GZ]);
    k.physics = true;
    await k.goto(GX - 8, GZ, { run: true });
    k.teleport(GX - 3, 3.6, GZ, Math.PI / 2); k.physics = false; k.idle();
    await this.wait(0.4);
    k.pose('cheer');
    const from = new THREE.Vector3(GX - 1.6, 3.6, GZ), to = new THREE.Vector3(GX + 3.4, 0.1, GZ);
    this.sfx('whoosh');
    await this.anim(0.9, (t) => { k.body.pos.lerpVectors(from, to, t * t); });
    k.body.vel.set(0, 0, 0); k.physics = true; k.pose(null); this.sfx('land');
    k.faceGob();
    await this.say([
      'K: WOOOOOO',
      'K: ok you HAVE to try that.',
      'G: i’ve done it before. eight hundred and forty six times.',
      'K: by yourself??',
      'G: ...it’s more fun with someone watching. i think.',
      'K: then next time i’m watching. every time.',
    ]);
    this.cutOut();
    k.follow();
    this.progress('2/3');
    // Fort site
    await this.reach([FX, 0, FZ], 6);
    await this.say([
      'K: what’s this wooden thing for?',
      'G: i was going to build something here. but i didn’t know what.',
      () => k.pose('point'),
      'K: a FORT. obviously. a secret base. with a flag.',
      () => k.pose(null),
      'G: a fort...',
      'K: ok but first...',
    ]);
    this.progress('3/3');
  }

  async tag() {
    const k = this.kalo, g = this.game;
    k.idle(); k.teleport(this.gob.body.pos.x + 1.6, null, this.gob.body.pos.z + 0.6); k.faceGob();
    await this.say([
      () => { k.pose('reach'); this.gob.model.emote('surprised', 0.6); this.sfx('pop'); },
      'K: TAG! YOU’RE IT!',
      () => k.pose(null),
      'G: tag? what’s—',
      'K: you have to catch me! byeeee!',
    ]);
    k.fleeCenter = { x: -6, z: -4, r: 40 };
    const quips = [
      ['K: ACK. ok ok. lucky tag. AGAIN!'],
      ['K: how are you so FAST?? you don’t even have LEGS'],
      ['K: ok ok ok I GIVE UP. you win, gobby.'],
    ];
    this.objective('Tag Kalo!', '0/3');
    for (let i = 0; i < 3; i++) {
      k.fleeSpeed = 5.4 + i * 0.4;
      k.flee();
      await this.until(() => dist2(k.pos.x, k.pos.z, this.gob.body.pos.x, this.gob.body.pos.z) < 2.0);
      k.idle(); k.faceGob(); this.sfx('pop'); g.fx.confetti(k.pos.clone().add(new THREE.Vector3(0, 2, 0)), 25);
      this.progress(`${i + 1}/3`);
      this.gob.model.emote('happy', 1);
      await this.say(quips[i]);
    }
    await this.say([
      'G: (you need two people for tag.)',
      'G: (i never played it before.)',
      'G: that was the best game of tag ever.',
      'K: it was literally your FIRST game of tag',
      'G: still.',
    ]);
    k.follow();
  }

  async bricks() {
    const k = this.kalo, g = this.game;
    await this.say([
      'K: ok. FORT TIME. we need bricks. colorful ones.',
      'G: there are some lying around! i used to stack them. and then un-stack them.',
      'K: you find them, i’ll be the architect. that’s a real job.',
    ]);
    k.goto(FX, FZ).then(() => { k.pose('think'); k.face(this.gob.body.pos); });
    this.objective('Find colorful bricks for the fort', '0/8');
    const colors = [0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff, 0xffa531, 0xff8fb1, 0x5ad1c8];
    const spots = [[GX + 5, 1.4, GZ + 3.5], [GX - 1, 3.6, GZ + 4.5], [HX + 9, 1.2, HZ - 9], [PX - 9, 0, PZ - 7.5], [0, 0, -37], [-24, 0.68, 18], [-7, 0, 17], [-50, 0, -14]];
    const cheers = ['Kalo: nice!!', 'Kalo: ooh that’s a good one', 'Kalo: keep goin gobby', 'Kalo: the fort is gonna be SO cool', 'Kalo: wait how did u get up there', 'Kalo: halfway!!', 'Kalo: one more after this!', 'Kalo: YESSS'];
    let c = 0;
    const order = spots.map((p, i) => ({ pos: p, i }));
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const o of order) { if (o.got) continue; const d = dist2(o.pos[0], o.pos[2], p.x, p.z); if (d < bd) { bd = d; best = v3(o.pos); } } return best || p; }, 1.6);
    await this.collectAll(order, (it) => this.brick(colors[it.i]), { sound: 'brick', onEach: (it) => { it.got = true; this.chat(cheers[c++ % cheers.length], 'kalo-chat'); } });
    this.unmark();
    this.objective('Bring the bricks to Kalo');
    k.pose(null);
    await this.reach([FX, 0, FZ], 6);
    // Build cutscene
    await this.cutIn();
    this.camSet([FX + 9, 6, FZ + 9], [FX, 1.2, FZ]);
    k.teleport(FX - 1, null, FZ + 5.5); k.faceGob(); this.gob.setPosition(FX + 1.5, null, FZ + 5.5, Math.PI);
    await this.wait(0.6);
    await this.say(['K: ok. hand them over. i have a VISION.']);
    k.pose('cheer');
    for (const [i, m] of this.H.fortParts.entries()) {
      const home = m.userData.home.clone(); const start = this.gob.body.pos.clone().add(new THREE.Vector3(0, 1, 0));
      m.visible = true; m.position.copy(start);
      this.sfx('brick', { pitch: 1 + i * 0.06 });
      await this.anim(0.35, (t) => { m.position.lerpVectors(start, home, t); m.position.y += Math.sin(t * Math.PI) * 3; });
      g.fx.dust(home);
    }
    this.H.showFort(true);
    const pole = this.H.fortPole, flag = this.H.fortFlag;
    pole.visible = flag.visible = true; const fy = flag.position.y;
    await this.anim(1.2, (t) => { flag.position.y = 1 + (fy - 1) * t; });
    this.sfx('collect'); g.fx.confetti(new THREE.Vector3(FX, 4, FZ), 90);
    this.flags.fortBuilt = true;
    await this.cam([FX + 6, 3, FZ + 10], [FX, 2.6, FZ], 1.5);
    k.pose(null);
    await this.say([
      'K: the GOB AND KALO FORT. established today.',
      'G: it has both our names on it.',
      'K: obviously. we’re co-owners.',
      () => this.gob.model.emote('bounce', 1.5),
      'G: co-owners.',
    ]);
    this.cutOut();
    k.follow();
  }

  async picnic() {
    const k = this.kalo, g = this.game;
    this.mood('sunset', 25);
    g.sfx.setAmbience({ birds: 0.4, wind: 0.15 });
    await this.say([
      'K: whoa, the sky’s going orange.',
      'K: you said there was a hill?',
      'G: the best hill. come on!',
    ]);
    k.follow();
    this.objective('Watch the sunset from the hill');
    await this.reach(SP.hillTop, 3.5);
    this.objective(null);
    await this.cutIn();
    this.music('title', 3);
    this.mood('sunset', 2);
    const top = SP.hillTop;
    k.teleport(top[0] - 1.6, null, top[2] + 1.6, -Math.PI / 2); k.idle(); k.pose('sit');
    this.gob.setPosition(top[0] - 1.6, null, top[2] + 0.1, -Math.PI / 2);
    this.camSet([top[0] + 7, top[1] + 3.2, top[2] + 1.5], [top[0] - 6, top[1] + 1.2, top[2] + 0.8]);
    await this.wait(1.5);
    await this.cam([top[0] - 5.5, top[1] + 1.7, top[2] + 4.2], [top[0] - 1.4, top[1] + 1.0, top[2] + 0.9], 6);
    const r = await this.say([
      'K: ...',
      'K: ok this is actually really nice.',
      'G: i come up here every evening. i count the clouds.',
      'K: how many today?',
      'G: fourteen. one looked like a duck.',
      'K: haha.',
      'K: ...can i tell you something kinda weird?',
      'G: okay.',
      'K: the place i came from. it closed down.',
      'K: one day everyone was there, and the next day the lobby said 0 players. and then it was just me.',
      'K: i walked for a REALLY long time. past a bunch of old places. all empty.',
      'K: and then i found your fence. and there were flowers. and you.',
      'G: ...',
      'G: i know what 0 players feels like.',
      'K: yeah?',
      'G: yeah.',
      'K: ...',
      'K: well. not anymore. now it says 1.',
      'G: i don’t think it counts me.',
      'K: it should. you’re the most important player here.',
      () => this.gob.model.emote('happy', 1),
      'K: hey gobby.',
      'K: best friends?',
      { choice: ['Best friends!', '...best friends.'] },
    ]);
    await this.say(r.choice === 0 ? ['K: YESSS. best friends.'] : ['K: haha you’re so dramatic. yes. best friends.']);
    this.mood('night', 8);
    await this.say([
      'K: i have to log off soon. my battery’s dying.',
      'K: but i’ll come back tomorrow. same place.',
      'G: same place tomorrow?',
      'K: same place tomorrow. promise.',
    ]);
    await this.wait(2);
    k.pose(null); await this.wait(0.5); k.pose('wave');
    await this.say(['K: night, gobby!']);
    this.sfx('leave'); g.fx.sparkle(k.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffd23f);
    k.model.root.visible = false; k.active = false;
    this.chat('Kalo left the game.', 'leave');
    this.H.onlineBoard(0); g.hud.playersOnline(0);
    g.sfx.setAmbience({ crickets: 1, wind: 0.1 });
    await this.wait(1.5);
    await this.gobClose(2.8, 0.3, 2);
    await this.say([
      'G: ...',
      'G: bye, kalo.',
      'G: (it’s quiet again.)',
      'G: (but it’s a different kind of quiet.)',
      'G: (the kind with a tomorrow in it.)',
    ]);
    await this.cam([top[0], top[1] + 30, top[2] + 10], [top[0], top[1], top[2]], 6);
    await this.game.fade(true, 2);
    this.cutOut();
  }
}
