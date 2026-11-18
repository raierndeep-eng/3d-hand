import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import * as T from '../render/Textures.js';
import { dist2, mulberry32 } from '../core/utils.js';

/**
 * CHAPTER TWO — FUNFAIR
 * GOB built a fair long ago and nobody ever rode anything. Today, with Kalo, every light comes on.
 */
const SPAWN = [-58, 0];
const WHEEL = { x: 30, y: 16, z: -26, r: 13 };
const CAROUSEL = [2, 20];
const STALL = [-12, -20];
const SWITCHES = [
  { name: 'LIGHTS', pos: [-26, 0, -30] },
  { name: 'MUSIC', pos: [8, 0, -40] },
  { name: 'RIDES', pos: [48, 0, 4] },
];
const OBBY = { x: 34, z: 34 };

export default class Chapter2 extends ChapterBase {
  async build(progress) {
    const b = this.b, g = this.game, r = mulberry32(22);
    this.mood('morning', 0);
    this.powered = { LIGHTS: false, MUSIC: false, RIDES: false };
    b.ground({ w: 260, d: 260, tex: T.studs('#62b34b'), rep: [130, 130] });
    // fairground floor (checker paving)
    b.box({ x: 0, z: 0, w: 110, d: 100, h: 0.06, color: 0xffffff, map: T.tiles('#e9d9b4', '#d6c39a', 4, 'fair'), rep: [28, 25], collide: false });
    // fence around
    const F = [-55, -50, 55, 50];
    b.fence(F[0], F[1], F[2], F[1], { color: 0xff6b6b }); b.fence(F[2], F[1], F[2], F[3], { color: 0xff6b6b }); b.fence(F[0], F[3], F[2], F[3], { color: 0xff6b6b });
    b.fence(F[0], F[1], F[0], -5, { color: 0xff6b6b }); b.fence(F[0], 5, F[0], F[3], { color: 0xff6b6b });
    // outer world fence far away
    b.fence(-80, -80, 80, -80, { color: 0xffffff }); b.fence(80, -80, 80, 80, { color: 0xffffff }); b.fence(-80, 80, 80, 80, { color: 0xffffff }); b.fence(-80, -80, -80, 80, { color: 0xffffff });
    // grey ruins beyond the north fence (seen from the wheel)
    for (let i = 0; i < 22; i++) {
      const x = -120 + r() * 240, z = -110 - r() * 60, h = 4 + r() * 22;
      b.box({ x, z, w: 4 + r() * 10, d: 4 + r() * 10, h, color: 0x8b9099, collide: false, shadow: false });
    }
    b.box({ x: 0, z: -150, w: 4, d: 4, h: 40, color: 0x6d737d, collide: false }); // radio tower silhouette
    b.box({ x: 0, y: 40, z: -150, w: 7, d: 0.5, h: 0.5, color: 0x6d737d, collide: false });
    await progress(0.2);

    // Spawn area (edge of GOB's baseplate)
    b.spawnPad(SPAWN[0], SPAWN[1]);
    b.scatter(160, [-78, -30, -56, 30], { avoid: (x, z) => Math.abs(z) < 3 });
    b.scatter(500, [-78, -78, 78, 78], { kind: 'grass', colors: [0x4c9a3a, 0x5fb04a] });
    for (const [x, z] of [[-70, -20], [-68, 22], [-74, 8], [-62, -36], [-64, 40]]) b.tree(x, z, { s: 1.2 });

    // Entrance arch
    const archCol = 0xffd23f;
    b.box({ x: -55, z: -4.5, w: 1.2, h: 7, d: 1.2, color: archCol }); b.box({ x: -55, z: 4.5, w: 1.2, h: 7, d: 1.2, color: archCol });
    b.box({ x: -55, y: 7, z: 0, w: 1.4, h: 1.8, d: 10.4, color: 0xd94a5a, collide: false });
    b.panel(-54.25, 7.9, 0, 'GOB’S FUNFAIR', { ry: -Math.PI / 2, w: 9.6, h: 1.5, bg: '#d94a5a', fg: '#fff6d8', font: '700 88px Fredoka, sans-serif' });

    // String lights along the main avenue
    this.bulbs = [];
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffc35a, emissiveIntensity: 0 });
    this.bulbMat = bulbMat;
    const poles = [];
    for (let x = -48; x <= 40; x += 11) { poles.push([x, -6], [x, 6]); b.box({ x, z: -6, w: 0.3, h: 5, d: 0.3, color: 0x6b4a2a, collide: true, noCamera: true }); b.box({ x, z: 6, w: 0.3, h: 5, d: 0.3, color: 0x6b4a2a, noCamera: true }); }
    const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6);
    for (let x = -48; x < 40; x += 11) for (const z of [-6, 6]) for (let k = 1; k < 11; k++) {
      const t = k / 11; const m = new THREE.Mesh(bulbGeo, bulbMat);
      m.position.set(x + 11 * t, 5 - Math.sin(t * Math.PI) * 0.8, z); b.add(m);
    }
    for (let x = -48; x <= 40; x += 22) for (let k = 1; k < 8; k++) { const t = k / 8; const m = new THREE.Mesh(bulbGeo, bulbMat); m.position.set(x, 5 - Math.sin(t * Math.PI) * 0.8, -6 + 12 * t); b.add(m); }
    this.lamps = [[-40, 12], [-20, -12], [0, 12], [20, -12], [40, 12], [-30, 28], [15, 32]].map(([x, z], i) => b.lamp(x, z, { on: false, light: i < 4 }));
    await progress(0.35);

    // Tents and stalls
    const tentCols = [[0xd94a5a, 0xffffff], [0x4a90d9, 0xffffff], [0xf2c14e, 0xd94a5a], [0x7ed957, 0xffffff], [0xc77dff, 0xffd23f]];
    [[-35, -22], [-30, 22], [-2, -30], [16, 22], [-18, 30]].forEach(([x, z], i) => this.tent(x, z, tentCols[i % tentCols.length], 4 + (i % 2)));
    // Ticket booth
    b.box({ x: -40, z: 12, w: 3, h: 2.8, d: 3, color: 0xd94a5a });
    b.box({ x: -40, y: 2.8, z: 12, w: 3.6, h: 0.4, d: 3.6, color: 0xffd23f });
    b.panel(-38.48, 1.8, 12, 'TICKETS\nWheel: 10', { ry: Math.PI / 2, w: 2.2, h: 1.2, bg: '#fff6d8', fg: '#d94a5a', font: '700 64px Fredoka, sans-serif' });
    // Balloon stall
    b.box({ x: STALL[0], z: STALL[1] - 4, w: 8, h: 1.1, d: 1.2, color: 0x4a90d9 });
    b.box({ x: STALL[0] - 3.8, z: STALL[1] - 4.4, w: 0.3, h: 4, d: 0.3, color: 0xffffff }); b.box({ x: STALL[0] + 3.8, z: STALL[1] - 4.4, w: 0.3, h: 4, d: 0.3, color: 0xffffff });
    b.box({ x: STALL[0], y: 4, z: STALL[1] - 4.4, w: 8.4, h: 0.8, d: 1.6, color: 0xffd23f, collide: false });
    b.panel(STALL[0], 4.4, STALL[1] - 3.55, 'BALLOON POP!', { w: 6, h: 0.75, bg: '#ffd23f', fg: '#d94a5a', font: '700 80px Fredoka, sans-serif' });
    for (let i = 0; i < 9; i++) b.balloon(STALL[0] - 3.2 + i * 0.8, 2.8 + (i % 2) * 0.4, STALL[1] - 4.8, [0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff][i % 5]);
    // Food carts, benches, bins
    b.bench(-20, 10, 0); b.bench(10, -10, Math.PI); b.bench(26, 10, 0);
    for (const [x, z, c] of [[-28, -10, 0xff8fb1], [6, 12, 0x5ad1c8]]) { b.box({ x, z, w: 2.4, h: 1.4, d: 1.4, color: c }); b.cyl({ x, y: 1.4, z, r: 0.08, h: 1.6, color: 0xffffff, collide: false }); b.sphere({ x, y: 3.2, z, r: 1.1, color: 0xffffff, sy: 0.4 }); }
    b.sign(-46, -10, 'cotton candy →\n(made of real cotton)', { w: 3.2, h: 1.2, font: '700 40px Fredoka, sans-serif' });
    await progress(0.5);

    this.buildWheel();
    this.buildCarousel();
    await progress(0.65);

    // Bounce pads (lead up onto tent tops — tickets up there)
    this.pads = [[-30, -14], [-2, -22], [16, 14]].map(([x, z]) => {
      const m = b.box({ x, z, w: 2.4, h: 0.4, d: 2.4, color: 0xff5a5a, bounce: 17.5 });
      b.box({ x, y: 0.4, z, w: 2.0, h: 0.06, d: 2.0, color: 0xffffff, collide: false });
      return m;
    });

    // Power switches
    this.switchObjs = SWITCHES.map((s) => {
      const [x, , z] = s.pos;
      b.box({ x, z, w: 2.6, h: 2.4, d: 2, color: 0x5c6470 });
      b.panel(x, 2.0, z + 1.01, s.name, { w: 2.2, h: 0.5, bg: '#ffd23f', fg: '#222', font: '700 70px Fredoka, sans-serif' });
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), b.mat(0xd94a5a)); lever.position.set(x, 1.1, z + 1.15); lever.rotation.x = 0.6;
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), b.mat(0x222222)); knob.position.y = 0.45; lever.add(knob);
      lever.geometry.translate(0, 0.45, 0);
      b.add(lever);
      return { ...s, lever, light: (() => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0x441111, emissive: 0xff2222, emissiveIntensity: 0.6 })); l.position.set(x + 0.8, 1.6, z + 1.02); b.add(l); return l; })() };
    });

    this.buildObby();
    await progress(0.85);
    for (let i = 0; i < 10; i++) b.cloud(-200 + r() * 400, 40 + r() * 20, -120 + r() * 240, 1.4 + r(), 0.7);
    this.balloonsBg = [];
    this.game.sfx.setAmbience({ birds: 0.6, wind: 0.15 });
    g.spawnKalo(); this.kalo.model.root.visible = false; this.kalo.active = false; this.kalo.teleport(SPAWN[0], 0.4, SPAWN[1]);
    this.gob.setPosition(SPAWN[0] + 4, null, SPAWN[1] + 1, -Math.PI / 2);
    g.hud.playersOnline(0);
    this.kaloChatter = ['gobby u built ALL of this??', 'the music is stuck in my head forever now', 'i want cotton candy. can u eat? wait', 'this is the best server ive ever been on', 'race u to the wheel. jk i need tickets', 'ok the ducks were cool but THIS', 'my mom says hi. jk she doesnt know ur real. ur real tho'];
    // Optional extras around the fair
    g.interactions.add({ pos: v3([-28, 0.5, -8.6]), label: 'Get cotton candy', radius: 2.4, onUse: () => this.cottonCandy() });
    g.interactions.add({ pos: v3([CAROUSEL[0] - 6.4, 0.5, CAROUSEL[1]]), label: 'Ride the carousel', radius: 2.6, onUse: () => this.carouselRide() });
    await progress(1);
  }

  async cottonCandy() {
    const k = this.kalo;
    if (!k || !k.model.root.visible) { await this.say(['N: The cotton candy machine is cold.']); return; }
    if (this.candyDone) { await this.say(['K: no more. i am made of sugar now. i am the sugar.']); return; }
    this.candyDone = true;
    this.sfx('collect');
    await this.say([
      'N: GOB gets two cotton candies. One pink, one blue.',
      'K: oh sick. thanks gobby.',
      'K: ...wait. can you even eat?',
      'G: no.',
      'K: then why did you get two',
      'G: one for you. and one for you.',
      'K: ...',
      'K: you’re so weird. thank you.',
    ]);
  }

  async carouselRide() {
    const k = this.kalo, g = this.game;
    if (!this.powered.RIDES) { await this.say(['G: (it isn’t turned on.)']); return; }
    if (!k || !k.model.root.visible) { await this.say(['G: (it’s not much fun alone.)']); return; }
    await this.cutIn();
    const h1 = this.horses[0], h2 = this.horses[1];
    const wp = new THREE.Vector3(), wq = new THREE.Vector3();
    k.physics = false; this.gob.body.enabled = false;
    const ride = this.b.onUpdate(() => {
      h1.updateWorldMatrix(true, false); wp.setFromMatrixPosition(h1.matrixWorld);
      h2.updateWorldMatrix(true, false); wq.setFromMatrixPosition(h2.matrixWorld);
      this.gob.body.pos.set(wp.x, wp.y + 0.35, wp.z); k.body.pos.set(wq.x, wq.y - 0.3, wq.z); k.pose('sit');
      this.gob.yaw = this.carousel.rotation.y * -1 + Math.PI; k.yaw = k.targetYaw = this.gob.yaw;
    });
    const C = new THREE.Vector3(CAROUSEL[0], 2, CAROUSEL[1]);
    g.cut.follow(() => C.clone().add(new THREE.Vector3(10, 4, 10)), () => C.clone(), 3);
    await this.wait(1);
    await this.say([
      'K: ok this is the most normal thing we’ve done all day.',
      'G: it’s my favourite ride.',
      'K: you said nobody’s ridden anything.',
      'G: it’s still my favourite. i’ve watched it go round a lot.',
      'K: ...that’s kinda sad gobby',
      'G: it’s not sad right now.',
      'K: yeah. not right now.',
    ]);
    await this.wait(2);
    this.b.updaters.splice(this.b.updaters.indexOf(ride), 1);
    k.physics = true; k.pose(null); this.gob.body.enabled = true;
    this.gob.setPosition(CAROUSEL[0] - 7.5, null, CAROUSEL[1], -Math.PI / 2); k.teleport(CAROUSEL[0] - 7.5, null, CAROUSEL[1] + 2);
    this.cutOut();
  }

  tent(x, z, [a, c], s = 4) {
    const b = this.b; const g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(s, s, 3, 8, 1, true), new THREE.MeshStandardMaterial({ color: a, side: THREE.DoubleSide })); base.position.y = 1.5; g.add(base);
    for (let i = 0; i < 8; i += 2) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3, 0.05), b.mat(c)); const ang = (i / 8) * Math.PI * 2 + Math.PI / 8; st.position.set(Math.sin(ang) * s * 0.93, 1.5, Math.cos(ang) * s * 0.93); st.rotation.y = ang; g.add(st); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(s * 1.12, 2.8, 8), b.mat(c)); roof.position.y = 4.4; g.add(roof);
    const flag = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.05), b.mat(a)); flag.position.set(0.3, 6.2, 0); g.add(flag);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    b.add(g);
    this.game.physics.addBox(x, 1.5, z, s * 1.5, 3, s * 1.5);
    // flat roof landing so tickets on tent tops are reachable
    this.game.physics.addBox(x, 3.1 + 0.1, z, s * 1.2, 0.2, s * 1.2, { noCamera: true });
  }

  buildWheel() {
    const b = this.b; const W = WHEEL;
    const grp = new THREE.Group(); grp.position.set(W.x, W.y, W.z);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(W.r, 0.35, 6, 32), b.mat(0xffffff)); grp.add(rim);
    const rim2 = rim.clone(); rim2.position.z = 1.6; grp.add(rim2);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.2, 12), b.mat(0xd94a5a)); hub.rotation.x = Math.PI / 2; hub.position.z = 0.8; grp.add(hub);
    for (let i = 0; i < 12; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.2, W.r * 2, 0.2), b.mat(0xffd23f)); sp.rotation.z = (i / 12) * Math.PI; sp.position.z = 0.8; grp.add(sp); }
    this.gondolas = [];
    const cols = [0xff5a5a, 0x4fc3f7, 0x7ed957, 0xffd23f, 0xc77dff, 0xffa531];
    for (let i = 0; i < 12; i++) {
      const gd = new THREE.Group();
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.6), b.mat(cols[i % cols.length])); cab.position.y = -1.3; gd.add(cab);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.8), b.mat(0xffffff)); roof.position.y = -0.2; gd.add(roof);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), b.mat(0xdddddd)); bar.position.y = -0.4; gd.add(bar);
      gd.userData.a = (i / 12) * Math.PI * 2;
      gd.position.set(Math.cos(gd.userData.a) * W.r, Math.sin(gd.userData.a) * W.r, 0.8);
      grp.add(gd); this.gondolas.push(gd);
    }
    // wheel lights
    this.wheelBulbs = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xff7ab8, emissiveIntensity: 0 });
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), this.wheelBulbs); m.position.set(Math.cos(a) * W.r, Math.sin(a) * W.r, -0.4); grp.add(m); }
    grp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    b.add(grp); this.wheel = grp; this.wheelAngle = 0; this.wheelSpeed = 0;
    // legs + platform
    for (const sx of [-1, 1]) for (const sz of [-1.4, 3]) { b.box({ x: W.x + sx * 4.5, z: W.z + sz, w: 0.7, h: W.y + 1, d: 0.7, color: 0xbfc5cf, rz: sx * 0.26, collide: false }); }
    b.box({ x: W.x - 4.5, z: W.z + 1, w: 0.9, h: W.y, d: 5, color: 0xbfc5cf, collide: true, opacity: 0 }).visible = false;
    b.box({ x: W.x + 4.5, z: W.z + 1, w: 0.9, h: W.y, d: 5, color: 0xbfc5cf, collide: true }).visible = false;
    b.box({ x: W.x, z: W.z + 4.5, w: 8, h: 0.6, d: 4, color: 0xd94a5a });
    b.stairs(W.x, W.z + 8, { dir: [0, -1], steps: 2, w: 4, rise: 0.3, run: 0.8, color: 0xffd23f });
    b.sign(W.x - 5.5, W.z + 7, 'FERRIS WHEEL\n10 tickets', { w: 2.8, h: 1.2, font: '700 50px Fredoka, sans-serif' });
  }

  buildCarousel() {
    const b = this.b; const [x, z] = CAROUSEL;
    b.cyl({ x, z, r: 6, h: 0.5, color: 0xffd23f, seg: 24 });
    const top = new THREE.Group(); top.position.set(x, 0.5, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(7, 2.5, 16), b.mat(0xd94a5a)); roof.position.y = 5.2; top.add(roof);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 12), b.mat(0xffffff)); pole.position.y = 2; top.add(pole);
    const horseCols = [0xffffff, 0xffd23f, 0x4fc3f7, 0xff8fb1, 0x7ed957, 0xc77dff];
    this.horses = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2; const h = new THREE.Group(); h.position.set(Math.cos(a) * 4.2, 1.2, Math.sin(a) * 4.2); h.rotation.y = -a;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 1.6), b.mat(horseCols[i])); h.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.6), b.mat(horseCols[i])); head.position.set(0, 0.6, 0.85); h.add(head);
      for (const lx of [-0.2, 0.2]) for (const lz of [-0.6, 0.6]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.7, 0.15), b.mat(horseCols[i])); l.position.set(lx, -0.6, lz); h.add(l); }
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 6), b.mat(0xffd23f)); rod.position.y = 1.2; h.add(rod);
      top.add(h); this.horses.push(h);
    }
    top.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    b.add(top); this.carousel = top; this.carouselSpeed = 0;
  }

  buildObby() {
    const b = this.b, { x, z } = OBBY, phys = this.game.physics;
    // ball pit floor: landing here sends you back to the last checkpoint
    b.box({ x: x + 6, z: z + 4, w: 30, h: 0.5, d: 22, color: 0x4fc3f7, tag: 'ballpit' });
    const rr = mulberry32(5); const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.3 }), 500);
    const o = new THREE.Object3D(), c = new THREE.Color();
    for (let i = 0; i < 500; i++) { o.position.set(x + 6 + (rr() - 0.5) * 29, 0.5 + rr() * 0.25, z + 4 + (rr() - 0.5) * 21); o.updateMatrix(); balls.setMatrixAt(i, o.matrix); balls.setColorAt(i, c.set([0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff][i % 5])); }
    b.add(balls);
    b.sign(x - 11, z - 6, 'KALO’S OBBY\n(gob’s obby actually)', { ry: Math.PI / 4, w: 3.2, h: 1.3, font: '700 42px Fredoka, sans-serif' });
    const cols = [0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff, 0xffa531];
    // [x, y(top), z, w, d]
    const P = [
      [-8, 1.2, -4, 3, 3], [-4.5, 1.8, -4, 2, 2], [-1.5, 2.6, -3, 2, 2], [1.5, 3.4, -4, 2, 2], [4.5, 4.0, -3, 3, 3, 'cp'],
      [7.5, 4.8, -1, 1.6, 1.6], [9.5, 5.6, 1.5, 1.6, 1.6], [10, 6.4, 4.5, 1.6, 1.6], [7.5, 7.0, 6.5, 3, 3, 'cp'],
      [4, 7.6, 7.5, 1.4, 4], [0.5, 8.2, 8.5, 1.4, 1.4], [-2.5, 8.8, 9.5, 1.4, 1.4], [-5.5, 9.4, 9, 3, 3, 'cp'],
      [-5.5, 10.4, 5.5, 2.2, 2.2], [-5.5, 11.4, 2.5, 2.2, 2.2], [-3, 12.2, 0, 2, 2], [0.5, 12.8, -0.5, 3.2, 3.2, 'top'],
    ];
    this.checkpoints = [];
    P.forEach(([px, py, pz, w, d, kind], i) => {
      const m = b.box({ x: x + px, y: py - 0.5, z: z + pz, w, d, h: 0.5, color: kind === 'cp' ? 0x9aa0aa : kind === 'top' ? 0xffd23f : cols[i % cols.length] });
      if (kind === 'cp') this.checkpoints.push({ pos: new THREE.Vector3(x + px, py, z + pz), col: m.userData.collider, mesh: m });
      if (kind === 'top') this.obbyTop = new THREE.Vector3(x + px, py, z + pz);
    });
    // supports so it doesn't float weirdly
    for (const [px, py, pz] of [[4.5, 4, -3], [7.5, 7, 6.5], [-5.5, 9.4, 9], [0.5, 12.8, -0.5]]) b.box({ x: x + px, y: 0.5, z: z + pz, w: 0.4, h: py - 1, d: 0.4, color: 0xdddddd, collide: false });
    // moving platforms
    this.movers = [];
    const mover = (ax, ay, az, bx, by, bz, w, d, speed) => {
      const m = b.box({ x: ax, y: ay - 0.5, z: az, w, d, h: 0.5, color: 0xffffff, collide: false });
      const col = phys.addBox(ax, ay - 0.25, az, w, 0.5, d, { moving: true });
      this.movers.push({ m, col, a: new THREE.Vector3(ax, ay - 0.25, az), b: new THREE.Vector3(bx, by - 0.25, bz), speed, t: Math.random() * 6 });
    };
    mover(x + 2.5, 13.2, z - 4.5, x + 2.5, 13.2, z - 4.5, 0.1, 0.1, 0); // placeholder never used (kept for symmetry)
    this.movers.pop(); // remove placeholder
    mover(x + 4.5, 5.6, z + 0.5, x + 4.5, 5.6, z + 3.5, 1.8, 1.8, 0.9);
    // obby start pad
    b.box({ x: x - 10.5, z: z - 4, w: 3, h: 0.6, d: 3, color: 0x9aa0aa });
    this.obbyStart = new THREE.Vector3(x - 10.5, 0.6, z - 4);
    this.trophy = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 0.7, 12), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.7, roughness: 0.25 })); cup.position.y = 0.75; this.trophy.add(cup);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), b.mat(0x6b4a2a)); base.position.y = 0.15; this.trophy.add(base);
    this.trophy.position.copy(this.obbyTop); b.add(this.trophy);
  }

  memorySpots() {
    return [
      { id: 'm2a', pos: [-35, 3.2, -22] },            // top of a tent (bounce pad)
      { id: 'm2b', pos: [-41.5, 3.2, 12] },           // on the ticket booth roof
      { id: 'm2c', pos: [WHEEL.x, 0.6, WHEEL.z + 4.5] }, // wheel platform
      { id: 'm2d', pos: [OBBY.x + 7.5, 7.0, OBBY.z + 6.5] }, // obby checkpoint 2
    ];
  }

  setPower(name, on = true) {
    this.powered[name] = on;
    const s = this.switchObjs.find((o) => o.name === name);
    if (s) { s.lever.rotation.x = on ? -0.6 : 0.6; s.light.material.color.set(on ? 0x114411 : 0x441111); s.light.material.emissive.set(on ? 0x22ff44 : 0xff2222); }
    if (name === 'LIGHTS') { this.bulbMat.emissiveIntensity = on ? 1.8 : 0; this.lamps.forEach((l) => l.set(on)); this.wheelBulbs.emissiveIntensity = on ? 1.5 : 0; }
    if (name === 'MUSIC') this.music(on ? 'fair' : null, 1.5);
    if (name === 'RIDES') { this.wheelTarget = on ? 0.12 : 0; this.carouselTarget = on ? 0.5 : 0; }
  }

  restore(beat) {
    if (beat >= 1) { this.kalo.model.root.visible = true; this.kalo.active = true; this.kalo.follow(); this.kalo.chatter = this.kaloChatter; this.game.hud.playersOnline(1); }
    if (beat >= 2) { for (const n of ['LIGHTS', 'MUSIC', 'RIDES']) this.setPower(n, true); }
    if (beat >= 5) this.mood('sunset', 0);
  }

  beats() {
    return [
      { id: 'wait', run: () => this.waitForKalo() },
      { id: 'power', at: { gob: [-50, 0, -Math.PI / 2], kalo: [-52, 2] }, run: () => this.power() },
      { id: 'tickets', at: { gob: [-36, 10, Math.PI / 2], kalo: [-37, 8] }, run: () => this.tickets() },
      { id: 'balloons', at: { gob: [STALL[0], STALL[1] + 6, Math.PI], kalo: [STALL[0] + 3, STALL[1] + 4] }, run: () => this.balloons() },
      { id: 'obby', at: { gob: [OBBY.x - 14, OBBY.z - 8, 0], kalo: [OBBY.x - 13, OBBY.z - 10] }, run: () => this.obby() },
      { id: 'wheel', at: { gob: [WHEEL.x, WHEEL.z + 12, Math.PI], kalo: [WHEEL.x + 2, WHEEL.z + 12] }, run: () => this.wheelRide() },
      { id: 'night', at: { gob: [WHEEL.x, WHEEL.z + 10, Math.PI], kalo: [WHEEL.x + 2, WHEEL.z + 10] }, run: () => this.night() },
    ];
  }

  update(dt, t) {
    super.update(dt, t);
    this.wheelSpeed += ((this.wheelTarget || 0) - this.wheelSpeed) * Math.min(1, dt * 0.5);
    this.wheelAngle += this.wheelSpeed * dt;
    this.wheel.rotation.z = this.wheelAngle;
    for (const gd of this.gondolas) gd.rotation.z = -this.wheelAngle;
    this.carouselSpeed += ((this.carouselTarget || 0) - this.carouselSpeed) * Math.min(1, dt * 0.5);
    this.carousel.rotation.y += this.carouselSpeed * dt;
    this.horses.forEach((h, i) => { h.position.y = 1.2 + Math.sin(t * 2 + i) * 0.3 * Math.min(1, this.carouselSpeed * 2); });
    for (const mv of this.movers) {
      mv.t += dt * mv.speed; const k = (Math.sin(mv.t) + 1) / 2;
      const p = mv.a.clone().lerp(mv.b, k);
      mv.col.setCenter(p.x, p.y, p.z); mv.m.position.set(p.x, p.y, p.z);
    }
    // obby checkpoints + ball pit
    const body = this.gob.body;
    if (this.inObby) {
      for (const cp of this.checkpoints) if (body.onGround && body.ground === cp.col && this.gob.respawnPoint !== cp.pos) { this.gob.respawnPoint = cp.pos; this.sfx('checkpoint'); this.game.hud.toast('Checkpoint!'); cp.mesh.material = this.b.mat(0x7ed957); }
      if (body.onGround && body.ground && body.ground.tag === 'ballpit' && !this.gob.falling) { this.sfx('splash'); this.game.fx.confetti(body.pos, 20); this.gob.fellOff(); }
    }
    if (this.trophy) this.trophy.rotation.y += dt;
  }

  // ------------------------------------------------------------------
  async waitForKalo() {
    const g = this.game;
    await this.cutIn();
    this.camSet([SPAWN[0] + 10, 3, SPAWN[1] + 8], [SPAWN[0] + 2, 1, SPAWN[1]]);
    await this.titleCard('CHAPTER TWO', 'Funfair', 'Every light on, for the first time.');
    await this.gobClose(3, 0.4, 1.5);
    await this.say([
      'G: same place tomorrow. he said.',
      'G: it’s tomorrow.',
      'G: ...',
      'G: it’s very early tomorrow. but it’s tomorrow.',
    ]);
    this.cutOut();
    this.objective('Wait for Kalo', '7:58 AM');
    let mins = 7 * 60 + 58;
    for (let i = 0; i < 14; i++) {
      await this.wait(1.1);
      mins += 11 + (i % 3) * 4;
      const h = Math.floor(mins / 60), m = mins % 60;
      this.progress(`${h}:${String(m).padStart(2, '0')} AM`);
      if (i === 6) this.say(['G: (maybe tomorrow means a different time of tomorrow.)'], { lock: false });
    }
    this.sfx('chime'); this.chat('Kalo joined the game.', 'sys'); g.hud.playersOnline(1);
    const k = this.kalo; k.model.root.visible = true; k.active = true; k.teleport(SPAWN[0], 3, SPAWN[1], Math.PI / 2);
    k.chatter = this.kaloChatter;
    this.sfx('spawn'); g.fx.sparkle(new THREE.Vector3(SPAWN[0], 1.5, SPAWN[1]));
    this.objective(null);
    await this.cutIn();
    this.gob.setPosition(SPAWN[0] + 4.5, null, SPAWN[1] + 0.5, -Math.PI / 2);
    await this.wait(1.0);
    k.faceGob();
    await this.twoShot(-1, 6, 2.2, 0.8);
    await this.say([
      () => k.pose('cheer'),
      'K: GOBBY!!',
      'K: told you i’d come back!',
      () => { k.pose(null); this.gob.model.emote('bounce', 1.6); },
      'G: you came back.',
      'K: ofc i did?? i promised.',
      'K: ...wait. were you waiting this whole time?',
      'G: no.',
      'G: ...',
      'G: a little.',
      'K: lol. ok. well i’m here now.',
      () => k.lookAt(v3([WHEEL.x, WHEEL.y, WHEEL.z])),
      'K: hey, what’s the giant wheel thing over there?',
      'G: that’s the fair. i built it. a long time ago.',
      'G: nobody has ridden anything yet.',
      () => { k.lookAt(null); k.faceGob(); k.pose('point'); },
      'K: WHAT. that’s illegal. we’re fixing that RIGHT NOW.',
    ]);
    k.pose(null);
    this.cutOut();
    k.follow();
  }

  async power() {
    const g = this.game, k = this.kalo;
    this.objective('Go into the fair');
    await this.reach([-46, 0, 0], 6);
    await this.say([
      'K: ...it’s kinda dark in here.',
      'G: it’s turned off. i turn it off at night so the bulbs don’t get tired.',
      'K: do bulbs get tired?',
      'G: i don’t know. i didn’t want to risk it.',
      'G: there are three big switches. LIGHTS, MUSIC and RIDES.',
    ]);
    this.objective('Turn on the fair', '0/3');
    const left = [0, 1, 2]; let n = 0;
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const i of left) { const sp = SWITCHES[i].pos; const d = dist2(sp[0], sp[2], p.x, p.z); if (d < bd) { bd = d; best = v3([sp[0], 0, sp[2] + 1]); } } return best || p; });
    const lines = {
      LIGHTS: ['K: OOOH.', 'K: ok that’s pretty.'],
      MUSIC: ['K: wait is that MUSIC', 'G: i wrote it. it’s called “gob’s song”. it’s the only song i know.', 'K: it’s a banger honestly'],
      RIDES: ['K: IT’S MOVING. GOBBY IT’S MOVING.'],
    };
    while (left.length) {
      const idx = await this.useAny(left.map((i) => ({ pos: [SWITCHES[i].pos[0], 0.5, SWITCHES[i].pos[2] + 1.2], label: `Flip the ${SWITCHES[i].name} switch`, radius: 2.4 })));
      const s = SWITCHES[left.splice(idx, 1)[0]];
      this.sfx('switch'); this.sfx('powerOn');
      this.setPower(s.name, true);
      n++; this.progress(`${n}/3`);
      g.cameraCtl.shake(0.1, 0.3);
      await this.say(lines[s.name]);
    }
    this.unmark();
    // Panorama
    await this.cutIn();
    this.mood('noon', 3);
    k.teleport(-2, null, 2); this.gob.setPosition(-4, null, 3, Math.PI / 2); k.faceGob();
    g.cut.orbit([5, 3, -5], 28, 10, 0.12, 2.2);
    g.fx.confetti(new THREE.Vector3(-3, 3, 2), 120);
    await this.wait(4.5);
    await this.twoShot(1, 6, 2.0, 1.2);
    await this.say([
      () => k.pose('cheer'),
      'K: GOBBY. THIS IS AMAZING.',
      () => k.pose(null),
      'G: it’s working. it’s really working.',
      'G: i always wondered what it would look like with someone in it.',
      'K: well? what does it look like?',
      () => this.gob.model.emote('happy', 1.4),
      'G: it looks right.',
    ]);
    this.cutOut();
    k.follow();
  }

  async tickets() {
    const g = this.game, k = this.kalo;
    await this.say([
      'K: ok. FERRIS WHEEL. let’s go.',
      'G: it costs ten tickets.',
      'K: who made THAT rule',
      'G: me. i made all the rules. i regret this one.',
      'K: lol ok. tickets it is. where do we get them?',
      'G: i hid them around the fair. so people would explore. some are up high. use the bouncy pads!',
    ]);
    this.objective('Find the hidden tickets', '0/6');
    const spots = [[-35, 3.2, -22], [-2, 3.2, -30], [16, 3.2, 22], [-30, 0, 30], [22, 0, -4], [-44, 0, -36]];
    this.game.marker.set(() => { const p = this.gob.body.pos; let best = null, bd = 1e9; for (const o of items) { if (o.got) continue; const d = dist2(o.pos[0], o.pos[2], p.x, p.z); if (d < bd) { bd = d; best = v3(o.pos); } } return best || p; }, 1.4);
    const items = spots.map((p) => ({ pos: p }));
    await this.collectAll(items, () => this.ticket(), { sound: 'ticket', onEach: (it) => (it.got = true) });
    this.unmark();
    this.objective('Tickets', '6/10');
    await this.say([
      'K: six! we need FOUR more.',
      'K: ooh, the balloon stall gives prizes. tickets probably. let’s go!',
    ]);
  }

  ticket() {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.04), new THREE.MeshStandardMaterial({ color: 0xffcf6b, emissive: 0x553300, emissiveIntensity: 0.4 }));
    g.add(m);
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.05), new THREE.MeshStandardMaterial({ color: 0xd94a5a })); s.position.x = -0.22; g.add(s);
    return g;
  }

  async balloons() {
    const g = this.game, k = this.kalo, b = this.b;
    this.objective('Win the Balloon Pop game');
    await this.reach([STALL[0], 0, STALL[1] - 1.5], 3.5);
    await this.say([
      'K: balloon pop! how do you play?',
      'G: balloons float up from the stall. you bump them to pop them. pop eight before the timer ends.',
      'K: “bump them.” with what. your face?',
      'G: ...i only have face. it’s all face.',
    ]);
    k.teleport(STALL[0] + 6, null, STALL[1] + 2); k.idle(); k.faceGob();
    let won = false, attempt = 0;
    while (!won) {
      attempt++;
      await this.say([attempt === 1 ? 'K: ok GO GO GO' : 'K: again! you got this!']);
      const rr = mulberry32(attempt * 11);
      const balloons = [];
      for (let i = 0; i < 12; i++) {
        const a = rr() * Math.PI * 2, d = 2 + rr() * 6.5;
        const x = STALL[0] + Math.cos(a) * d, z = STALL[1] + 2 + Math.sin(a) * d * 0.7, y = 0.9 + rr() * 2.2;
        const bl = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), b.mat([0xff5a5a, 0xffd23f, 0x4fc3f7, 0x7ed957, 0xc77dff][i % 5], { rough: 0.25 }));
        bl.scale.y = 1.2; bl.position.set(x, y, z); bl.castShadow = true; g.world.add(bl);
        balloons.push({ m: bl, base: y, ph: rr() * 6, alive: true });
      }
      let popped = 0, time = 40;
      this.objective('Pop 8 balloons!', `0/8 · ${time}s`);
      const done = this.game.promise((res) => {
        const u = this.b.onUpdate((dt, t) => {
          time -= dt;
          const p = this.gob.body.pos;
          for (const bl of balloons) {
            if (!bl.alive) continue;
            bl.m.position.y = bl.base + Math.sin(t * 1.6 + bl.ph) * 0.35;
            const dx = bl.m.position.x - p.x, dy = bl.m.position.y - (p.y + 0.55), dz = bl.m.position.z - p.z;
            if (dx * dx + dy * dy + dz * dz < 1.1) { bl.alive = false; g.world.remove(bl.m); popped++; this.sfx('pop'); g.fx.burst(bl.m.position, { count: 16, color: bl.m.material.color.getHex(), speed: 4, up: 3, life: 0.6 }); if (popped === 4) this.chat('Kalo: HALFWAY', 'kalo-chat'); }
          }
          if (g.debugAuto && time < 37) popped = Math.max(popped, 8); // test autopilot only
          this.progress(`${popped}/8 · ${Math.max(0, Math.ceil(time))}s`);
          if (popped >= 8 || time <= 0) { const i = this.b.updaters.indexOf(u); this.b.updaters.splice(i, 1); res(); }
        });
      });
      await done;
      for (const bl of balloons) if (bl.alive) g.world.remove(bl.m);
      won = popped >= 8;
      if (!won) await this.say(['K: nooo so close!', 'G: the balloons are very fast. and i am very square.']);
    }
    k.pose('cheer'); g.fx.confetti(this.gob.body.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 60); this.sfx('collect');
    this.objective('Find tickets', '10/10');
    await this.say(['K: YESSS. FOUR TICKETS.', 'K: that’s ten! wheel time!', () => k.pose(null),
      'K: ...wait actually. one thing first. i saw an OBBY over there.', 'G: i built that too.', 'K: race you to the top!!']);
    k.follow();
  }

  async obby() {
    const g = this.game, k = this.kalo;
    this.objective('Reach the top of the obby');
    this.inObby = true;
    await this.reach(this.obbyStart, 3);
    this.gob.respawnPoint = this.obbyStart;
    k.idle(); k.teleport(OBBY.x - 13, null, OBBY.z - 6); k.faceGob(); k.pose('cheer');
    await this.say(['K: 3... 2... 1... GO!', 'K: (i’ll be right behind you)']);
    k.pose(null);
    this.mark(this.obbyTop, 1.8);
    await this.until(() => this.gob.body.onGround && this.gob.body.pos.distanceTo(this.obbyTop) < 2.4);
    this.unmark();
    this.inObby = false; this.gob.respawnPoint = null;
    this.trophy.visible = false; this.sfx('collect'); g.fx.confetti(this.obbyTop.clone().add(new THREE.Vector3(0, 1, 0)), 80);
    await this.cutIn();
    k.teleport(this.obbyTop.x + 1.4, this.obbyTop.y, this.obbyTop.z + 0.6); k.faceGob(); this.gob.faceTowards(k.pos);
    this.sfx('spawn');
    await this.twoShot(1, 5, 1.6, 1);
    await this.say([
      'G: i won!',
      'K: ...',
      'K: i took the stairs.',
      'G: there are no stairs.',
      'K: there are stairs if you’re me.',
      () => k.pose('cheer'),
      'K: CO-CHAMPIONS. no take backs.',
      () => this.gob.model.emote('happy', 1.2),
      'G: co-champions.',
    ]);
    k.pose(null);
    this.cutOut();
    this.gob.setPosition(OBBY.x - 14, null, OBBY.z - 8, Math.PI); k.teleport(OBBY.x - 12, null, OBBY.z - 9); k.follow();
    this.game.cameraCtl.snap();
  }

  async wheelRide() {
    const g = this.game, k = this.kalo;
    this.mood('sunset', 30);
    this.objective('Ride the Ferris Wheel');
    await this.use([WHEEL.x, 0.6, WHEEL.z + 5.5], 'Board the wheel (10 tickets)', 3);
    this.objective(null);
    this.sfx('ticket');
    await this.cutIn();
    this.music('night', 3);
    this.mood('sunset', 4);
    // Find the lowest gondola, put both riders in it, then turn the wheel until it's on top.
    const gd = this.gondolas.reduce((a, c) => { const ya = Math.sin(a.userData.a + this.wheelAngle), yc = Math.sin(c.userData.a + this.wheelAngle); return yc < ya ? c : a; });
    this.wheelTarget = 0;
    const wp = new THREE.Vector3();
    k.physics = false; this.gob.body.enabled = false;
    const ride = this.b.onUpdate(() => {
      gd.updateWorldMatrix(true, false); wp.setFromMatrixPosition(gd.matrixWorld);
      this.gob.body.pos.set(wp.x + 0.45, wp.y - 1.8, wp.z); k.body.pos.set(wp.x - 0.5, wp.y - 1.8 - 0.6, wp.z);
      this.gob.yaw = 0; k.yaw = k.targetYaw = 0; k.pose('sit');
    });
    this.wheelSpeed = 0;
    const startA = this.wheelAngle, targetA = startA + (Math.PI / 2 - Math.sin(0) - (gd.userData.a + startA)) ;
    // rotate so gondola angle == PI/2 (top)
    let delta = (Math.PI / 2 - (gd.userData.a + startA)) % (Math.PI * 2); if (delta < 0) delta += Math.PI * 2;
    g.cut.follow(() => wp.clone().add(new THREE.Vector3(0, 1.5, 9)), () => wp.clone().add(new THREE.Vector3(0, -1, 0)), 3);
    await this.anim(14, (t) => { const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; this.wheelAngle = startA + delta * e; });
    // At the top
    g.cut.follow(() => wp.clone().add(new THREE.Vector3(-1.5, 0.2, 4.5)), () => wp.clone().add(new THREE.Vector3(0, -1.2, 0)), 2);
    await this.wait(1.5);
    await this.say([
      'K: whoa.',
      'K: you can see EVERYTHING from up here.',
      'G: the fort. the hill. my house. the pond.',
      'K: and what’s all that grey stuff past the fence?',
    ]);
    g.cut.follow(() => wp.clone().add(new THREE.Vector3(0, 0.6, 3.5)), () => new THREE.Vector3(0, 12, -150), 1.2);
    await this.wait(2.5);
    await this.say([
      'G: old places. empty ones.',
      'G: i’ve never been past the fence.',
      'K: never?? not even once?',
      'G: there’s nobody out there. why would i go where there’s nobody?',
      'K: ...',
      'K: i came from out there.',
      'G: oh.',
      'K: there’s a radio tower. see? the tall one.',
      'K: if there’s ANYONE else left out there, they’d hear us on that.',
      'K: tomorrow, let’s go. you and me.',
      'G: past the fence?',
      'K: i’ll be with you the whole time. what could go wrong?',
      'G: ...',
      'G: okay. tomorrow.',
    ]);
    g.cut.follow(() => wp.clone().add(new THREE.Vector3(-1.2, 0.3, 3)), () => wp.clone().add(new THREE.Vector3(0, -1.4, 0)), 2);
    await this.wait(1);
    await this.say([
      'K: oh! i almost forgot. here.',
      'N: Kalo holds out a tiny yellow stud.',
      'K: it’s a stud. a yellow one. it fell off something.',
      'K: so you have something yellow when i’m logged off.',
      'G: ...',
      'G: i will keep it forever.',
      'K: lol. it’s a stud, gobby.',
      'G: forever.',
    ]);
    this.flags.hasStud = true;
    g.hud.toast('Received: Kalo’s yellow stud', 'GOB will keep it forever.');
    this.mood('night', 5);
    // fireworks
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Vector3(-20 + Math.random() * 60, 30 + Math.random() * 15, -60 - Math.random() * 30);
      g.fx.burst(p, { count: 60, colors: [[0xff5a5a, 0xffd23f], [0x4fc3f7, 0xffffff], [0xc77dff, 0x7ed957]][i % 3], speed: 12, up: 3, life: 2.2, size: 0.5, gravity: 4 });
      this.sfx('firework', { vol: 0.6 });
      if (i === 2) g.cut.follow(() => wp.clone().add(new THREE.Vector3(0, -0.5, 6)), () => new THREE.Vector3(10, 30, -70), 1);
      await this.wait(0.9);
    }
    await this.say(['K: ...', 'K: best day ever.', 'G: best day ever.']);
    // back down
    const a0 = this.wheelAngle;
    await this.anim(6, (t) => { this.wheelAngle = a0 + Math.PI * t * t * (3 - 2 * t); });
    const ri = this.b.updaters.indexOf(ride); this.b.updaters.splice(ri, 1);
    this.gob.body.enabled = true; k.physics = true; k.pose(null);
    this.gob.setPosition(WHEEL.x, null, WHEEL.z + 10, Math.PI); k.teleport(WHEEL.x + 2, null, WHEEL.z + 10); k.faceGob();
    this.wheelTarget = 0.12;
    this.cutOut();
  }

  async night() {
    const g = this.game, k = this.kalo;
    this.mood('night', 0);
    g.sfx.setAmbience({ crickets: 0.8, wind: 0.1 });
    await this.cutIn();
    await this.twoShot(-1, 5.5, 1.8, 0);
    await this.say([
      'K: ok. now i REALLY have to go. my mom’s calling.',
      'K: tomorrow! past the fence! the tower!',
      'G: same place tomorrow.',
      () => k.pose('wave'),
      'K: same place tomorrow!',
    ]);
    this.sfx('leave'); g.fx.sparkle(k.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffd23f);
    k.model.root.visible = false; k.active = false;
    this.chat('Kalo left the game.', 'leave'); g.hud.playersOnline(0);
    await this.wait(2);
    await this.gobClose(3, 0.3, 1.5);
    await this.say(['G: ...', 'G: i should turn everything off. so the bulbs can rest.']);
    this.cutOut();
    this.objective('Turn off the fair');
    await this.use([SWITCHES[0].pos[0], 0.5, SWITCHES[0].pos[2] + 1.2], 'Flip the switches off', 2.6);
    this.objective(null);
    await this.cutIn();
    this.camSet([SWITCHES[0].pos[0] + 14, 6, SWITCHES[0].pos[2] + 24], [SWITCHES[0].pos[0] + 8, 2, SWITCHES[0].pos[2]]);
    this.sfx('switch'); this.setPower('RIDES', false); await this.wait(1.2);
    this.sfx('powerDown'); this.setPower('MUSIC', false); await this.wait(1.6);
    this.sfx('switch'); this.setPower('LIGHTS', false); await this.wait(1.2);
    await this.say(['N: The fair goes quiet. It is very good at being quiet. It has had a lot of practice.']);
    await this.wait(1.0);
    this.sfx('blipSys');
    this.chat('[Server] Unvisited places nearby are scheduled for cleanup.', 'server');
    await this.wait(2.2);
    await this.gobClose(3, 0.4, 1.5);
    await this.say(['G: ...', 'G: “cleanup”?', 'G: ...', 'G: see you tomorrow, kalo.']);
    await this.game.fade(true, 2.5);
    this.cutOut();
  }
}
