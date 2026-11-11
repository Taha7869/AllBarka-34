import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/**
 * The AllBarka gift box as a small real-time 3D scene.
 * Progress 0 → 1 turns the box, lifts the lid and raises the camera to look inside.
 * Loaded on demand by GiftBoxStory so three.js never weighs on the first paint.
 */
export interface GiftBoxScene {
  setProgress: (value: number) => void;
  setPointer: (x: number, y: number) => void;
  resize: () => void;
  start: () => void;
  stop: () => void;
  dispose: () => void;
}

const EMERALD = 0x12402f;
const EMERALD_DEEP = 0x08231b;
const GOLD = 0xd2a850;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smooth = (from: number, to: number, value: number) => {
  const t = clamp01((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};
const mix = (from: number, to: number, t: number) => from + (to - from) * t;

/** A flat satin band that follows a curve, used for the bow loops and tails. */
function ribbonAlong(curve: THREE.Curve<THREE.Vector3>, width: number, segments = 48) {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const point = curve.getPoint(i / segments);
    positions.push(point.x, point.y, point.z - width / 2, point.x, point.y, point.z + width / 2);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createGiftBoxScene(canvas: HTMLCanvasElement, contentsUrl: string, onReady?: () => void): GiftBoxScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);

  const key = new THREE.DirectionalLight(0xfff1d6, 2.6);
  key.position.set(3.2, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 16;
  key.shadow.camera.left = -4;
  key.shadow.camera.right = 4;
  key.shadow.camera.top = 4;
  key.shadow.camera.bottom = -4;
  key.shadow.bias = -0.0006;
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe4c783, 1.1);
  rim.position.set(-4, 2.5, -3);
  scene.add(rim);

  const paper = new THREE.MeshStandardMaterial({ color: EMERALD, roughness: 0.82, metalness: 0.02 });
  const lining = new THREE.MeshStandardMaterial({ color: EMERALD_DEEP, roughness: 0.95 });
  const satin = new THREE.MeshPhysicalMaterial({
    color: GOLD, roughness: 0.34, metalness: 0.55, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(0xfff0bd), side: THREE.DoubleSide,
  });

  const box = new THREE.Group();
  scene.add(box);

  const W = 2.5;
  const D = 2.5;
  const H = 0.78;
  const T = 0.05;
  const solid = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // Base tray: floor and four walls, with a darker lining so the contents glow.
  const base = new THREE.Group();
  box.add(base);
  solid(W, T, D, paper, 0, T / 2, 0, base);
  solid(W, H, T, paper, 0, H / 2, D / 2 - T / 2, base);
  solid(W, H, T, paper, 0, H / 2, -D / 2 + T / 2, base);
  solid(T, H, D, paper, W / 2 - T / 2, H / 2, 0, base);
  solid(T, H, D, paper, -W / 2 + T / 2, H / 2, 0, base);
  for (const [w, d, x, z] of [[W - 2 * T, 0.01, 0, D / 2 - T - 0.006], [W - 2 * T, 0.01, 0, -D / 2 + T + 0.006], [0.01, D - 2 * T, W / 2 - T - 0.006, 0], [0.01, D - 2 * T, -W / 2 + T + 0.006, 0]] as const) {
    solid(w, H - 0.04, d, lining, x, H / 2, z, base).castShadow = false;
  }

  // Contents: one photographed spread under a 3 × 2 grid of dividers.
  const fill = H - 0.2;
  const contents = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 2 * T, D - 2 * T),
    new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
  );
  contents.rotation.x = -Math.PI / 2;
  contents.position.y = fill;
  contents.receiveShadow = true;
  base.add(contents);
  const texture = new THREE.TextureLoader().load(contentsUrl, loaded => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    loaded.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const material = contents.material as THREE.MeshStandardMaterial;
    material.map = loaded;
    material.color.set(0xffffff);
    material.needsUpdate = true;
    dirty = true;
  });
  const dividerHeight = 0.2;
  for (const x of [-(W - 2 * T) / 6, (W - 2 * T) / 6]) solid(0.035, dividerHeight, D - 2 * T, lining, x, fill + dividerHeight / 2 - 0.02, 0, base);
  solid(W - 2 * T, dividerHeight, 0.035, lining, 0, fill + dividerHeight / 2 - 0.02, 0, base);

  // Ribbon on the base, running under the lid's bands.
  const band = 0.34;
  for (const z of [D / 2 + 0.004, -D / 2 - 0.004]) solid(band, H, 0.008, satin, 0, H / 2, z, base);
  for (const x of [W / 2 + 0.004, -W / 2 - 0.004]) solid(0.008, H, band, satin, x, H / 2, 0, base);

  // Lid: a shallow cap that sits over the tray, with the ribbon cross and bow.
  const lid = new THREE.Group();
  box.add(lid);
  const LW = W + 0.1;
  const LD = D + 0.1;
  const LH = 0.34;
  solid(LW, T, LD, paper, 0, LH - T / 2, 0, lid);
  solid(LW, LH, T, paper, 0, LH / 2, LD / 2 - T / 2, lid);
  solid(LW, LH, T, paper, 0, LH / 2, -LD / 2 + T / 2, lid);
  solid(T, LH, LD, paper, LW / 2 - T / 2, LH / 2, 0, lid);
  solid(T, LH, LD, paper, -LW / 2 + T / 2, LH / 2, 0, lid);
  solid(band, 0.008, LD + 0.012, satin, 0, LH + 0.004, 0, lid);
  solid(LW + 0.012, 0.008, band, satin, 0, LH + 0.005, 0, lid);
  for (const z of [LD / 2 + 0.004, -LD / 2 - 0.004]) solid(band, LH, 0.008, satin, 0, LH / 2, z, lid);
  for (const x of [LW / 2 + 0.004, -LW / 2 - 0.004]) solid(0.008, LH, band, satin, x, LH / 2, 0, lid);

  const bow = new THREE.Group();
  bow.position.set(0, LH + 0.01, 0);
  bow.rotation.y = Math.PI / 4;
  lid.add(bow);
  const loopCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0.3, 0.34, 0), new THREE.Vector3(0.68, 0.32, 0),
    new THREE.Vector3(0.74, 0.08, 0), new THREE.Vector3(0.5, 0.02, 0), new THREE.Vector3(0, 0.04, 0),
  ], false, 'catmullrom', 0.6);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.28, 0.1, 0), new THREE.Vector3(0.62, 0.03, 0), new THREE.Vector3(0.92, 0.012, 0),
  ]);
  const geometries: THREE.BufferGeometry[] = [ribbonAlong(loopCurve, 0.3), ribbonAlong(tailCurve, 0.26)];
  for (const side of [1, -1]) {
    const loop = new THREE.Mesh(geometries[0], satin);
    loop.scale.x = side;
    loop.castShadow = true;
    bow.add(loop);
    const tail = new THREE.Mesh(geometries[1], satin);
    tail.scale.x = side;
    tail.rotation.y = side * 1.15;
    tail.castShadow = true;
    bow.add(tail);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), satin);
  knot.scale.set(1, 0.72, 1.35);
  knot.position.y = 0.07;
  knot.castShadow = true;
  bow.add(knot);

  // Soft contact shadow so the box sits on the page rather than floating.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.ShadowMaterial({ opacity: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  let target = 0;
  let eased = 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let frame = 0;
  let running = false;
  let dirty = true;
  let announced = false;
  let distance = 1;
  const look = new THREE.Vector3();

  const draw = () => {
    const p = eased;
    const open = smooth(0.24, 0.62, p);
    const inside = smooth(0.58, 1, p);
    box.rotation.y = mix(-0.62, 0.38, smooth(0, 1, p)) + easedX * 0.16;
    box.rotation.x = easedY * 0.05;
    lid.position.set(0, H - LH + 0.06 + open * 1.45 - inside * 1.25, -open * 1.0 - inside * 1.25);
    lid.rotation.x = -open * 0.5 - inside * 0.62;
    camera.position.set(0, mix(2.3, 6.6, inside) * distance, mix(6.6, 5.4, inside) * distance);
    look.set(0, mix(0.62, 0.45, inside) + open * 0.36 * (1 - inside), -open * 0.2 * (1 - inside) - inside * 0.45);
    camera.lookAt(look);
    renderer.render(scene, camera);
    if (!announced) { announced = true; onReady?.(); }
  };

  const tick = () => {
    if (!running) return;
    frame = requestAnimationFrame(tick);
    const dp = target - eased;
    const dx = pointerX - easedX;
    const dy = pointerY - easedY;
    if (!dirty && Math.abs(dp) < 0.0004 && Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
    eased += dp * 0.12;
    easedX += dx * 0.08;
    easedY += dy * 0.08;
    dirty = false;
    draw();
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    // Narrow stages pull the camera back so the box and its shadow never touch the edges.
    distance = Math.min(1.5, Math.max(1, 1.36 / (width / height)));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  resize();

  return {
    setProgress: value => { target = clamp01(value); },
    setPointer: (x, y) => { pointerX = x; pointerY = y; },
    resize,
    start: () => { if (!running) { running = true; dirty = true; frame = requestAnimationFrame(tick); } },
    stop: () => { running = false; cancelAnimationFrame(frame); },
    dispose: () => {
      running = false;
      cancelAnimationFrame(frame);
      scene.traverse(object => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
      for (const material of [paper, lining, satin, contents.material as THREE.Material, floor.material as THREE.Material]) material.dispose();
      texture.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
