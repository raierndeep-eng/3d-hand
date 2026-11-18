import * as THREE from 'three';
import { Builder } from '../world/Builder.js';
import * as T from '../render/Textures.js';

/** Title screen diorama. It quietly reflects how far the player has got. */
export class MenuScene {
  constructor(game) { this.game = game; this.b = new Builder(game, game.world, 3); }

  async build() {
    const g = this.game, b = this.b, prog = g.save.progress;
    const stage = prog.completed ? 'after' : prog.furthest >= 4 ? 'grief' : 'happy';
    this.stage = stage;
    g.sky.setMood(stage === 'happy' ? 'morning' : stage === 'grief' ? 'grief' : 'dawn', 0);
    b.ground({ w: 120, d: 120, tex: T.studs(stage === 'grief' ? '#6f7a62' : '#5aa845'), rep: [60, 60] });
    b.scatter(stage === 'grief' ? 40 : 260, [-25, -25, 25, 25], { avoid: (x, z) => Math.hypot(x, z) < 3, colors: stage === 'grief' ? [0x7a6a52] : undefined });
    b.scatter(700, [-30, -30, 30, 30], { kind: 'grass', colors: stage === 'grief' ? [0x6a705c, 0x5e6452] : [0x4c9a3a, 0x5fb04a] });
    b.tree(-8, -6, { s: 1.4, leaf: stage === 'grief' ? 0x6d7564 : null }); b.tree(9, -9, { s: 1.2, kind: 'pine', leaf: stage === 'grief' ? 0x6d7564 : null }); b.tree(-14, 6, { s: 1.1 });
    b.house(4, -14, { wall: 0xdfe3ec, roof: 0x4a5369, door: 0xc43b4b });
    for (let i = 0; i < 6; i++) b.cloud(-80 + i * 30, 30 + (i % 3) * 6, -40 - i * 8, 1.6, 0.8, stage === 'grief' ? 0xa0a3a8 : 0xffffff);
    if (stage !== 'happy') {
      this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.overheadName('Kalo', '#d8d8d8'), transparent: true, depthWrite: false }));
      this.tag.scale.set(2.2, 0.55, 1); this.tag.position.set(1.4, 2.2, 0.3); g.world.add(this.tag);
    }
    if (stage === 'after') {
      b.box({ x: 2.4, z: -0.5, w: 0.6, h: 0.6, d: 0.6, color: 0xf5cd30 });
      b.sign(-2.6, -1.2, 'HI! IM GOB\nI’LL BE HERE', { w: 2, h: 0.9, post: 0.6, font: '700 54px Fredoka, sans-serif', bg: '#c43b4b', fg: '#ffffff', border: '#13060a' });
    }
    g.player.setPosition(0, 0, 0, 0.3);
    g.player.model.setMood(stage === 'grief' ? 'sad' : 'normal');
    g.engine.camera.position.set(3.5, 2.2, 6);
    this.a = 0.5;
    g.sfx.setAmbience(stage === 'grief' ? { wind: 0.5 } : { birds: 0.6, wind: 0.15 });
  }

  update(dt, t) {
    const g = this.game; this.b.update(dt, t);
    this.a += dt * 0.05;
    const cam = g.engine.camera;
    cam.position.set(Math.sin(this.a) * 6.5 + 1.5, 2.1 + Math.sin(t * 0.3) * 0.15, Math.cos(this.a) * 6.5);
    cam.lookAt(-1.2, 1.1, 0);
    g.player.model.root.position.copy(g.player.body.pos);
    g.player.model.update(dt, { speed: 0, grounded: true });
    if (this.stage === 'happy' && Math.random() < dt * 0.15) g.player.model.emote('happy', 1);
    g.player.model.lookAtWorld(this.stage === 'happy' ? cam.position : null);
    if (this.tag) this.tag.position.y = 2.2 + Math.sin(t * 1.2) * 0.1;
    g.engine.followShadow(g.player.body.pos);
  }
}
