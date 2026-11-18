import * as THREE from 'three';
import { Engine } from './Engine.js';
import { Input } from './Input.js';
import { Physics } from './Physics.js';
import { AbortError, isAbort, nextFrame } from './utils.js';
import { Sky } from '../render/Sky.js';
import { Particles } from '../render/Particles.js';
import * as T from '../render/Textures.js';
import { PlayerController } from '../player/PlayerController.js';
import { CameraController } from '../player/CameraController.js';
import { KaloNPC } from '../characters/KaloNPC.js';
import { AudioEngine } from '../audio/AudioEngine.js';
import { Music } from '../audio/Music.js';
import { Sfx } from '../audio/Sfx.js';
import { Dialogue } from '../story/Dialogue.js';
import { Cutscene } from '../story/Cutscene.js';
import { Interactions, Marker } from '../story/Interactions.js';
import { memoryById } from '../story/Memories.js';
import { HUD } from '../ui/HUD.js';
import { Menus } from '../ui/Menus.js';
import { Loading } from '../ui/Loading.js';
import { SaveSystem, Settings } from '../save/SaveSystem.js';
import { CHAPTERS } from '../levels/chapters.js';
import { MenuScene } from '../levels/MenuScene.js';

/**
 * The conductor. Owns every system, runs the frame loop, loads chapters, runs their story
 * beats as async scripts (cancellable when you quit), and handles pause/save/load.
 */
export class Game {
  constructor(canvas) {
    this.settings = new Settings();
    this.save = new SaveSystem();
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.physics = new Physics();
    this.sky = new Sky(this.engine);
    this.fx = new Particles(this.engine.scene);
    this.audio = new AudioEngine();
    this.music = new Music(this.audio);
    this.sfx = new Sfx(this.audio, this);
    this.hud = new HUD(this);
    this.menus = new Menus(this);
    this.loading = new Loading();
    this.dialogue = new Dialogue(this);
    this.interactions = new Interactions(this);
    this.marker = new Marker(this.engine.scene);

    this.world = new THREE.Group(); this.engine.scene.add(this.world);
    this.player = new PlayerController(this);
    this.player.addTo(this.engine.scene);
    this.cameraCtl = new CameraController(this);
    this.cut = new Cutscene(this);
    this.kalo = null;

    this.state = 'boot';
    this.locks = new Set();
    this.waiters = [];
    this.pendingRejects = new Set();
    this.time = 0; this.dt = 0; this.playTime = 0;
    this.chapterIndex = 0; this.beatIndex = 0; this.chapter = null;
    this.flags = {}; this.collected = [];
    this.runId = 0;
    this.memoryPickups = [];
    this.fadeEl = document.getElementById('fx-fade');

    this.input.onPointerLockLost = () => { if (this.state === 'playing' && !this.menus.open) this.pause(); };
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
    const startAudio = () => { this.audio.init(); this.sfx.start(); this.music.resumePending(); this.applySettings(); };
    addEventListener('pointerdown', startAudio); addEventListener('keydown', startAudio); addEventListener('touchstart', startAudio);

    this.applySettings();
    this.clock = new THREE.Clock();
    this.frame = this.frame.bind(this);
  }

  applySettings() {
    const s = this.settings.data;
    this.audio.setVolumes(s.master, s.music, s.sfx);
    if (this.engine.quality !== s.quality) this.engine.setQuality(s.quality);
    this.engine.setFov(s.fov);
    this.cameraCtl.distance = s.camDistance;
  }

  // ------------------------------------------------------------------ async helpers
  /** Promise that rejects with AbortError if the current story run is cancelled. */
  promise(executor) {
    return new Promise((resolve, reject) => {
      const entry = { reject };
      this.pendingRejects.add(entry);
      executor((v) => { this.pendingRejects.delete(entry); resolve(v); }, (e) => { this.pendingRejects.delete(entry); reject(e); });
    });
  }
  wait(sec) { return this.promise((res) => this.waiters.push({ t: sec, res })); }
  until(pred) { return this.promise((res) => this.waiters.push({ pred, res })); }
  abortAll() {
    this.runId++;
    const list = [...this.pendingRejects]; this.pendingRejects.clear();
    this.waiters.length = 0;
    for (const e of list) e.reject(new AbortError());
    this.dialogue.reset();
  }

  lock(reason) { this.locks.add(reason); this.updateControl(); }
  unlock(reason) { this.locks.delete(reason); this.updateControl(); }
  updateControl() {
    const c = this.state === 'playing' && this.locks.size === 0;
    this.player.controllable = c;
    this.input.setGameplayLock(c);
    this.input.setTouchVisible(this.state === 'playing');
    if (!c) this.interactions.promptEl.classList.add('hidden');
  }

  /** Real-time fade to/from black. */
  fade(toBlack, dur = 1) {
    return new Promise((res) => {
      const el = this.fadeEl; const from = parseFloat(el.style.opacity || '0'), to = toBlack ? 1 : 0;
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / (dur * 1000));
        el.style.opacity = String(from + (to - from) * k);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      step();
    });
  }

  // ------------------------------------------------------------------ lifecycle
  async boot() {
    this.loading.show('WAKING UP');
    this.loading.progress(0.2);
    // Warm up the procedural textures used everywhere.
    T.gobFace(); T.iris(); T.eyeWhite(3); T.eyeWhite(8); T.studs('#5aa845');
    await nextFrame();
    this.loading.progress(0.7);
    requestAnimationFrame(this.frame);
    await this.showTitle();
    this.loading.hide();
  }

  async showTitle() {
    this.abortAll();
    this.state = 'menu';
    this.updateControl();
    this.clearLevel();
    this.hud.show(false); this.hud.clearAll();
    this.menuScene = new MenuScene(this);
    await this.menuScene.build();
    this.menus.title();
    this.music.play(this.save.progress.furthest >= 4 && !this.save.progress.completed ? 'grief' : 'title', 1.5);
    this.fade(false, 1);
  }

  clearLevel() {
    if (this.chapter && this.chapter.dispose) { try { this.chapter.dispose(); } catch (e) { console.warn(e); } }
    this.chapter = null;
    if (this.menuScene) { this.menuScene = null; }
    if (this.kalo) { this.kalo.removeFrom(); this.kalo = null; }
    this.physics.clear();
    this.interactions.clear();
    this.marker.clear();
    this.memoryPickups = [];
    this.fx.clear(); this.fx.setRain(0); this.fx.setMotes(0);
    if (this.player.carry) { this.player.carry.parent && this.player.carry.parent.remove(this.player.carry); this.player.carry = null; }
    this.player.model.setMood('normal'); this.player.model.emoteName = null; this.player.speedMul = 1; this.player.respawnPoint = null;
    this.player.model.setVisible(true);
    this.cameraCtl.zoomMul = 1; this.cameraCtl.heightOffset = 1.35;
    this.physics.killY = -40;
    this.sky.extraSat = 1;
    const disposeObj = (o) => { o.traverse((c) => { if (c.geometry) c.geometry.dispose(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose()); }); };
    for (const c of [...this.world.children]) { this.world.remove(c); disposeObj(c); }
    this.sfx.setAmbience({});
    this.cut.active && this.cut.end();
    this.locks.clear();
    document.getElementById('letterbox').classList.remove('on');
  }

  spawnKalo(opts) {
    if (this.kalo) this.kalo.removeFrom();
    this.kalo = new KaloNPC(this, opts);
    this.kalo.addTo(this.world);
    return this.kalo;
  }

  newGame() {
    this.flags = {}; this.collected = []; this.playTime = 0;
    this.startChapter(1, 0, null, true);
  }

  /** Load chapter n and run its beats from `beat`. */
  async startChapter(n, beat = 0, state = null, fresh = false) {
    this.abortAll();
    const runId = this.runId;
    this.menus.closeAll();
    this.state = 'loading';
    this.updateControl();
    if (state) { this.flags = { ...(state.flags || {}) }; this.collected = [...(state.collected || [])]; this.playTime = state.playTime || 0; }
    else if (fresh) {
      // Starting from chapter select: assume the story so far happened.
      this.flags = { hasStud: n >= 3, hasTag: n >= 5, kaloDead: n >= 4 };
      if (n === 1) { this.collected = []; this.playTime = 0; }
    }
    const meta = CHAPTERS[n - 1];
    await this.fade(true, 0.6);
    this.loading.show(`CHAPTER ${n}`, meta.tip);
    try {
      this.clearLevel();
      this.hud.clearAll();
      this.loading.progress(0.1);
      const mod = await meta.load();
      if (runId !== this.runId) return;
      this.chapterIndex = n; this.beatIndex = beat;
      const ch = this.chapter = new mod.default(this);
      await ch.build((p) => { this.loading.progress(0.15 + p * 0.8); return nextFrame(); });
      if (runId !== this.runId) return;
      this.spawnMemories();
      this.save.unlockChapter(n);
      const beats = ch.beats();
      if (beat > 0 && ch.restore) ch.restore(beat);
      const b0 = beats[beat];
      if (b0 && b0.at) this.applyAt(b0.at);
      this.cameraCtl.snap();
      this.loading.progress(1);
      await nextFrame();
    } catch (e) {
      if (isAbort(e)) return;
      this.loading.hide();
      this.showError(e);
      return;
    }
    this.loading.hide();
    this.state = 'playing';
    this.hud.show(true);
    this.updateControl();
    this.fade(false, 1.2);
    this.runBeats(beat, runId);
  }

  applyAt(at) {
    if (at.gob) this.player.setPosition(at.gob[0], at.gob[3] ?? null, at.gob[1], at.gob[2] || 0);
    if (at.kalo && this.kalo) this.kalo.teleport(at.kalo[0], null, at.kalo[1], at.kalo[2] || 0);
    this.cameraCtl.setBehind(this.player.yaw);
  }

  async runBeats(start, runId) {
    const ch = this.chapter;
    const beats = ch.beats();
    try {
      for (let i = start; i < beats.length; i++) {
        if (runId !== this.runId) return;
        this.beatIndex = i;
        if (i > start && beats[i].at) this.applyAt(beats[i].at);
        if (beats[i].checkpoint !== false) this.autosave();
        await beats[i].run();
      }
      if (runId !== this.runId) return;
      // Chapter finished
      if (this.chapterIndex < CHAPTERS.length) {
        this.save.unlockChapter(this.chapterIndex + 1);
        this.startChapter(this.chapterIndex + 1, 0);
      } else {
        this.save.setCompleted();
        this.rollCredits(true);
      }
    } catch (e) {
      if (isAbort(e)) return;
      this.showError(e);
    }
  }

  restartCheckpoint() {
    const st = this.save.load('auto');
    if (st && st.chapter === this.chapterIndex) this.startChapter(st.chapter, st.beat, st);
    else this.startChapter(this.chapterIndex, this.beatIndex, this.snapshot());
  }

  snapshot() { return { chapter: this.chapterIndex, beat: this.beatIndex, flags: this.flags, collected: this.collected, playTime: this.playTime }; }
  autosave() { this.save.save('auto', this.snapshot()); }
  saveToSlot(id) { return this.save.save(id, this.snapshot()); }
  loadSlot(id) {
    const st = this.save.load(id);
    if (!st) { this.hud.toast('That save is empty or unreadable.'); return; }
    this.menus.closeAll();
    this.startChapter(st.chapter, st.beat, st);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.updateControl();
    this.menus.pause();
    this.audio.ctx && this.audio.muffle(0.45, 0.3);
  }
  resume() {
    if (this.state !== 'paused') return;
    this.menus.closeAll();
    this.state = 'playing';
    this.updateControl();
    this.audio.ctx && this.audio.muffle(this.chapter?.muffle || 0, 0.3);
    this.clock.getDelta();
    this.input.pressedKeys.clear(); this.input.touchPausePressed = false;
  }
  quitToTitle() { this.fade(true, 0.5).then(() => this.showTitle()); }

  rollCredits(fromEnding) {
    const wasMenu = this.state === 'menu';
    this.abortAll();
    this.state = 'credits';
    this.updateControl();
    this.hud.show(false);
    if (fromEnding) this.music.play('ending', 2);
    this.menus.credits(() => { if (wasMenu && !fromEnding) { this.state = 'menu'; } else this.showTitle(); }, fromEnding);
  }

  // ------------------------------------------------------------------ collectibles
  spawnMemories() {
    const list = this.chapter.memorySpots ? this.chapter.memorySpots() : [];
    for (const { id, pos } of list) {
      if (this.collected.includes(id)) continue;
      const m = memoryById(id); if (!m) continue;
      const g = new THREE.Group();
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.82), new THREE.MeshBasicMaterial({ map: T.polaroid(m.a, m.b, m.glyph), side: THREE.DoubleSide }));
      g.add(pic);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.radialGlow('255,245,200'), transparent: true, depthWrite: false, opacity: 0.7 }));
      glow.scale.set(2.2, 2.2, 1); g.add(glow);
      g.position.set(pos[0], pos[1] + 1, pos[2]);
      this.world.add(g);
      this.memoryPickups.push({ id, g, base: pos[1] + 1, m });
    }
  }

  updateMemories(dt) {
    const p = this.player.body.pos;
    for (let i = this.memoryPickups.length - 1; i >= 0; i--) {
      const mp = this.memoryPickups[i];
      mp.g.rotation.y += dt * 1.4;
      mp.g.position.y = mp.base + Math.sin(this.time * 2 + i) * 0.15;
      const dx = mp.g.position.x - p.x, dz = mp.g.position.z - p.z, dy = mp.g.position.y - (p.y + 0.6);
      if (dx * dx + dz * dz < 1.6 && Math.abs(dy) < 1.6) {
        this.collected.push(mp.id); this.save.addMemory(mp.id);
        this.sfx.play('memory'); this.fx.sparkle(mp.g.position);
        this.hud.toast(`Memory found: ${mp.m.title}`, 'Read it in Pause → Memories');
        this.world.remove(mp.g); this.memoryPickups.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ frame
  frame() {
    requestAnimationFrame(this.frame);
    let dt = Math.min(this.clock.getDelta(), 1 / 20) * (this.timeScale || 1);
    this.input.pollGamepad();
    try {
      if (this.state === 'playing') this.tick(dt);
      else if (this.state === 'menu' && this.menuScene) { this.time += dt; this.menuScene.update(dt, this.time); this.sky.update(dt, this.engine.camera.position); this.fx.update(dt, this.engine.camera.position); }
      else if (this.state === 'paused') { if (this.input.pressed('KeyP') || this.input.touchPausePressed || (this.input.gp && this.input.gp.startP)) this.resume(); }
      this.sfx.update(dt);
      this.hud.updateFps(dt);
      this.engine.render();
    } catch (e) {
      console.error(e);
      this.showError(e);
    }
    this.input.endFrame();
  }

  tick(dt) {
    this.dt = dt; this.time += dt; this.playTime += dt;
    if (this.input.pausePressed() && !this.menus.open) { this.pause(); return; }
    if (this.chapter && this.chapter.update) this.chapter.update(dt, this.time);
    this.player.update(dt);
    if (this.kalo) this.kalo.update(dt);
    this.physics.endFrame();
    this.physics.updateTriggers(this.player.body);
    this.interactions.update();
    this.updateMemories(dt);
    this.dialogue.update(dt);
    this.cut.update(dt);
    this.cameraCtl.update(dt);
    // timers / conditions
    for (let i = this.waiters.length - 1; i >= 0; i--) {
      const w = this.waiters[i];
      if (w.pred ? w.pred() : (w.t -= dt) <= 0) { this.waiters.splice(i, 1); w.res(); }
    }
    this.marker.update(dt, this.player.body.pos);
    this.engine.followShadow(this.player.body.pos);
    this.sky.update(dt, this.engine.camera.position);
    this.fx.update(dt, this.player.body.pos);
  }

  showError(e) {
    console.error(e);
    if (this.errorShown) return;
    this.errorShown = true;
    const el = document.getElementById('error');
    document.getElementById('error-msg').textContent = (e && (e.stack || e.message)) || String(e);
    el.classList.remove('hidden');
    document.getElementById('err-menu').onclick = () => { el.classList.add('hidden'); this.errorShown = false; this.showTitle(); };
    document.getElementById('err-reload').onclick = () => location.reload();
  }
}
