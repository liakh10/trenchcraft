import * as THREE from "three";
import { World } from "./world";
import { buildOpaqueGeometry, buildWaterGeometry } from "./mesher";
import { buildAtlasTexture } from "./textures";
import { Controls } from "./controls";
import { MobManager } from "./mobs";
import { HOTBAR, AIR, isSolid } from "./blocks";

const REACH = 6; // how far the player can break/place

export interface GameHandle {
  lock: () => void;
  dispose: () => void;
  setHotbarIndex: (i: number) => void;
  onLockChange: (cb: (locked: boolean) => void) => void;
  onHotbarChange: (cb: (i: number) => void) => void;
}

export function createGame(container: HTMLElement): GameHandle {
  const world = new World(64, 40, 64, 9);
  world.generate(Math.floor(Math.random() * 100000));

  // ── Renderer ──
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  // ── Scene & sky ──
  const scene = new THREE.Scene();
  const sky = new THREE.Color(0x88bdf2);
  scene.background = sky;
  scene.fog = new THREE.Fog(sky.getHex(), 40, 110);

  const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

  // ── Lights ──
  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x6b5535, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
  sun.position.set(40, 80, 20);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));

  // ── Materials ──
  const atlas = buildAtlasTexture();
  const opaqueMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
  const waterMat = new THREE.MeshLambertMaterial({
    map: atlas, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false,
  });

  // ── Meshes ──
  let opaqueMesh = new THREE.Mesh(buildOpaqueGeometry(world), opaqueMat);
  let waterMesh = new THREE.Mesh(buildWaterGeometry(world), waterMat);
  scene.add(opaqueMesh, waterMesh);

  function rebuild() {
    const newOpaque = buildOpaqueGeometry(world);
    opaqueMesh.geometry.dispose();
    opaqueMesh.geometry = newOpaque;
    const newWater = buildWaterGeometry(world);
    waterMesh.geometry.dispose();
    waterMesh.geometry = newWater;
  }

  // ── Spawn: top of the centre column ──
  const cx = Math.floor(world.SX / 2), cz = Math.floor(world.SZ / 2);
  let groundY = world.SY - 1;
  for (let y = world.SY - 1; y >= 0; y--) { if (isSolid(world.get(cx, y, cz))) { groundY = y + 1; break; } }
  const controls = new Controls(camera, renderer.domElement, world, new THREE.Vector3(cx + 0.5, groundY, cz + 0.5));

  // ── Block highlight ──
  const highlight = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001)),
    new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }),
  );
  highlight.visible = false;
  scene.add(highlight);

  // ── Trencher mobs ──
  const mobs = new MobManager(scene, world, 18);

  // ── Targeting via centre-screen raycast ──
  const raycaster = new THREE.Raycaster();
  raycaster.far = REACH;
  const centre = new THREE.Vector2(0, 0);

  function getTarget(): { remove: THREE.Vector3; place: THREE.Vector3 } | null {
    raycaster.setFromCamera(centre, camera);
    const hits = raycaster.intersectObject(opaqueMesh, false);
    if (hits.length === 0) return null;
    const hit = hits[0];
    if (!hit.face) return null;
    const n = hit.face.normal;
    const p = hit.point;
    const remove = new THREE.Vector3(
      Math.floor(p.x - n.x * 0.5), Math.floor(p.y - n.y * 0.5), Math.floor(p.z - n.z * 0.5),
    );
    const place = new THREE.Vector3(
      Math.floor(p.x + n.x * 0.5), Math.floor(p.y + n.y * 0.5), Math.floor(p.z + n.z * 0.5),
    );
    return { remove, place };
  }

  // ── Hotbar ──
  let hotbarIndex = 0;
  let hotbarCb: (i: number) => void = () => {};
  function setHotbarIndex(i: number) {
    hotbarIndex = ((i % HOTBAR.length) + HOTBAR.length) % HOTBAR.length;
    hotbarCb(hotbarIndex);
  }

  // ── Input: break / place ──
  function onMouseDown(e: MouseEvent) {
    if (!controls.locked) return;
    const t = getTarget();
    if (!t) return;
    if (e.button === 0) {
      // break — keep the bedrock floor intact
      if (t.remove.y > 0) { world.set(t.remove.x, t.remove.y, t.remove.z, AIR); rebuild(); }
    } else if (e.button === 2) {
      // place — not inside the player, only into empty space
      const { x, y, z } = t.place;
      if (world.get(x, y, z) === AIR && !controls.occupies(x, y, z)) {
        world.set(x, y, z, HOTBAR[hotbarIndex]); rebuild();
      }
    }
  }
  function onContext(e: Event) { e.preventDefault(); }
  function onWheel(e: WheelEvent) {
    if (!controls.locked) return;
    setHotbarIndex(hotbarIndex + (e.deltaY > 0 ? 1 : -1));
  }
  function onKey(e: KeyboardEvent) {
    if (e.code.startsWith("Digit")) {
      const d = parseInt(e.code.slice(5), 10);
      if (d >= 1 && d <= HOTBAR.length) setHotbarIndex(d - 1);
    }
  }

  renderer.domElement.addEventListener("mousedown", onMouseDown);
  renderer.domElement.addEventListener("contextmenu", onContext);
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("keydown", onKey);

  // ── Lock change wiring ──
  let lockCb: (locked: boolean) => void = () => {};
  controls.plc.addEventListener("lock", () => lockCb(true));
  controls.plc.addEventListener("unlock", () => lockCb(false));

  // ── Resize ──
  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  // ── Render loop ──
  let raf = 0;
  let last = performance.now();
  const waterBase = atlas; // (kept for clarity)
  void waterBase;
  function loop() {
    const now = performance.now();
    const dt = (now - last) / 1000;
    last = now;

    controls.update(dt);
    mobs.update(dt);

    const t = getTarget();
    if (t && controls.locked) {
      highlight.visible = true;
      highlight.position.set(t.remove.x + 0.5, t.remove.y + 0.5, t.remove.z + 0.5);
    } else {
      highlight.visible = false;
    }

    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return {
    lock: () => controls.lock(),
    setHotbarIndex,
    onLockChange: (cb) => { lockCb = cb; },
    onHotbarChange: (cb) => { hotbarCb = cb; },
    dispose: () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      renderer.domElement.removeEventListener("contextmenu", onContext);
      controls.dispose();
      mobs.dispose();
      opaqueMesh.geometry.dispose();
      waterMesh.geometry.dispose();
      opaqueMat.dispose();
      waterMat.dispose();
      atlas.dispose();
      renderer.dispose();
      if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
    },
  };
}
