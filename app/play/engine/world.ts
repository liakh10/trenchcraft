import { AIR, BLOCK, isSolid as defIsSolid } from "./blocks";

// Finite voxel world stored in a flat Uint8Array.
// Index order: idx = (y * SZ + z) * SX + x

export class World {
  readonly SX: number;
  readonly SY: number;
  readonly SZ: number;
  readonly waterLevel: number;
  private data: Uint8Array;

  constructor(SX = 64, SY = 40, SZ = 64, waterLevel = 9) {
    this.SX = SX;
    this.SY = SY;
    this.SZ = SZ;
    this.waterLevel = waterLevel;
    this.data = new Uint8Array(SX * SY * SZ);
  }

  private idx(x: number, y: number, z: number): number {
    return (y * this.SZ + z) * this.SX + x;
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.SX && y >= 0 && y < this.SY && z >= 0 && z < this.SZ;
  }

  get(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return AIR;
    return this.data[this.idx(x, y, z)];
  }

  set(x: number, y: number, z: number, id: number): void {
    if (!this.inBounds(x, y, z)) return;
    this.data[this.idx(x, y, z)] = id;
  }

  solidAt(x: number, y: number, z: number): boolean {
    return defIsSolid(this.get(x, y, z));
  }

  // ── Procedural generation ──
  generate(seed = 1337): void {
    const h = this.heightField(seed);

    for (let z = 0; z < this.SZ; z++) {
      for (let x = 0; x < this.SX; x++) {
        const height = h[z * this.SX + x];
        for (let y = 0; y < this.SY; y++) {
          let id = AIR;
          if (y < height - 3) id = BLOCK.STONE;
          else if (y < height - 1) id = BLOCK.DIRT;
          else if (y < height) {
            // surface block: sand near/under water, otherwise grass
            id = height - 1 <= this.waterLevel ? BLOCK.SAND : BLOCK.GRASS;
          } else if (y <= this.waterLevel) {
            id = BLOCK.WATER;
          }
          if (id !== AIR) this.set(x, y, z, id);
        }
      }
    }

    // bedrock floor
    for (let z = 0; z < this.SZ; z++)
      for (let x = 0; x < this.SX; x++) this.set(x, 0, z, BLOCK.STONE);

    this.scatterTrees(h, seed);
    this.scatterGold(seed);
  }

  private heightField(seed: number): Int16Array {
    const out = new Int16Array(this.SX * this.SZ);
    const base = 12;
    for (let z = 0; z < this.SZ; z++) {
      for (let x = 0; x < this.SX; x++) {
        let n = 0;
        n += valueNoise(x * 0.06, z * 0.06, seed) * 1.0;
        n += valueNoise(x * 0.13, z * 0.13, seed + 7) * 0.5;
        n += valueNoise(x * 0.27, z * 0.27, seed + 19) * 0.25;
        n /= 1.75; // 0..1
        const height = Math.round(base + n * 14);
        out[z * this.SX + x] = Math.max(2, Math.min(this.SY - 6, height));
      }
    }
    return out;
  }

  private scatterTrees(h: Int16Array, seed: number): void {
    for (let z = 2; z < this.SZ - 2; z++) {
      for (let x = 2; x < this.SX - 2; x++) {
        const height = h[z * this.SX + x];
        if (height - 1 <= this.waterLevel) continue; // no trees on beach/water
        if (this.get(x, height - 1, z) !== BLOCK.GRASS) continue;
        const r = hash2(x, z, seed + 99);
        if (r > 0.02) continue; // ~2% of grass columns
        this.placeTree(x, height, z);
      }
    }
  }

  private placeTree(x: number, groundY: number, z: number): void {
    const trunk = 4 + Math.floor(hash2(x, z, 5) * 3); // 4..6
    for (let i = 0; i < trunk; i++) this.set(x, groundY + i, z, BLOCK.LOG);
    const topY = groundY + trunk;
    for (let dy = -2; dy <= 1; dy++) {
      const r = dy <= 0 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (dx === 0 && dz === 0 && dy < 0) continue; // keep trunk visible
          if (Math.abs(dx) === r && Math.abs(dz) === r && hash2(x + dx, z + dz, 3) > 0.5) continue;
          const yy = topY + dy;
          if (this.get(x + dx, yy, z + dz) === AIR) this.set(x + dx, yy, z + dz, BLOCK.LEAVES);
        }
      }
    }
  }

  // Buried veins of "Trench Gold" in the stone layer.
  private scatterGold(seed: number): void {
    for (let z = 0; z < this.SZ; z++) {
      for (let x = 0; x < this.SX; x++) {
        for (let y = 2; y < this.waterLevel; y++) {
          if (this.get(x, y, z) !== BLOCK.STONE) continue;
          if (hash3(x, y, z, seed + 314) < 0.012) this.set(x, y, z, BLOCK.GOLD);
        }
      }
    }
  }
}

// ── Noise helpers ──
function hash2(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function hash3(x: number, y: number, z: number, seed: number): number {
  return hash2(x * 31 + z, y * 17 + z * 13, seed);
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

// 2D value noise with bilinear smoothing, output 0..1
function valueNoise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const v00 = hash2(xi, yi, seed);
  const v10 = hash2(xi + 1, yi, seed);
  const v01 = hash2(xi, yi + 1, seed);
  const v11 = hash2(xi + 1, yi + 1, seed);
  const u = smooth(xf);
  const v = smooth(yf);
  const a = v00 * (1 - u) + v10 * u;
  const b = v01 * (1 - u) + v11 * u;
  return a * (1 - v) + b * v;
}
