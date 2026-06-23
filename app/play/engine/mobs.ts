import * as THREE from "three";
import { World } from "./world";

// Trenchers — nicknames lifted from the screenshots.
export const TRENCHER_NAMES: string[] = [
  "gasp 😮", "Cupsey ☠️", "chingchongslayer 🐲", "Limfork 🌐", "Grimace 🟣",
  "Red 🔴", "Unprofitable 📉", "vein 🗡️", "Samrep 🛡️", "ceo 🏯",
  "tdmilky 🥛", "Publix 🛒", "Donuttcrypto 🍩", "Cented 🎯",
  "decu 🦊", "Noir 🌑", "lspfi 🔮", "clukz 🎲", "Radiance ☀️",
  "Ramset ⚔️", "Qavec 🪃", "Silver 🥈", "Trenchman 🪖", "blu6k 🔵",
  "Fozzy 🐻", "milito ⚡", "Sting 🍌", "Solstice 🌓", "yode 🧘",
  "^1s1mple 🏆", "Teddy 🧸", "Coasty 🏖️", "Zemrics 🌊",
];

// Trench-flavoured outfit palette.
const SHIRTS = [0x5b6b3a, 0x4a5d23, 0x6b5b3a, 0x3a4a5b, 0x7a3a3a, 0x444a52, 0x8a6d3a, 0x355e3b];
const PANTS = [0x33352b, 0x2b2f33, 0x3b3327, 0x222428];
const SKINS = [0xe0ac69, 0xc68642, 0xf1c27d, 0x8d5524, 0xffdbac];

interface Mob {
  group: THREE.Group;
  hipL: THREE.Object3D; hipR: THREE.Object3D;
  shoL: THREE.Object3D; shoR: THREE.Object3D;
  x: number; z: number; feetY: number;
  heading: number; turnTimer: number;
  phase: number; speed: number;
  nameTex: THREE.Texture;
}

function makeNameSprite(name: string): { sprite: THREE.Sprite; tex: THREE.Texture } {
  const pad = 12;
  const fontPx = 34;
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `${fontPx}px sans-serif`;
  const tw = Math.ceil(measure.measureText(name).width);

  const canvas = document.createElement("canvas");
  canvas.width = tw + pad * 2;
  canvas.height = fontPx + pad * 2;
  const ctx = canvas.getContext("2d")!;

  // rounded dark background
  ctx.fillStyle = "rgba(8,10,16,0.66)";
  const r = 10;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(canvas.width, 0, canvas.width, canvas.height, r);
  ctx.arcTo(canvas.width, canvas.height, 0, canvas.height, r);
  ctx.arcTo(0, canvas.height, 0, 0, r);
  ctx.arcTo(0, 0, canvas.width, 0, r);
  ctx.closePath();
  ctx.fill();

  ctx.font = `${fontPx}px sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(mat);
  const h = 0.42;
  sprite.scale.set(h * (canvas.width / canvas.height), h, 1);
  sprite.position.y = 2.15;
  return { sprite, tex };
}

function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
}

function buildBody(name: string): { group: THREE.Group } & Pick<Mob, "hipL" | "hipR" | "shoL" | "shoR" | "nameTex"> {
  const group = new THREE.Group();
  const shirt = SHIRTS[Math.floor(Math.random() * SHIRTS.length)];
  const pants = PANTS[Math.floor(Math.random() * PANTS.length)];
  const skin = SKINS[Math.floor(Math.random() * SKINS.length)];

  // legs (pivoted at hips y=0.7)
  const hipL = new THREE.Object3D(); hipL.position.set(-0.12, 0.7, 0);
  const hipR = new THREE.Object3D(); hipR.position.set(0.12, 0.7, 0);
  const legL = box(0.2, 0.7, 0.22, pants); legL.position.y = -0.35;
  const legR = box(0.2, 0.7, 0.22, pants); legR.position.y = -0.35;
  hipL.add(legL); hipR.add(legR);

  // torso
  const torso = box(0.5, 0.6, 0.26, shirt); torso.position.y = 1.0;

  // arms (pivoted at shoulders y=1.25)
  const shoL = new THREE.Object3D(); shoL.position.set(-0.33, 1.25, 0);
  const shoR = new THREE.Object3D(); shoR.position.set(0.33, 1.25, 0);
  const armL = box(0.16, 0.55, 0.2, shirt); armL.position.y = -0.27;
  const armR = box(0.16, 0.55, 0.2, shirt); armR.position.y = -0.27;
  shoL.add(armL); shoR.add(armR);

  // head + helmet
  const head = box(0.46, 0.46, 0.46, skin); head.position.y = 1.55;
  const helmet = box(0.52, 0.18, 0.52, 0x3d4a2e); helmet.position.y = 1.74;

  group.add(hipL, hipR, torso, shoL, shoR, head, helmet);

  const { sprite, tex } = makeNameSprite(name);
  group.add(sprite);

  return { group, hipL, hipR, shoL, shoR, nameTex: tex };
}

export class MobManager {
  private mobs: Mob[] = [];
  private parent: THREE.Object3D;
  private world: World;

  constructor(parent: THREE.Object3D, world: World, count: number) {
    this.parent = parent;
    this.world = world;
    const names = shuffle(TRENCHER_NAMES.slice());
    for (let i = 0; i < count; i++) {
      const name = names[i % names.length];
      this.spawn(name);
    }
  }

  private spawn(name: string) {
    const w = this.world;
    let x = 0, z = 0, sh = 1, tries = 0;
    do {
      x = 3 + Math.random() * (w.SX - 6);
      z = 3 + Math.random() * (w.SZ - 6);
      sh = w.surfaceHeight(Math.floor(x), Math.floor(z));
      tries++;
    } while (sh <= w.waterLevel + 1 && tries < 30);

    const parts = buildBody(name);
    const mob: Mob = {
      ...parts,
      x, z, feetY: sh,
      heading: Math.random() * Math.PI * 2,
      turnTimer: 1 + Math.random() * 3,
      phase: Math.random() * Math.PI * 2,
      speed: 1.4 + Math.random() * 1.0,
    };
    mob.group.position.set(x, sh, z);
    this.parent.add(mob.group);
    this.mobs.push(mob);
  }

  update(dt: number) {
    const w = this.world;
    for (const m of this.mobs) {
      m.turnTimer -= dt;
      if (m.turnTimer <= 0) {
        m.heading += (Math.random() - 0.5) * 1.6;
        m.turnTimer = 1.5 + Math.random() * 3;
      }

      const dirX = Math.cos(m.heading);
      const dirZ = Math.sin(m.heading);
      const step = m.speed * dt;
      const nx = m.x + dirX * step;
      const nz = m.z + dirZ * step;

      let moved = false;
      if (nx > 2 && nx < w.SX - 2 && nz > 2 && nz < w.SZ - 2) {
        const sh = w.surfaceHeight(Math.floor(nx), Math.floor(nz));
        const rise = sh - m.feetY;
        if (sh > w.waterLevel && rise < 1.5 && rise > -3.5) {
          m.x = nx; m.z = nz;
          m.feetY += (sh - m.feetY) * Math.min(1, dt * 8);
          moved = true;
        }
      }
      if (!moved) { m.heading += 1.6 + Math.random(); m.turnTimer = 1 + Math.random() * 2; }

      // walk animation
      const swing = moved ? Math.sin(m.phase) * 0.7 : 0;
      if (moved) m.phase += step * 6;
      m.hipL.rotation.x = swing;
      m.hipR.rotation.x = -swing;
      m.shoL.rotation.x = -swing * 0.8;
      m.shoR.rotation.x = swing * 0.8;

      m.group.position.set(m.x, m.feetY, m.z);
      m.group.rotation.y = Math.atan2(dirX, dirZ);
    }
  }

  dispose() {
    for (const m of this.mobs) {
      this.parent.remove(m.group);
      m.group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else if (mat) mat.dispose();
      });
      m.nameTex.dispose();
    }
    this.mobs = [];
  }
}

function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
