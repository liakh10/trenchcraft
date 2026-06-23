import * as THREE from "three";

// Procedural pixel-art texture atlas. 4x4 grid of 16x16 tiles → 64x64 atlas.
// Tiles are drawn by index matching TILE indices in blocks.ts.

export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 4;
const TILE_PX = 16;

type RGB = [number, number, number];

function shade([r, g, b]: RGB, f: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

// Deterministic per-pixel noise so the atlas looks the same every build.
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

// Fill a tile with a base colour + speckled shading.
function fillNoise(
  ctx: CanvasRenderingContext2D,
  ox: number, oy: number,
  base: RGB, variance: number, seed: number,
) {
  for (let y = 0; y < TILE_PX; y++) {
    for (let x = 0; x < TILE_PX; x++) {
      const n = hash(x, y, seed);
      const f = 1 - variance / 2 + n * variance;
      ctx.fillStyle = shade(base, f);
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

function drawTile(ctx: CanvasRenderingContext2D, index: number, draw: (ox: number, oy: number) => void) {
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  draw(col * TILE_PX, row * TILE_PX);
}

export function buildAtlasTexture(): THREE.Texture {
  const size = TILE_PX * ATLAS_COLS;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  // GRASS_TOP (0)
  drawTile(ctx, 0, (ox, oy) => fillNoise(ctx, ox, oy, [86, 156, 58], 0.35, 11));
  // GRASS_SIDE (1) — dirt with a green lip on top
  drawTile(ctx, 1, (ox, oy) => {
    fillNoise(ctx, ox, oy, [122, 88, 54], 0.3, 12);
    for (let y = 0; y < 4; y++) for (let x = 0; x < TILE_PX; x++) {
      const n = hash(x, y, 13);
      ctx.fillStyle = shade([86, 156, 58], 0.8 + n * 0.4);
      ctx.fillRect(ox + x, oy + y, 1, 1 + (n > 0.7 ? 1 : 0));
    }
  });
  // DIRT (2)
  drawTile(ctx, 2, (ox, oy) => fillNoise(ctx, ox, oy, [122, 88, 54], 0.32, 14));
  // STONE (3)
  drawTile(ctx, 3, (ox, oy) => fillNoise(ctx, ox, oy, [128, 128, 134], 0.22, 15));
  // SAND (4)
  drawTile(ctx, 4, (ox, oy) => fillNoise(ctx, ox, oy, [222, 206, 140], 0.18, 16));
  // LOG_TOP (5) — concentric rings
  drawTile(ctx, 5, (ox, oy) => {
    fillNoise(ctx, ox, oy, [156, 120, 70], 0.2, 17);
    const cx = 7.5, cy = 7.5;
    for (let y = 0; y < TILE_PX; y++) for (let x = 0; x < TILE_PX; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (Math.floor(d) % 3 === 0) { ctx.fillStyle = shade([110, 82, 46], 1); ctx.fillRect(ox + x, oy + y, 1, 1); }
    }
  });
  // LOG_SIDE (6) — vertical bark
  drawTile(ctx, 6, (ox, oy) => {
    fillNoise(ctx, ox, oy, [110, 82, 46], 0.25, 18);
    for (let x = 0; x < TILE_PX; x += 3) for (let y = 0; y < TILE_PX; y++) {
      ctx.fillStyle = shade([88, 64, 36], 1); ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
  // LEAVES (7)
  drawTile(ctx, 7, (ox, oy) => fillNoise(ctx, ox, oy, [54, 122, 48], 0.5, 19));
  // PLANK (8)
  drawTile(ctx, 8, (ox, oy) => {
    fillNoise(ctx, ox, oy, [178, 140, 88], 0.18, 20);
    for (let y = 0; y < TILE_PX; y += 4) for (let x = 0; x < TILE_PX; x++) {
      ctx.fillStyle = shade([130, 98, 56], 1); ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
  // GOLD / Trench (9)
  drawTile(ctx, 9, (ox, oy) => {
    fillNoise(ctx, ox, oy, [240, 196, 64], 0.3, 21);
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(hash(i, 1, 22) * TILE_PX);
      const y = Math.floor(hash(i, 2, 22) * TILE_PX);
      ctx.fillStyle = shade([255, 240, 160], 1); ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  });
  // WATER (10)
  drawTile(ctx, 10, (ox, oy) => fillNoise(ctx, ox, oy, [48, 110, 200], 0.22, 23));
  // COBBLE (11)
  drawTile(ctx, 11, (ox, oy) => {
    fillNoise(ctx, ox, oy, [112, 112, 118], 0.3, 24);
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(hash(i, 3, 25) * (TILE_PX - 3));
      const y = Math.floor(hash(i, 4, 25) * (TILE_PX - 3));
      ctx.fillStyle = shade([80, 80, 86], 1); ctx.fillRect(ox + x, oy + y, 3, 3);
    }
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// UV rectangle (with a half-texel inset to avoid bleeding) for a tile index.
export function tileUV(index: number): { u0: number; v0: number; u1: number; v1: number } {
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  const eps = 0.5 / (TILE_PX * ATLAS_COLS);
  const u0 = col / ATLAS_COLS + eps;
  const u1 = (col + 1) / ATLAS_COLS - eps;
  // canvas row 0 is at the top; three's V is bottom-up.
  const v1 = 1 - row / ATLAS_ROWS - eps;
  const v0 = 1 - (row + 1) / ATLAS_ROWS + eps;
  return { u0, v0, u1, v1 };
}
