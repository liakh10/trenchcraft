import * as THREE from "three";
import { World } from "./world";
import { buildOpaqueGeometry, buildWaterGeometry } from "./mesher";
import { buildAtlasTexture } from "./textures";
import { MobManager } from "./mobs";

// Lightweight auto-orbiting voxel scene used as the landing-page background.
export function createPreview(container: HTMLElement): () => void {
  const world = new World(40, 32, 40, 8);
  world.generate(Math.floor(Math.random() * 100000));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b1020, 30, 75);

  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);

  scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x4a3a25, 1.0));
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
  sun.position.set(30, 60, 20);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const atlas = buildAtlasTexture();
  const opaqueMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true });
  const waterMat = new THREE.MeshLambertMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });

  const opaque = new THREE.Mesh(buildOpaqueGeometry(world), opaqueMat);
  const water = new THREE.Mesh(buildWaterGeometry(world), waterMat);
  const group = new THREE.Group();
  group.add(opaque, water);
  group.position.set(-world.SX / 2, -16, -world.SZ / 2);
  scene.add(group);

  // Trenchers wandering across the landing world (added to the same group so transforms match)
  const mobs = new MobManager(group, world, 10);

  function onResize() {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  let raf = 0;
  let angle = 0;
  let last = performance.now();
  function loop() {
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    mobs.update(dt);
    angle += 0.0016;
    const r = 46;
    camera.position.set(Math.cos(angle) * r, 26, Math.sin(angle) * r);
    camera.lookAt(0, -2, 0);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", onResize);
    mobs.dispose();
    opaque.geometry.dispose();
    water.geometry.dispose();
    opaqueMat.dispose();
    waterMat.dispose();
    atlas.dispose();
    renderer.dispose();
    if (renderer.domElement.parentElement === container) container.removeChild(renderer.domElement);
  };
}
