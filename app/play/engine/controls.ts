import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { World } from "./world";

const HALF_W = 0.3;     // player half-width
const HEIGHT = 1.8;     // player height
const EYE = 1.62;       // eye offset from feet
const SPEED = 5.2;      // walk speed (blocks/s)
const SPRINT = 8.5;
const GRAVITY = 26;
const JUMP = 8.4;

export class Controls {
  readonly plc: PointerLockControls;
  private world: World;
  private camera: THREE.PerspectiveCamera;
  private keys = new Set<string>();
  private feet = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private onGround = false;
  locked = false;

  constructor(camera: THREE.PerspectiveCamera, dom: HTMLElement, world: World, spawn: THREE.Vector3) {
    this.camera = camera;
    this.world = world;
    this.feet.copy(spawn);
    this.plc = new PointerLockControls(camera, dom);
    this.plc.addEventListener("lock", () => (this.locked = true));
    this.plc.addEventListener("unlock", () => (this.locked = false));

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.syncCamera();
  }

  lock() { this.plc.lock(); }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === "Space") e.preventDefault();
  };
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code);

  // ── Collision: does the player AABB at (fx,fy,fz feet) overlap a solid voxel? ──
  private collides(fx: number, fy: number, fz: number): boolean {
    const minX = Math.floor(fx - HALF_W), maxX = Math.floor(fx + HALF_W);
    const minY = Math.floor(fy), maxY = Math.floor(fy + HEIGHT);
    const minZ = Math.floor(fz - HALF_W), maxZ = Math.floor(fz + HALF_W);
    for (let y = minY; y <= maxY; y++)
      for (let z = minZ; z <= maxZ; z++)
        for (let x = minX; x <= maxX; x++)
          if (this.world.solidAt(x, y, z)) return true;
    return false;
  }

  update(dt: number) {
    if (!this.locked) { this.syncCamera(); return; }
    dt = Math.min(dt, 0.05); // clamp to avoid tunnelling on lag spikes

    // desired horizontal direction from camera yaw
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const wish = new THREE.Vector3();
    if (this.keys.has("KeyW")) wish.add(forward);
    if (this.keys.has("KeyS")) wish.sub(forward);
    if (this.keys.has("KeyD")) wish.add(right);
    if (this.keys.has("KeyA")) wish.sub(right);
    const speed = this.keys.has("ShiftLeft") ? SPRINT : SPEED;
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(speed);

    this.vel.x = wish.x;
    this.vel.z = wish.z;
    this.vel.y -= GRAVITY * dt;
    if (this.keys.has("Space") && this.onGround) { this.vel.y = JUMP; this.onGround = false; }

    // Axis-separated movement against the voxel grid
    const f = this.feet;
    const nx = f.x + this.vel.x * dt;
    if (!this.collides(nx, f.y, f.z)) f.x = nx; else this.vel.x = 0;

    const nz = f.z + this.vel.z * dt;
    if (!this.collides(f.x, f.y, nz)) f.z = nz; else this.vel.z = 0;

    const ny = f.y + this.vel.y * dt;
    if (!this.collides(f.x, ny, f.z)) {
      f.y = ny;
      this.onGround = false;
    } else {
      if (this.vel.y < 0) this.onGround = true;
      this.vel.y = 0;
    }

    // Respawn if somehow falling out of the world
    if (f.y < -5) { f.set(this.world.SX / 2, this.world.SY, this.world.SZ / 2); this.vel.set(0, 0, 0); }

    this.syncCamera();
  }

  private syncCamera() {
    this.camera.position.set(this.feet.x, this.feet.y + EYE, this.feet.z);
  }

  get position(): THREE.Vector3 { return this.feet; }

  // Player AABB occupies these voxel cells — used to forbid placing a block inside the player.
  occupies(x: number, y: number, z: number): boolean {
    const f = this.feet;
    return (
      x >= Math.floor(f.x - HALF_W) && x <= Math.floor(f.x + HALF_W) &&
      z >= Math.floor(f.z - HALF_W) && z <= Math.floor(f.z + HALF_W) &&
      y >= Math.floor(f.y) && y <= Math.floor(f.y + HEIGHT)
    );
  }

  dispose() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.plc.dispose();
  }
}
