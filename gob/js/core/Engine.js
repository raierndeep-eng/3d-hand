import * as THREE from 'three';

/**
 * Owns the WebGL renderer, the scene graph root, the camera and the main lights.
 * Everything that draws goes through here.
 */
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      throw new Error('WebGL could not start. Your browser or GPU may not support it.\n' + e.message);
    }
    this.renderer = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 900);
    this.camera.position.set(0, 5, 10);
    this.scene.add(this.camera); // so camera-attached objects render

    // Lights: hemisphere for soft ambient, one shadow-casting sun that follows the player.
    this.hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5a7a3a, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
    this.sun.position.set(30, 50, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.sunOffset = new THREE.Vector3(30, 50, 20);

    this.quality = 'high';
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', () => setTimeout(this.onResize, 200));
    this.onResize();
  }

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    const ratio = q === 'low' ? Math.min(dpr, 0.85) : q === 'medium' ? Math.min(dpr, 1.25) : Math.min(dpr, 2);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = q !== 'low';
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) {
      this.sun.shadow.mapSize.set(size, size);
      if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    }
    // Materials must recompile when shadows toggle.
    this.scene.traverse((o) => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => (m.needsUpdate = true)); } });
    this.onResize();
  }

  setFov(f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }

  onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  /** Keep the shadow frustum centered on what matters (the player). */
  followShadow(target) {
    this.sun.target.position.copy(target);
    this.sun.position.copy(target).add(this.sunOffset);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
