import * as THREE from 'three';
import { ChapterBase, v3 } from './ChapterBase.js';
import * as T from '../render/Textures.js';
import { KaloNPC } from '../characters/KaloNPC.js';
import { GobModel } from '../characters/GobModel.js';
import { KaloModel } from '../characters/KaloModel.js';
import { dist2, mulberry32 } from '../core/utils.js';

/**
 * CHAPTER FIVE — THE COPY
 * Behind GOB's door: the unfinished places where things get made. Yellow wallpaper,
 * humming lights, a hallway that loops. GOB gathers yellow blocks and builds a Kalo.
 * It only says what GOB says.
 */
const H = 7; // ceiling height

export default class Chapter5 extends ChapterBase {
  async build(progress) {
    const b = this.b, g = this.game;
    this.mood('liminal', 0);
    g.sfx.setAmbience({ hum: 1 });
    g.fx.setMotes(0.35, 0xfff3c0, 0.05, 0.08);
    const wall = b.mat(0xffffff, { map: T.wallpaper('#e9dca0', '#e0cf86') });
    const carpet = b.mat(0xffffff, { map: T.noiseTex('#b9a86a', 30, 128, 4, 'carpet') });
    const ceil = b.mat(0xe8e2c8, { map: T.tiles('#e8e2c8', '#c9c2a2', 2, 'ceil') });
    const tileMat = b.mat(0xffffff, { map: T.tiles('#dfeef2', '#a9c2c9', 4, 'pool') });
    this.mats = { wall, carpet, ceil, tileMat };
    const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff6d6, emissiveIntensity: 1.3 });
    this.lightMat = lightMat;

    // Room helper: floor, ceiling, 4 walls with optional doorways (gap width 3)
    const room = (x0, z0, x1, z1, { doors = {}, floor = carpet, h = H, lights = true, dark = false } = {}) => {
      const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      b.box({ x: cx, z: cz, y: -1, w, d, h: 1, mat: this.repMat(floor, w / 4, d / 4) });
      b.box({ x: cx, z: cz, y: h, w, d, h: 0.5, mat: this.repMat(ceil, w / 3, d / 3), collide: true, noCamera: false });
      const wallSeg = (ax, az, bx, bz) => {
        const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) return;
        const horiz = Math.abs(bz - az) < 0.01;
        b.box({ x: (ax + bx) / 2, z: (az + bz) / 2, w: horiz ? len : 0.4, d: horiz ? 0.4 : len, h, mat: this.repMat(wall, len / 4, h / 4) });
      };
      const side = (ax, az, bx, bz, gap) => {
        if (gap === undefined) return wallSeg(ax, az, bx, bz);
        const horiz = Math.abs(bz - az) < 0.01;
        if (horiz) { wallSeg(ax, az, gap - 1.6, bz); wallSeg(gap + 1.6, az, bx, bz); b.box({ x: gap, z: az, w: 3.2, d: 0.4, y: 3.2, h: h - 3.2, mat: this.repMat(wall, 1, 1) }); }
        else { wallSeg(ax, az, bx, gap - 1.6); wallSeg(ax, gap + 1.6, bx, bz); b.box({ x: ax, z: gap, w: 0.4, d: 3.2, y: 3.2, h: h - 3.2, mat: this.repMat(wall, 1, 1) }); }
      };
      side(x0, z0, x1, z0, doors.n); side(x0, z1, x1, z1, doors.s); side(x0, z0, x0, z1, doors.w); side(x1, z0, x1, z1, doors.e);
      if (lights) for (let lx = x0 + 4; lx < x1 - 2; lx += 8) for (let lz = z0 + 4; lz < z1 - 2; lz += 8) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), dark ? b.mat(0x555544) : lightMat); m.position.set(lx, h - 0.05, lz); b.add(m);
      }
    };
    this.room = room;

    // Hub (the workshop)
    room(-12, -12, 12, 12, { doors: { n: 0, e: 0, w: 0, s: 0 } });
    b.box({ x: 0, z: 2, w: 5, d: 2.4, h: 1.1, color: 0x8a6a4a, map: T.planks('#8a6a4a'), rep: [2, 1] }); // workbench
    b.panel(0, 1.12, 2, 'HOW TO MAKE A KALO', { ry: 0, w: 2.2, h: 0.4, bg: '#fffbe6', fg: '#333', font: '700 60px Fredoka, sans-serif' }).rotation.x = -Math.PI / 2;
    this.bench = new THREE.Vector3(0, 1.1, 2);
    // shelf parkour (block on the top shelf)
    [[-8, -8, 1.2], [-10, -5, 2.4], [-9.6, -1.6, 3.6]].forEach(([x, z, h]) => b.box({ x, z, w: 2, d: 2, h, color: 0xb07a48, map: T.planks('#b07a48'), rep: [1, 1] }));
    b.box({ x: -10.8, z: 2.5, y: 4.4, w: 2, d: 4, h: 0.4, color: 0x8a6a4a });
    // signs
    b.panel(0, 5, -11.78, 'WAITING FOR PLAYERS...', { w: 6, h: 0.8, bg: '#e9dca0', fg: '#8a7a40', font: '700 60px VT323, monospace' });
    b.panel(11.78, 4.5, 0, 'POOL →', { ry: -Math.PI / 2, w: 2.2, h: 0.6, bg: '#e9dca0', fg: '#8a7a40', font: '700 70px VT323, monospace' });
    b.panel(-11.78, 4.5, 0, '← FUNFAIR (WIP)', { ry: Math.PI / 2, w: 3, h: 0.6, bg: '#e9dca0', fg: '#8a7a40', font: '700 60px VT323, monospace' });
    b.panel(0, 4.5, 11.78, 'PLAYGROUND (UNLIT)', { ry: Math.PI, w: 3.4, h: 0.6, bg: '#e9dca0', fg: '#8a7a40', font: '700 60px VT323, monospace' });
    await progress(0.2);

    // Hallway north (loops until it doesn't)
    const hz0 = -12, hz1 = -110;
    b.box({ x: 0, z: (hz0 + hz1) / 2, y: -1, w: 4, d: hz0 - hz1, h: 1, mat: this.repMat(carpet, 1, (hz0 - hz1) / 4) });
    b.box({ x: 0, z: (hz0 + hz1) / 2, y: H - 1.5, w: 4, d: hz0 - hz1, h: 0.5, mat: this.repMat(ceil, 1, (hz0 - hz1) / 4) });
    for (const sx of [-2.2, 2.2]) b.box({ x: sx, z: (hz0 + hz1) / 2, w: 0.4, d: hz0 - hz1, h: H - 1.5, mat: this.repMat(wall, (hz0 - hz1) / 4, 1.4) });
    for (let z = -16; z > hz1; z -= 10) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), lightMat); m.position.set(0, H - 1.55, z); b.add(m); }
    this.loopSign = null; this.setLoopSign('WAITING FOR PLAYERS...');
    this.endDoorWall = null;
    // door to mirror room at the very end
    this.hallEnd = new THREE.Vector3(0, 0, hz1 + 2);
    await progress(0.35);

    // Pool room (east)
    room(12, -14, 44, 14, { doors: { w: 0 }, floor: tileMat });
    b.box({ x: 28, z: 0, y: -0.3, w: 20, d: 16, h: 0.32, mat: this.repMat(tileMat, 5, 4), collide: false }).visible = false;
    b.water(28, 0, 20, 16, { y: 0.35, color: 0x8fd6e8, opacity: 0.55 });
    for (const [x, z] of [[20, -10], [36, -10], [20, 10], [36, 10]]) b.box({ x, z, w: 1.2, d: 1.2, h: H, color: 0xdfeef2, map: T.tiles('#dfeef2', '#a9c2c9', 4, 'pool'), rep: [1, 2] });
    // stepping stones to the island
    [[19, 4, 0.9], [22, 2, 1.6], [25, -1, 2.4], [28.5, 0.5, 3.2]].forEach(([x, z, h]) => b.box({ x, z, w: 1.6, d: 1.6, h, mat: this.repMat(tileMat, 1, 1) }));
    b.box({ x: 32, z: 0.5, w: 3, d: 3, h: 3.2, mat: this.repMat(tileMat, 1, 1) });
    b.panel(43.78, 3, 0, 'NO RUNNING\nNO DIVING\nNO ONE', { ry: -Math.PI / 2, w: 3, h: 1.6, bg: '#dfeef2', fg: '#4a7a8a', font: '700 52px VT323, monospace' });
    await progress(0.5);

    // Mini fair (west)
    room(-44, -14, -12, 14, { doors: { e: 0 } });
    const wheel = new THREE.Group(); wheel.position.set(-30, 5, -8);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.15, 6, 20), b.mat(0xd9d2a0)); wheel.add(rim);
    for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 7, 0.08), b.mat(0xc9b870)); sp.rotation.z = (i / 8) * Math.PI; wheel.add(sp); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.45), b.mat(0x9a8a5a)); const a = (i / 8) * Math.PI * 2; gd.position.set(Math.cos(a) * 3.5, Math.sin(a) * 3.5 - 0.3, 0); wheel.add(gd); }
    b.add(wheel); this.miniWheel = wheel;
    for (const sx of [-1.5, 1.5]) b.box({ x: -30 + sx, z: -8, w: 0.3, h: 5, d: 0.3, color: 0xbab08a, collide: false, rz: sx * 0.15 });
    const car = new THREE.Group(); car.position.set(-30, 0, 6);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.3, 16), b.mat(0xc9b870)); base.position.y = 0.15; car.add(base);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 1), b.mat(0xe0d8b8)); h.position.set(Math.cos(a) * 2.2, 0.9, Math.sin(a) * 2.2); h.rotation.y = -a + Math.PI; car.add(h); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.2, 12), b.mat(0xb89a6a)); roof.position.y = 3.2; car.add(roof);
    b.add(car); this.miniCar = car; this.game.physics.addBox(-30, 0.15, 6, 4.2, 0.3, 4.2);
    // stall with block on its roof
    b.box({ x: -39, z: 6, w: 4, d: 3, h: 3, color: 0xb8a070 });
    [[-36, 9.5, 1.2], [-34.5, 7, 2.2]].forEach(([x, z, h]) => b.box({ x, z, w: 1.6, d: 1.6, h, color: 0xb07a48, map: T.planks('#b07a48'), rep: [1, 1] }));
    b.panel(-43.78, 3.5, 0, 'COMING SOON', { ry: Math.PI / 2, w: 4, h: 1, bg: '#e9dca0', fg: '#8a7a40', font: '700 80px VT323, monospace' });
    await progress(0.65);

    // Dark playground (south)
    room(-14, 12, 14, 44, { doors: { n: 0 }, dark: true });
    b.box({ x: 3, z: 30, w: 2.4, h: 3.6, d: 2.4, color: 0x6a5a50 });
    b.stairs(-0.6, 30, { dir: [1, 0], steps: 4, w: 2, rise: 0.9, run: 0.9, color: 0x6a6450 });
    const slide = b.box({ x: 6.6, y: 1.8, z: 30, w: 5, h: 0.25, d: 1.8, color: 0x56707a, rz: -0.62, collide: false });
    for (let i = 0; i < 6; i++) this.game.physics.addBox(4.8 + i * 0.7, (3.4 - i * 0.6) / 2, 30, 0.7, 3.4 - i * 0.6, 1.8);
    for (const sx of [-6, -2]) b.box({ x: sx, z: 38, w: 0.2, h: 3.4, d: 0.2, color: 0x444a55, collide: false });
    b.box({ x: -4, y: 3.4, z: 38, w: 4.4, h: 0.2, d: 0.2, color: 0x444a55, collide: false });
    this.darkLight = b.pointLight(3, 5, 26, 0xffe9a0, 0, 18);
    await progress(0.8);

    // Mirror room (north end of hallway)
    this.buildMirrorRoom();
    // block positions
    this.blockSpots = [
      { id: 'hub', pos: [-10.8, 4.8, 3] },
      { id: 'pool', pos: [32, 3.2, 0.5] },
      { id: 'fair', pos: [-39, 3, 6] },
      { id: 'dark', pos: [3, 3.6, 30] },
      { id: 'hall', pos: [0, 0, -104] },
    ];
    this.gob.setPosition(0, null, 8, Math.PI);
    this.game.player.model.setMood('sad');
    this.loops = 0; this.loopBroken = false; this.inDark = false;
    if (this.flags.hasTag) this.makeTag();
    await progress(1);
  }

  /** Clone a material with its texture repeated (so tiling looks right on big boxes). */
  repMat(m, rx, ry) {
    if (!m.map) return m;
    const key = m.uuid + rx.toFixed(2) + ry.toFixed(2);
    this._rep = this._rep || new Map();
    if (!this._rep.has(key)) { const c = m.clone(); c.map = m.map.clone(); c.map.needsUpdate = true; c.map.wrapS = c.map.wrapT = THREE.RepeatWrapping; c.map.repeat.set(Math.max(1, rx), Math.max(1, ry)); this._rep.set(key, c); }
    return this._rep.get(key);
  }

  makeTag() {
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.overheadName('Kalo', '#c8c8c8'), transparent: true, depthWrite: false }));
    tag.scale.set(2.2, 0.55, 1); tag.position.copy(this.gob.body.pos).add(new THREE.Vector3(0.8, 2, 0));
    this.game.world.add(tag); this.gob.carry = tag;
  }

  setLoopSign(text) {
    if (this.loopSign) this.b.group.remove(this.loopSign);
    this.loopSign = this.b.panel(-1.99, 3.2, -46, text, { ry: Math.PI / 2, w: 3.6, h: 0.8, bg: '#e9dca0', fg: '#8a7a40', font: '700 56px VT323, monospace' });
  }

  buildMirrorRoom() {
    const b = this.b, z0 = -110, zm = -126;
    this.mirrorZ = zm;
    // real half
    b.box({ x: 0, z: (z0 + zm) / 2, y: -1, w: 16, d: zm - z0 < 0 ? z0 - zm : 16, h: 1, mat: this.repMat(this.mats.carpet, 4, 4) });
    b.box({ x: 0, z: (z0 + zm) / 2, y: H, w: 16, d: z0 - zm, h: 0.5, mat: this.repMat(this.mats.ceil, 5, 5) });
    for (const sx of [-8, 8]) b.box({ x: sx, z: (z0 + zm) / 2, w: 0.4, d: z0 - zm, h: H, mat: this.repMat(this.mats.wall, 4, 2) });
    b.box({ x: -5, z: z0, w: 6, d: 0.4, h: H, mat: this.repMat(this.mats.wall, 1.5, 2) }); b.box({ x: 5, z: z0, w: 6, d: 0.4, h: H, mat: this.repMat(this.mats.wall, 1.5, 2) });
    b.box({ x: 0, z: z0, y: 3.2, w: 4, d: 0.4, h: H - 3.2, mat: this.repMat(this.mats.wall, 1, 1) });
    // the hallway end wall has a door into here
    // mirrored half (visual only)
    const mz = (z) => 2 * zm - z;
    b.box({ x: 0, z: mz((z0 + zm) / 2), y: -1, w: 16, d: z0 - zm, h: 1, mat: this.repMat(this.mats.carpet, 4, 4), collide: false });
    b.box({ x: 0, z: mz((z0 + zm) / 2), y: H, w: 16, d: z0 - zm, h: 0.5, mat: this.repMat(this.mats.ceil, 5, 5), collide: false });
    for (const sx of [-8, 8]) b.box({ x: sx, z: mz((z0 + zm) / 2), w: 0.4, d: z0 - zm, h: H, mat: this.repMat(this.mats.wall, 4, 2), collide: false });
    b.box({ x: 0, z: mz(z0), w: 16, d: 0.4, h: H, mat: this.repMat(this.mats.wall, 4, 2), collide: false });
    for (const z of [-116, -122]) { const m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.2), this.lightMat); m.position.set(0, H - 0.05, z); b.add(m); const m2 = m.clone(); m2.position.z = mz(z); b.add(m2); }
    // glass + frame (solid collider)
    this.glass = new THREE.Mesh(new THREE.PlaneGeometry(15.6, H), new THREE.MeshStandardMaterial({ color: 0xbfd8e6, transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0.4, depthWrite: false }));
    this.glass.position.set(0, H / 2, zm); this.glass.rotation.y = 0; b.add(this.glass);
    this.mirrorCol = this.game.physics.addBox(0, H / 2, zm, 16, H, 0.3);
    // mirror doubles
    this.mirrorGob = new GobModel(); this.mirrorGob.root.scale.z = -1; b.add(this.mirrorGob.root);
    this.mirrorCopy = null;
    // stairs down (revealed later, on the far side of the mirror)
    this.stairsDown = new THREE.Group();
    for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 1), b.mat(0x2a2a30)); s.position.set(0, -0.3 - i * 0.45, zm - 2 - i * 1); this.stairsDown.add(s); }
    this.stairsDown.visible = false; b.add(this.stairsDown);
  }

  memorySpots() {
    return [
      { id: 'm5a', pos: [1.2, 0, -60] },
      { id: 'm5b', pos: [2.2, 1.1, 2] },
      { id: 'm5c', pos: [-6, 0, -114] },
    ];
  }

  restore(beat) {
    this.music('liminal', 0.5);
    if (beat >= 2) { this.loopBroken = true; this.flags.blocks = this.blockSpots.map((s) => s.id); }
    if (beat >= 3) this.makeCopy(new THREE.Vector3(1.5, 1.1, 4));
  }

  beats() {
    return [
      { id: 'arrive', run: () => this.arrive() },
      { id: 'blocks', at: { gob: [0, 6, Math.PI] }, run: () => this.blocks() },
      { id: 'build', at: { gob: [0, 5, Math.PI] }, run: () => this.buildCopy() },
      { id: 'home', at: { gob: [0, -8, Math.PI] }, run: () => this.home() },
      { id: 'mirror', at: { gob: [0, -114, Math.PI] }, run: () => this.mirror() },
    ];
  }

  update(dt, t) {
    super.update(dt, t);
    this.miniWheel.rotation.z -= dt * 0.4; // backwards
    this.miniCar.rotation.y -= dt * 0.25;
    this.lightMat.emissiveIntensity = 1.3 + (Math.random() < 0.01 ? -0.9 : 0);
    const p = this.gob.body.pos;
    // darkness in the playground room
    const dark = p.z > 13;
    if (dark !== this.inDark) { this.inDark = dark; this.mood(dark ? 'liminalDark' : 'liminal', 1.5); }
    if (this.darkLight) this.darkLight.intensity = dark ? (Math.sin(t * 13) > 0.85 ? 0 : 5) : 0;
    // the loop
    if (!this.loopBroken && p.z < -62 && Math.abs(p.x) < 2.5) {
      p.z += 40; this.gob.lastSafe.z += 40; this.game.cameraCtl.smoothTarget.z += 40; this.game.cameraCtl.cam.position.z += 40;
      if (this.kalo) this.kalo.teleport(this.kalo.pos.x, this.kalo.pos.y, this.kalo.pos.z + 40);
      this.loops++;
      this.onLoop && this.onLoop(this.loops);
    }
    // mirror doubles
    if (this.mirrorGob) {
      const src = this.gob.model;
      const mg = this.mirrorGob;
      mg.root.position.set(p.x, p.y, 2 * this.mirrorZ - p.z);
      mg.root.rotation.y = -this.gob.yaw + Math.PI * 0; // reflected yaw
      mg.root.rotation.y = Math.PI - this.gob.yaw;
      mg.root.scale.set(-1, 1, 1);
      mg.body.position.copy(src.body.position); mg.body.rotation.copy(src.body.rotation); mg.body.scale.copy(src.body.scale);
      mg.look.copy(src.look); mg.lookTarget.copy(src.lookTarget);
      for (let i = 0; i < 2; i++) { mg.eyes[i].ir.position.copy(src.eyes[i].ir.position); mg.eyes[i].g.scale.copy(src.eyes[i].g.scale); }
      mg.root.visible = p.z < -100 && this.glass.visible;
      if (this.mirrorCopy && this.kalo) {
        const kp = this.kalo.pos;
        this.mirrorCopy.root.position.set(kp.x, kp.y, 2 * this.mirrorZ - kp.z);
        this.mirrorCopy.root.rotation.y = Math.PI - this.kalo.yaw; this.mirrorCopy.root.scale.set(-1, 1, 1);
        this.mirrorCopy.setPose(this.kalo.model.pose); this.mirrorCopy.update(dt, { speed: this.kalo.speed, grounded: true });
        this.mirrorCopy.root.visible = mg.root.visible && this.kalo.model.root.visible;
      }
    }
  }

  // ------------------------------------------------------------------
  async arrive() {
    const g = this.game;
    this.music('liminal', 3);
    await this.cutIn();
    this.camSet([0, 3, 12], [0, 2, 0]);
    await this.titleCard('CHAPTER FIVE', 'The Copy', 'If he can’t come back, make him.');
    await this.gobClose(3, 0.5, 1.5);
    await this.say([
      'G: ...',
      'G: this isn’t my house.',
      'G: it smells like carpet. and old light.',
      'G: i think this is the place where things go before they’re finished.',
      'G: where i made everything. before it was real.',
      'G: there have to be yellow blocks here somewhere.',
    ]);
    this.cutOut();
  }

  async blocks() {
    const g = this.game;
    this.objective('Find yellow blocks', `${(this.flags.blocks || []).length}/5`);
    const got = new Set(this.flags.blocks || []);
    const items = this.blockSpots.filter((s) => !got.has(s.id) && s.id !== 'hall').map((s) => ({ ...s }));
    const hall = this.blockSpots.find((s) => s.id === 'hall');
    // The hallway: loops until GOB stops expecting it to end.
    this.onLoop = async (n) => {
      this.sfx('glitch');
      const texts = ['WAITING FOR PLAYERS...', 'STILL WAITING...', 'WAITING FOR PLAYERS... (3)', 'WAITING'];
      this.setLoopSign(texts[Math.min(n, texts.length - 1)]);
      if (n === 1) this.say(['G: ...didn’t i already walk past that sign?'], { lock: false });
      if (n === 2) this.say(['G: it’s the same hallway. again and again.', 'G: like waiting at the spawn. every day the same day.'], { lock: false });
      if (n >= 3 && !this.loopBroken) {
        this.loopBroken = true;
        this.lightMat.emissiveIntensity = 0.2;
        await this.say(['N: The lights dim. From very far away, a voice GOB remembers:', 'K: “gobby, you can’t get anywhere walking in circles.”', 'G: ...', 'G: okay. i’ll stop walking in circles.'], { lock: false });
        this.setLoopSign('→');
        this.spawnHallBlock(hall);
      }
    };
    if (got.has('hall')) { this.loopBroken = true; }
    let count = got.size;
    const cb = (it) => { got.add(it.id); this.flags.blocks = [...got]; count++; this.progress(`${count}/5`); if (count < 5) this.chat(['...', 'one more piece.', 'he’s getting there.', 'almost.'][Math.min(3, count - 1)], 'server'); };
    this.game.marker.set(() => {
      const p = this.gob.body.pos; let best = null, bd = 1e9;
      for (const s of this.blockSpots) { if (got.has(s.id)) continue; if (s.id === 'hall' && !this.hallSpawned) { const d = dist2(0, -40, p.x, p.z); if (d < bd) { bd = d; best = v3([0, 0, -58]); } continue; } const d = dist2(s.pos[0], s.pos[2], p.x, p.z); if (d < bd) { bd = d; best = v3(s.pos); } }
      return best || p;
    }, 1.6);
    const others = this.collectAll(items, () => this.yellowBlock(), { sound: 'collect', total: items.length, onEach: cb });
    this.progress(`${count}/5`);
    this.hallDone = got.has('hall') ? Promise.resolve() : new Promise((res) => (this.hallRes = res));
    await Promise.all([others, this.hallDone]);
    this.unmark();
    this.objective(null);
    await this.say(['G: five yellow blocks.', 'G: that’s enough for a kalo. i think.']);
  }

  spawnHallBlock(hall) {
    if (this.hallSpawned) return; this.hallSpawned = true;
    const pr = this.collectAll([{ ...hall }], () => this.yellowBlock(), { sound: 'collect', total: 1 });
    this.progress(`${(this.flags.blocks || []).length}/5`);
    pr.then(() => {
      const got = new Set(this.flags.blocks || []); got.add('hall'); this.flags.blocks = [...got];
      this.objective('Find yellow blocks', `${got.size}/5`);
      this.hallRes && this.hallRes();
    });
  }

  yellowBlock() {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: 0xf5cd30, emissive: 0x4a3a00, emissiveIntensity: 0.5 }));
    m.castShadow = true;
    const g = new THREE.Group(); g.add(m);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.radialGlow('255,220,100'), transparent: true, depthWrite: false, opacity: 0.6 })); glow.scale.set(2, 2, 1); g.add(glow);
    return g;
  }

  makeCopy(pos) {
    const g = this.game;
    const k = new KaloNPC(g, { variant: 'copy', name: 'Kalo' });
    if (g.kalo) g.kalo.removeFrom();
    g.kalo = k; k.addTo(g.world);
    k.teleport(pos.x, pos.y, pos.z, 0);
    k.followDist = 1.7; k.walkSpeed = 4.4; k.runSpeed = 6.6;
    k.model.setName('Kalo', '#e9dca0');
    this.mirrorCopy = new KaloModel({ variant: 'copy', name: 'Kalo' }); this.b.add(this.mirrorCopy.root);
    return k;
  }

  async buildCopy() {
    const g = this.game;
    this.objective('Build him at the workbench');
    await this.use([0, 0.5, 4], 'Build a Kalo', 3);
    this.objective(null);
    await this.cutIn();
    this.gob.setPosition(0, null, 5.5, Math.PI);
    this.camSet([5, 3.5, 8], [0, 1.6, 2]);
    this.music(null, 2);
    // blocks fly in and stack into a figure
    const parts = [];
    const targets = [[-0.3, 1.1 + 0.6, 2], [0.3, 1.1 + 0.6, 2], [0, 1.1 + 1.8, 2], [-0.9, 1.1 + 1.8, 2], [0.9, 1.1 + 1.8, 2], [0, 1.1 + 2.75, 2]];
    for (const [i, tp] of targets.entries()) {
      const m = this.yellowBlock(); m.position.copy(this.gob.body.pos).add(new THREE.Vector3(0, 1, 0)); g.world.add(m); parts.push(m);
      this.sfx('place', { pitch: 0.8 + i * 0.07 });
      const from = m.position.clone(), to = v3(tp);
      await this.anim(0.5, (k) => { m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k * Math.PI) * 1.5; m.rotation.y = k * 3; });
    }
    await this.say(['G: arms. legs. yellow.', 'G: and a face. i’ll draw the face.', 'N: GOB has only ever drawn one kind of eyes.']);
    this.sfx('spawn'); g.fx.sparkle(new THREE.Vector3(0, 2.5, 2), 0xffd23f); g.cameraCtl.shake(0.1, 0.3);
    parts.forEach((m) => g.world.remove(m));
    const k = this.makeCopy(new THREE.Vector3(0, 1.1, 2));
    k.idle(); k.face(this.gob.body.pos); k.model.setPose('stiff');
    await this.wait(1.2);
    await this.cam([2.4, 2.6, 6], [0, 2.4, 2.2], 1.5);
    await this.wait(1.2);
    this.music('copy', 2);
    await this.say([
      'G: ...kalo?',
      'C: ...kalo?',
      () => this.gob.model.emote('bounce', 1),
      'G: you’re back!',
      'C: you’re back.',
      'G: no, no, you say “gobby!” and then you say “told you i’d come back.”',
      'C: gobby. told you i’d come back.',
      'G: ...',
      'G: okay. okay! that’s close. that’s really close.',
      'G: let’s go home. same place.',
      'C: same place.',
    ]);
    k.model.setPose(null);
    k.teleport(0, null, 0.5); k.follow();
    this.cutOut();
  }

  async home() {
    const g = this.game, k = g.kalo;
    k.follow();
    this.objective('Go home (north hallway)');
    await this.reach([0, 0, -18], 3);
    await this.say(['G: kalo, guess what. the fair still works. we can go on the wheel again.', 'C: the wheel again.', 'G: and the obby! you can take the stairs.', 'C: take the stairs.']);
    await this.reach([0, 0, -45], 3);
    await this.say(['G: ...', 'G: tag! you’re it!', 'C: tag. you’re it.', 'N: The copy doesn’t move.', 'G: you’re supposed to run. kalo runs away and then lets me catch him.', 'C: lets me catch him.']);
    await this.reach([0, 0, -80], 3);
    this.chat('Kalo: gobby', 'kalo-chat');
    await this.wait(1.5);
    this.chat('Kalo: gobby', 'kalo-chat');
    await this.wait(1.5);
    this.chat('Kalo: gobby gobby gobby', 'kalo-chat');
    await this.say(['G: kalo, you don’t have to say it so many times.', 'C: so many times.']);
    this.objective('Keep going');
    await this.reach([0, 0, -112], 3);
  }

  async mirror() {
    const g = this.game, k = g.kalo;
    this.objective(null);
    await this.cutIn();
    this.gob.setPosition(-1, null, -122, Math.PI); k.teleport(1.2, null, -121, Math.PI); k.idle(); k.model.setPose(null);
    this.camSet([4, 2.2, -112], [0, 1.4, -128]);
    await this.wait(1.5);
    await this.say([
      'N: In the mirror, GOB and the copy stand side by side.',
      'N: The copy is standing exactly the way GOB is standing.',
    ]);
    await this.cam([0.2, 1.5, -118], [0, 1.2, -132], 3);
    await this.say([
      'G: ...',
      'G: you never say hi first.',
      'C: say hi first.',
      'G: kalo always said hi first. that was the whole thing. that was the best thing.',
      'G: you only say what i say. because i made you.',
      'G: you’re not him. you’re just... me. in yellow.',
      'C: just me.',
      'G: i made you so i wouldn’t be alone.',
      'G: but i’m still alone. i’m just alone with a mirror.',
      'C: ...alone.',
      { choice: ['“I’m sorry.”', '“Thank you for trying.”'] },
    ]);
    await this.say(['G: you can rest now. you don’t have to be him.', 'C: ...', 'C: rest now.']);
    // the copy comes gently apart
    this.music(null, 3);
    k.die(new THREE.Vector3(0, 0, 0));
    this.sfx('place', { pitch: 0.6 });
    await this.wait(2.5);
    for (const p of k.model.pieces) { const o = p.obj; const m = o.children[0]?.material; if (m) { m.transparent = true; } }
    await this.anim(3, (t) => { for (const p of k.model.pieces) p.obj.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = 1 - t; } }); k.model.tagMat.opacity = 1 - t; if (this.mirrorCopy) this.mirrorCopy.root.visible = false; });
    k.model.root.visible = false; for (const p of k.model.pieces) p.obj.visible = false;
    await this.gobClose(2.6, 0.2, 2, 0);
    await this.say([
      'G: ...',
      'G: i’m sorry, kalo.',
      'G: the real one.',
      'G: i tried to make you come back, but i only know how to make me.',
    ]);
    // the mirror cracks
    this.sfx('crash'); g.cameraCtl.shake(0.2, 0.6);
    this.glass.visible = false; this.mirrorCol.enabled = false; this.stairsDown.visible = true;
    for (let i = 0; i < 8; i++) this.game.physics.addBox(0, -0.3 - i * 0.45 - 0.15 + 0.15, this.mirrorZ - 2 - i, 3, 0.3, 1);
    this.game.physics.addBox(0, -0.15, this.mirrorZ - 1, 16, 0.3, 2);
    g.fx.burst(new THREE.Vector3(0, 3, this.mirrorZ), { count: 60, color: 0xdfeef2, speed: 4, up: 2, life: 1.4, size: 0.12 });
    this.mood('under', 6);
    await this.cam([0, 2.5, -118], [0, -1, -136], 2);
    await this.say(['N: Behind the mirror there is no reflection. Just stairs, going down.', 'N: Under everything.', 'G: ...', 'G: i know this place.', 'G: i haven’t been down there in a very long time.']);
    this.cutOut();
    this.objective('Go down');
    this.game.physics.killY = -60;
    await this.reach([0, -3, this.mirrorZ - 9], 2.5);
    this.objective(null);
    await this.game.fade(true, 2);
  }
}
